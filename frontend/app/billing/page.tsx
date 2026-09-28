'use client';
import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useStore } from '@/lib/store';
import api from '@/lib/api';
import toast from 'react-hot-toast';

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
      const { data } = await api.post('/billing/paystack/initialize', { planType });
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
            <Button size="sm" variant={cycle==='monthly'?'primary':'ghost'} onClick={()=>setCycle('monthly')}>Monthly</Button>
            <Button size="sm" variant={cycle==='annual'?'primary':'ghost'} onClick={()=>setCycle('annual')}>Annual</Button>
            {cycle==='annual' && <span className="self-center text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{background:'rgba(62,207,142,.15)',color:'var(--green)',border:'1px solid rgba(62,207,142,.3)'}}>Save 17%</span>}
          </div>
        </div>
        <div className="self-end pb-1 text-[12px] text-text2">Paystack · Ghana cedis · Card or mobile money</div>
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
                <div className="flex items-baseline gap-1">
                  <span className="font-dm-serif text-[36px] text-text">{p.id==='free' ? 'GH₵0' : `GH₵${price}`}</span>
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
          ['What currency do you charge?','All plan prices are shown and charged in Ghana cedis (GHS) through Paystack.'],
          ['Will I lose my data if I downgrade?','No — all your progress and history is preserved.'],
          ['Is there a student discount?','Email us with your .edu or university ID for 20% off.'],
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
