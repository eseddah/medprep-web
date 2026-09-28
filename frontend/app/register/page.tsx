'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { register } from '@/lib/auth';
import { useStore } from '@/lib/store';
import toast from 'react-hot-toast';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

export default function RegisterPage() {
  const router = useRouter();
  const setUser = useStore(s => s.setUser);
  const [form, setForm] = useState({ name:'', email:'', password:'', school:'', year:'' });
  const [loading, setLoading] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      const { user } = await register(form);
      setUser(user);
      toast.success('Account created! Welcome to MedPrep 🎉');
      router.push('/courses');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-dm-serif text-[32px] text-text mb-1">Med<span className="text-accent">Prep</span></h1>
          <p className="text-text3 text-[14px]">Create your free student account</p>
        </div>
        <div className="bg-surface border border-border rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Full Name" placeholder="Dr. Jane Doe" value={form.name} onChange={set('name')} required />
            <Input label="Email" type="email" placeholder="you@email.com" value={form.email} onChange={set('email')} required />
            <Input label="Password" type="password" placeholder="min. 6 characters" value={form.password} onChange={set('password')} required />
            <Input label="School (optional)" placeholder="e.g. University of Ghana Medical School" value={form.school} onChange={set('school')} />
            <div>
              <label className="block text-[12px] text-text3 mb-1.5">Year (optional)</label>
              <select value={form.year} onChange={set('year')} className="w-full bg-surface2 border border-border2 text-text rounded-lg px-3 py-2 text-[13px] outline-none" style={{fontFamily:'var(--font-outfit)'}}>
                <option value="">— Select year —</option>
                {['Premed Year 1','Premed Year 2','Premed Year 3','Premed Year 4','Med School Year 1','Med School Year 2','Med School Year 3','Med School Year 4','Resident','Other'].map(y => <option key={y}>{y}</option>)}
              </select>
            </div>
            <Button type="submit" variant="primary" full disabled={loading}>
              {loading ? 'Creating account…' : 'Create Free Account'}
            </Button>
          </form>
          <p className="text-center text-[13px] text-text3 mt-5">
            Already have an account? <Link href="/login" className="text-accent hover:underline">Sign in</Link>
          </p>
        </div>
        <p className="text-center text-[11px] text-text3 mt-4">By registering you agree to our Terms of Service and Privacy Policy.</p>
      </div>
    </div>
  );
}
