'use client';
import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useStore } from '@/lib/store';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Copy, Link2 } from 'lucide-react';

type Cycle = 'monthly' | 'annual';

const PLANS = [
  { id:'free', name:'Free', monthly:0, annual:0, period:'forever',
    features:['5 Free Courses (Anatomy, Physiology, Biology, Chemistry, Algebra)','10 quiz questions/session','15 flashcards/session','3 AI concept lessons/day','Community access'],
  },
  { id:'pro', name:'Pro', monthly:50, annual:500, popular:true,
    features:['All 29 courses unlocked','150 questions monthly · 250 annually','100 flashcards monthly · 150 annually','Interactive NIH 3D model access','Live lessons & study material upload','Progress tracking, analytics & MCAT mode','Priority support'],
  },
];

function BillingContent() {
  const { user, updateUser } = useStore();
  const searchParams = useSearchParams();
  const [cycle, setCycle] = useState<Cycle>('monthly');
  const [loading, setLoading] = useState<string|null>(null);
  const [codeInput, setCodeInput] = useState('');
  const [discount, setDiscount] = useState<{ code: string; percentOff: number; amount: number; planType: string } | null>(null);
  const [validatingCode, setValidatingCode] = useState(false);
  const [referral, setReferral] = useState<{ code: string; percentOff: number; expiresAt: string; usesRemaining: number; rewardDays: number } | null>(null);
  const [referralLink, setReferralLink] = useState('');
  const referralFromLink = (searchParams.get('referral') || '').trim().toUpperCase();
  const selectedPlanType = cycle === 'annual' ? 'pro_annual' : 'pro_monthly';

  useEffect(() => {
    // Handle return from Paystack
    const ref = searchParams.get('reference') || searchParams.get('trxref');
    if (ref && searchParams.get('ps_success')) {
      verifyPaystack(ref);
    }
    if (searchParams.get('cancelled')) {
      toast.error('Payment cancelled.');
    }
  }, []);

  useEffect(() => {
    api.get('/billing/referral').then(({ data }) => setReferral(data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!referralFromLink) return;
    localStorage.setItem('medprep_pending_referral', referralFromLink);
  }, [referralFromLink]);

  useEffect(() => {
    const code = referralFromLink || localStorage.getItem('medprep_pending_referral') || '';
    if (!code) return;
    let active = true;
    setCodeInput(code);
    setValidatingCode(true);
    api.post('/billing/codes/validate', { code, planType: selectedPlanType })
      .then(({ data }) => {
        if (!active) return;
        setDiscount({ ...data, planType: selectedPlanType });
        setCodeInput(data.code);
        if (localStorage.getItem('medprep_pending_referral') === data.code) localStorage.removeItem('medprep_pending_referral');
      })
      .catch(error => {
        if (!active) return;
        setDiscount(null);
        toast.error(error.response?.data?.error || 'Could not validate this referral link');
      })
      .finally(() => { if (active) setValidatingCode(false); });
    return () => { active = false; };
  }, [referralFromLink, selectedPlanType]);

  useEffect(() => {
    if (!referral) return;
    const url = new URL('/billing', window.location.origin);
    url.searchParams.set('referral', referral.code);
    setReferralLink(url.toString());
  }, [referral]);

  const applyDiscount = async () => {
    if (!codeInput.trim()) return;
    setValidatingCode(true);
    try {
      const { data } = await api.post('/billing/codes/validate', { code: codeInput, planType: selectedPlanType });
      setDiscount({ ...data, planType: selectedPlanType });
      setCodeInput(data.code);
      toast.success(`${data.percentOff}% discount applied`);
    } catch (error: any) {
      setDiscount(null);
      toast.error(error.response?.data?.error || 'Could not validate this code');
    } finally {
      setValidatingCode(false);
    }
  };

  const copyReferral = async () => {
    if (!referral) return;
    try {
      await navigator.clipboard.writeText(referral.code);
      toast.success('Referral code copied');
    } catch {
      toast.error(`Referral code: ${referral.code}`);
    }
  };

  const copyReferralLink = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      toast.success('Referral link copied');
    } catch {
      toast.error('Could not copy referral link');
    }
  };

  const verifyPaystack = async (ref: string) => {
    try {
      const { data } = await api.post('/billing/paystack/verify', { reference: ref });
      updateUser({ plan: data.plan });
      localStorage.setItem('medprep_user', JSON.stringify(data.user));
      toast.success('Payment verified! Pro unlocked 🎉');
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Verification failed');
    }
  };

  const handleUpgrade = async (planId: string) => {
    if (planId === 'free') return;
    const planType = cycle === 'annual' ? 'pro_annual' : 'pro_monthly';
    setLoading(planId);
    try {
      const { data } = await api.post('/billing/paystack/initialize', { planType, code: discount?.planType === planType ? discount.code : '' });
      window.location.href = data.url;
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Could not start checkout');
    }
    setLoading(null);
  };

  const isPro = ['pro','annual'].includes(user?.plan||'');

  return (
    <DashboardLayout title="Plans & Billing" sub="Unlock full access to all courses and AI tools">
      {/* Current plan */}
      <div className="rounded-2xl p-5 mb-8 flex items-center justify-between" style={{ background:'rgba(79,142,247,0.07)', border:'1px solid rgba(79,142,247,0.25)' }}>
        <div>
          <div className="text-[11px] text-text3 uppercase tracking-wide mb-1">Current Plan</div>
          <div className="text-[16px] font-semibold text-text">{user?.plan === 'annual' ? 'Pro Annual' : user?.plan === 'pro' ? 'Pro Monthly' : 'Free'}</div>
          <div className="text-[12px] text-text3 mt-0.5">{isPro ? 'All courses & tools unlocked' : '5 courses · Limited usage'}</div>
        </div>
        <span className="text-[11px] font-semibold px-3 py-1 rounded-full" style={ isPro ? { background:'rgba(62,207,142,.15)', color:'var(--green)', border:'1px solid rgba(62,207,142,.3)' } : { background:'rgba(245,166,35,.15)', color:'var(--amber)', border:'1px solid rgba(245,166,35,.3)' }}>
          {isPro ? 'Active' : 'Limited'}
        </span>
      </div>

      {/* Billing cycle */}
      <div className="flex flex-wrap gap-6 mb-8">
        <div>
          <p className="text-[12px] text-text3 mb-2">Billing cycle</p>
          <div className="flex gap-2">
            <Button size="sm" variant={cycle==='monthly'?'primary':'ghost'} onClick={()=>{setCycle('monthly');setDiscount(null);}}>Monthly</Button>
            <Button size="sm" variant={cycle==='annual'?'primary':'ghost'} onClick={()=>{setCycle('annual');setDiscount(null);}}>Annual</Button>
            {cycle==='annual' && <span className="self-center text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{background:'rgba(62,207,142,.15)',color:'var(--green)',border:'1px solid rgba(62,207,142,.3)'}}>Save 17%</span>}
          </div>
        </div>
        <div className="self-end max-w-[300px] pb-1 text-[12px] text-text2">Paystack · Ghana cedis · Card or mobile money. PIN approval happens through Paystack and your mobile network.</div>
      </div>

      <div className="mb-6 max-w-2xl">
        <label htmlFor="discount-code" className="mb-2 block text-[12px] font-medium text-text2">Discount or referral code</label>
        <div className="flex flex-wrap gap-2">
          <input id="discount-code" value={codeInput} onChange={event => { setCodeInput(event.target.value.toUpperCase()); setDiscount(null); }} maxLength={32} autoCapitalize="characters" placeholder="Enter code" className="min-w-0 flex-1 rounded-lg border border-border2 bg-surface px-3 py-2.5 text-[13px] uppercase text-text placeholder:normal-case placeholder:text-text3" />
          <Button variant="ghost" onClick={applyDiscount} disabled={!codeInput.trim() || validatingCode}>{validatingCode ? 'Checking…' : 'Apply code'}</Button>
        </div>
        {discount?.planType === selectedPlanType && <p className="mt-2 text-[12px] text-green">{discount.percentOff}% off · checkout total GH₵{(discount.amount / 100).toFixed(2)}</p>}
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8 max-w-2xl">
        {PLANS.map(p => {
          const price = cycle === 'annual' && p.id !== 'free' ? p.annual : p.monthly;
          const perMonth = cycle === 'annual' && p.id !== 'free' ? (p.annual/12).toFixed(2) : p.monthly;
          const isCurrent = (p.id === 'free' && !isPro) || (p.id === 'pro' && isPro);
          return (
            <div key={p.id} className={`bg-surface rounded-2xl p-6 relative ${p.popular ? 'border border-accent' : 'border border-border'}`}>
              {p.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-white text-[11px] font-bold px-4 py-1 rounded-full whitespace-nowrap">Most Popular</div>}
              <div className="mb-4">
                <div className="text-[15px] font-semibold text-text mb-2">{p.name}</div>
                <div className="flex flex-wrap items-baseline gap-x-1 gap-y-0.5">
                  <span className="font-dm-serif text-[36px] text-text">{p.id==='free' ? 'GH₵0' : discount?.planType === selectedPlanType ? `GH₵${(discount.amount / 100).toFixed(2)}` : `GH₵${price}`}</span>
                  {p.id !== 'free' && discount?.planType === selectedPlanType && <span className="text-[12px] text-text3 line-through">GH₵{price}</span>}
                  <span className="text-[13px] text-text3">{p.id==='free' ? 'forever' : cycle==='annual' ? '/yr' : '/mo'}</span>
                </div>
                {cycle==='annual' && p.id!=='free' && <div className="text-[12px] text-green mt-1">≈ GH₵{perMonth}/month</div>}
              </div>
              <ul className="space-y-2 mb-5">
                {p.features.map(f => (
                  <li key={f} className="flex gap-2 items-start text-[13px] py-1.5 border-b border-border last:border-0">
                    <span className="text-green flex-shrink-0 mt-0.5">✓</span>
                    <span className="text-text2">{f}</span>
                  </li>
                ))}
              </ul>
              {isCurrent
                ? <Button full disabled>Current Plan</Button>
                : p.id === 'free'
                    ? <Button full variant="ghost" onClick={() => toast('Contact support before your next renewal to switch to Free.')}>Request Free plan</Button>
                  : <Button full variant="primary" onClick={() => handleUpgrade(p.id)} disabled={loading===p.id}>
                      {loading===p.id ? 'Redirecting…' : 'Upgrade with Paystack'}
                    </Button>}
            </div>
          );
        })}
      </div>

      {referral && <section className="mb-6 max-w-2xl border-y border-border py-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-dm-serif text-[18px] text-text">Refer a study partner</h3>
            <p className="mt-1 max-w-xl text-[12px] leading-relaxed text-text3">They get {referral.percentOff}% off their first Pro plan. You earn {referral.rewardDays} Pro days after their payment is verified. {referral.usesRemaining} uses remaining.</p>
          </div>
          <div className="flex items-center gap-2">
            <code className="rounded-md border border-border bg-surface2 px-3 py-2 text-[12px] font-semibold text-text">{referral.code}</code>
            <button type="button" onClick={copyReferral} aria-label="Copy referral code" title="Copy referral code" className="rounded-md border border-border2 bg-surface p-2 text-text2 hover:border-accent hover:text-accent"><Copy size={15} aria-hidden="true" /></button>
          </div>
        </div>
        <div className="mt-4 flex min-w-0 gap-2">
          <input aria-label="Referral link" readOnly value={referralLink} placeholder="Preparing referral link…" className="min-w-0 flex-1 rounded-md border border-border2 bg-surface2 px-3 py-2 text-[11px] text-text2" />
          <button type="button" onClick={copyReferralLink} disabled={!referralLink} aria-label="Copy referral link" title="Copy referral link" className="shrink-0 rounded-md border border-border2 bg-surface p-2 text-text2 hover:border-accent hover:text-accent disabled:opacity-50"><Link2 size={16} aria-hidden="true" /></button>
        </div>
      </section>}

      {/* What Pro unlocks */}
      <Card className="mb-6">
        <h3 className="font-dm-serif text-[20px] text-text mb-4">What Pro unlocks</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            ['🎓','25 Extra Courses','All medical & premed courses'],
            ['🧠','150 Questions/session','Up to 250 on Annual'],
            ['⚡','100 Flashcards/session','Full decks any topic'],
            ['📖','Unlimited Lessons','Stream AI lessons anytime'],
            ['📂','Upload Your Notes','Use your own PDFs & slides'],
            ['📊','Progress Analytics','Scores, streaks, history'],
          ].map(([i,t,d]) => (
            <div key={t} className="bg-surface2 border border-border rounded-xl p-3.5">
              <div className="text-[20px] mb-1.5">{i}</div>
              <div className="text-[13px] font-medium text-text">{t}</div>
              <div className="text-[11px] text-text3 mt-0.5">{d}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* FAQ */}
      <Card>
        <h3 className="font-dm-serif text-[20px] text-text mb-4">FAQ</h3>
        {[
          ['Does Pro renew automatically?','No. Pro access lasts for the period shown at checkout and expires at the end of that paid term.'],
          ['Is Paystack available in Ghana?','Yes — Paystack supports GHS, mobile money (MTN, Vodafone, AirtelTigo), and bank cards.'],
          ['How do I approve a mobile-money payment?','Paystack opens a secure checkout. Enter your mobile-money number there, then approve the request using your network’s prompt or instructions. MedPrep never asks for your MoMo PIN.'],
          ['What currency do you charge?','All plan prices are shown and charged in Ghana cedis (GHS) through Paystack.'],
          ['Will I lose my data if I downgrade?','No — all your progress and history is preserved.'],
          ['How can I get a discount?','Apply a valid discount code at checkout, or ask a MedPrep student for their referral code.'],
        ].map(([q,a]) => (
          <div key={q} className="border-b border-border py-3.5 last:border-0">
            <div className="font-medium text-text text-[14px] mb-1">{q}</div>
            <div className="text-text2 text-[13px]">{a}</div>
          </div>
        ))}
      </Card>
    </DashboardLayout>
  );
}

export default function BillingPage() {
  return <Suspense fallback={<div className="min-h-screen bg-bg" />}><BillingContent /></Suspense>;
}
