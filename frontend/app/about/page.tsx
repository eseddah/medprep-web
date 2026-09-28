'use client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Link from 'next/link';

const FEATURES = [
  { icon:'🧠', title:'AI Quiz Generator', desc:'Generate 10–150 clinically accurate questions from your own notes or any of our 14 courses. Adjust difficulty, question type, and count per session.' },
  { icon:'⚡', title:'Smart Flashcards', desc:'Create high-yield flashcard decks with "Got it / Still learning" tracking, shuffle mode, and progress bars.' },
  { icon:'📖', title:'Live Lessons', desc:'Stream structured AI lessons in real-time on any topic — with clinical pearls, mnemonics, and exam tips.' },
  { icon:'🎓', title:'14 Full Courses', desc:'8 medical courses (Anatomy to Neuroscience) and 6 premed courses (Bio, Chem, Org Chem, Physics, Psych, Stats).' },
  { icon:'📂', title:'Upload Your Material', desc:'Upload your own lecture slides, notes, or PDFs and use them as the source for quizzes, flashcards, and lessons.' },
  { icon:'📊', title:'Progress Tracking', desc:'Track quizzes completed, flashcards studied, lessons generated, and your study streak over time.' },
];

const TEAM = [
  { name:'MedPrep Team', role:'Medical Education & AI', emoji:'🩺' },
];

const FAQ = [
  ['Is MedPrep free to use?', 'Yes! The Free plan gives you access to 4 courses (Anatomy, Physiology, Biology, Chemistry), up to 10 quiz questions and 15 flashcards per session, and basic lesson generation.'],
  ['What does Pro unlock?', 'All 14 courses, up to 100 quiz questions (150 on Annual), 100+ flashcards, unlimited lessons, upload your own material, and MCAT prep mode.'],
  ['Which payment methods are accepted?', 'We support all major credit/debit cards via Stripe, and mobile money + bank payments via Paystack — ideal for students in Ghana and across Africa.'],
  ['Can I use MedPrep for the MCAT?', 'Absolutely. Our Premed track covers every MCAT content area: Biology, Gen Chem, Org Chem, Physics, Psychology, and Sociology.'],
  ['How accurate is the AI content?', 'Our AI is powered by Claude (Anthropic) and trained prompts from medical educators. We recommend using it alongside your official curriculum materials.'],
  ['Can I cancel my subscription?', 'Yes, anytime. You keep Pro access until the end of your billing period with no penalties.'],
];

export default function AboutPage() {
  return (
    <DashboardLayout title="About MedPrep" sub="Your AI-powered medical & premed study toolkit">
      {/* Hero */}
      <div className="rounded-2xl p-8 mb-8 text-center" style={{ background:'linear-gradient(135deg,rgba(79,142,247,0.12),rgba(62,207,142,0.08))', border:'1px solid rgba(79,142,247,0.2)' }}>
        <div className="text-[48px] mb-4">🩺</div>
        <h2 className="font-dm-serif text-[30px] text-text mb-3">Built for the next generation of doctors</h2>
        <p className="text-text2 text-[15px] max-w-2xl mx-auto leading-relaxed">
          MedPrep is an AI-powered study toolkit designed specifically for medical and premed students. We combine cutting-edge AI with proven study science — active recall, spaced repetition, and structured learning — so you can study smarter, not harder.
        </p>
        <div className="flex justify-center gap-8 mt-6">
          {[['14','Courses'],['100+','Questions/session'],['150+','Flashcards/session'],['∞','Lessons']].map(([n,l]) => (
            <div key={l} className="text-center">
              <div className="font-dm-serif text-[28px] text-accent">{n}</div>
              <div className="text-[12px] text-text3">{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <h3 className="font-dm-serif text-[22px] text-text mb-4">What MedPrep offers</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {FEATURES.map(f => (
          <Card key={f.title} className="hover:border-border2 transition-colors">
            <div className="text-[28px] mb-3">{f.icon}</div>
            <h4 className="font-semibold text-text text-[14px] mb-2">{f.title}</h4>
            <p className="text-text2 text-[13px] leading-relaxed">{f.desc}</p>
          </Card>
        ))}
      </div>

      {/* How it works */}
      <Card className="mb-8">
        <h3 className="font-dm-serif text-[22px] text-text mb-6">How it works</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            ['1','Create account','Sign up free in under a minute — no credit card needed.'],
            ['2','Choose a course or upload','Browse 14 courses or upload your own lecture notes.'],
            ['3','Study with AI','Generate quizzes, flashcards, or a live streamed lesson.'],
            ['4','Track progress','Watch your scores, streaks, and completion rate grow.'],
          ].map(([n,t,d]) => (
            <div key={n} className="text-center p-4">
              <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-white font-bold text-[15px] mx-auto mb-3">{n}</div>
              <div className="font-semibold text-text text-[13px] mb-1.5">{t}</div>
              <div className="text-text3 text-[12px] leading-relaxed">{d}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* FAQ */}
      <h3 className="font-dm-serif text-[22px] text-text mb-4">Frequently asked questions</h3>
      <Card className="mb-8">
        {FAQ.map(([q, a]) => (
          <div key={q} className="border-b border-border py-4 last:border-0">
            <div className="font-medium text-text text-[14px] mb-1.5">{q}</div>
            <div className="text-text2 text-[13px] leading-relaxed">{a}</div>
          </div>
        ))}
      </Card>

      {/* CTA */}
      <div className="rounded-2xl p-8 text-center" style={{ background:'rgba(79,142,247,0.08)', border:'1px solid rgba(79,142,247,0.25)' }}>
        <h3 className="font-dm-serif text-[22px] text-text mb-2">Ready to study smarter?</h3>
        <p className="text-text2 text-[14px] mb-5">Unlock all 14 courses and unlimited AI tools with Pro.</p>
        <Link href="/billing" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-white text-[14px]" style={{ background:'var(--accent)' }}>Upgrade to Pro →</Link>
      </div>
    </DashboardLayout>
  );
}
