'use client';
import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useStore } from '@/lib/store';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { logout } from '@/lib/auth';
import ThemeToggle from '@/components/ui/ThemeToggle';

type Tab = 'profile'|'password'|'preferences'|'billing'|'data'|'danger';

export default function SettingsPage() {
  const { user, updateUser } = useStore();
  const [tab, setTab] = useState<Tab>('profile');
  const [loading, setLoading] = useState(false);

  // Profile
  const [profile, setProfile] = useState({ name:'', bio:'', school:'', year:'' });
  useEffect(() => { if (user) setProfile({ name:user.name||'', bio:(user.bio||''), school:(user.school||''), year:(user.year||'') }); }, [user]);

  // Password
  const [pwd, setPwd] = useState({ currentPassword:'', newPassword:'', confirm:'' });

  // Preferences
  const [prefs, setPrefs] = useState<any>({});
  useEffect(() => { if (user?.preferences) setPrefs(user.preferences); }, [user]);

  // Delete
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');

  const saveProfile = async () => {
    setLoading(true);
    try {
      const { data } = await api.patch('/users/profile', profile);
      updateUser(data.user);
      localStorage.setItem('medprep_user', JSON.stringify(data.user));
      toast.success('Profile updated');
    } catch (e:any) { toast.error(e.response?.data?.error || 'Failed'); }
    setLoading(false);
  };

  const savePassword = async () => {
    if (pwd.newPassword !== pwd.confirm) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      await api.patch('/users/password', { currentPassword: pwd.currentPassword, newPassword: pwd.newPassword });
      toast.success('Password updated');
      setPwd({ currentPassword:'', newPassword:'', confirm:'' });
    } catch (e:any) { toast.error(e.response?.data?.error || 'Failed'); }
    setLoading(false);
  };

  const savePrefs = async () => {
    setLoading(true);
    try {
      const { data } = await api.patch('/users/preferences', prefs);
      updateUser({ preferences: data.preferences });
      toast.success('Preferences saved');
    } catch (e:any) { toast.error('Failed'); }
    setLoading(false);
  };

  const exportData = async () => {
    try {
      const res = await api.get('/users/export', { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url; a.download = 'medprep-data.json'; a.click();
      toast.success('Data exported');
    } catch { toast.error('Export failed'); }
  };

  const deleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') { toast.error('Type DELETE to confirm'); return; }
    setLoading(true);
    try {
      await api.delete('/users/account', { data: { password: deletePassword } });
      toast.success('Account deleted');
      logout();
    } catch (e:any) { toast.error(e.response?.data?.error || 'Failed'); }
    setLoading(false);
  };

  const TABS: { id: Tab; label: string }[] = [
    { id:'profile', label:'Profile' },
    { id:'password', label:'Password' },
    { id:'preferences', label:'Preferences' },
    { id:'billing', label:'Billing' },
    { id:'data', label:'My Data' },
    { id:'danger', label:'Danger Zone' },
  ];

  return (
    <DashboardLayout title="Settings" sub="Manage your account, preferences, and data">
      <div className="flex gap-6">
        {/* Tab sidebar */}
        <div className="w-44 flex-shrink-0">
          <nav className="space-y-0.5">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} className={`w-full text-left px-3 py-2 rounded-lg text-[13px] transition-all ${tab===t.id ? 'bg-surface3 text-text font-medium' : 'text-text2 hover:bg-surface2'} ${t.id==='danger' ? 'text-red' : ''}`} style={{fontFamily:'var(--font-outfit)'}}>{t.label}</button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {tab === 'profile' && (
            <Card>
              <h3 className="font-dm-serif text-[18px] text-text mb-5">Profile Information</h3>
              <div className="space-y-4">
                <Input label="Full Name" value={profile.name} onChange={e => setProfile(p => ({...p, name:e.target.value}))} />
                <div>
                  <label className="block text-[12px] text-text3 mb-1.5">Bio</label>
                  <textarea value={profile.bio} onChange={e => setProfile(p => ({...p, bio:e.target.value}))} rows={3} placeholder="Tell us about yourself…" className="w-full bg-surface2 border border-border2 text-text rounded-lg px-3 py-2 text-[13px] outline-none focus:border-accent resize-none" style={{fontFamily:'var(--font-outfit)'}} />
                </div>
                <Input label="School / University" value={profile.school} onChange={e => setProfile(p => ({...p, school:e.target.value}))} placeholder="e.g. University of Ghana Medical School" />
                <div>
                  <label className="block text-[12px] text-text3 mb-1.5">Year</label>
                  <select value={profile.year} onChange={e => setProfile(p => ({...p, year:e.target.value}))} className="w-full bg-surface2 border border-border2 text-text rounded-lg px-3 py-2 text-[13px] outline-none" style={{fontFamily:'var(--font-outfit)'}}>
                    <option value="">— Select year —</option>
                    {['Premed Year 1','Premed Year 2','Premed Year 3','Premed Year 4','Med School Year 1','Med School Year 2','Med School Year 3','Med School Year 4','Resident','Other'].map(y => <option key={y}>{y}</option>)}
                  </select>
                </div>
                <div className="pt-2">
                  <Button variant="primary" onClick={saveProfile} disabled={loading}>{loading ? 'Saving…' : 'Save Profile'}</Button>
                </div>
              </div>
            </Card>
          )}

          {tab === 'password' && (
            <Card>
              <h3 className="font-dm-serif text-[18px] text-text mb-5">Change Password</h3>
              <div className="space-y-4">
                <Input label="Current Password" type="password" value={pwd.currentPassword} onChange={e => setPwd(p => ({...p, currentPassword:e.target.value}))} />
                <Input label="New Password" type="password" value={pwd.newPassword} onChange={e => setPwd(p => ({...p, newPassword:e.target.value}))} />
                <Input label="Confirm New Password" type="password" value={pwd.confirm} onChange={e => setPwd(p => ({...p, confirm:e.target.value}))} />
                <Button variant="primary" onClick={savePassword} disabled={loading}>{loading ? 'Updating…' : 'Update Password'}</Button>
              </div>
            </Card>
          )}

          {tab === 'preferences' && (
            <Card>
              <h3 className="font-dm-serif text-[18px] text-text mb-5">Study Preferences</h3>
              <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                  <div>
                    <div className="text-[14px] text-text">Color theme</div>
                    <div className="text-[12px] text-text3">Choose a light or dark appearance</div>
                  </div>
                  <ThemeToggle />
                </div>
                <div>
                  <label className="block text-[12px] text-text3 mb-1.5">Default Quiz Count</label>
                  <select value={prefs.defaultQuizCount || 20} onChange={e => setPrefs((p:any) => ({...p, defaultQuizCount:parseInt(e.target.value)}))} className="bg-surface2 border border-border2 text-text rounded-lg px-3 py-2 text-[13px] outline-none" style={{fontFamily:'var(--font-outfit)'}}>
                    {[10,20,30,50,100].map(n => <option key={n} value={n}>{n} questions</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] text-text3 mb-1.5">Default Flashcard Count</label>
                  <select value={prefs.defaultFlashCount || 20} onChange={e => setPrefs((p:any) => ({...p, defaultFlashCount:parseInt(e.target.value)}))} className="bg-surface2 border border-border2 text-text rounded-lg px-3 py-2 text-[13px] outline-none" style={{fontFamily:'var(--font-outfit)'}}>
                    {[10,20,30,50,100].map(n => <option key={n} value={n}>{n} cards</option>)}
                  </select>
                </div>
                {[
                  ['emailNotifications', 'Email Notifications', 'Get study reminders and account updates by email'],
                  ['studyReminders', 'Daily Study Reminders', 'Receive a reminder to study each day'],
                ].map(([key, label, desc]) => (
                  <div key={key} className="flex items-center justify-between py-3 border-b border-border">
                    <div>
                      <div className="text-[14px] text-text">{label}</div>
                      <div className="text-[12px] text-text3">{desc}</div>
                    </div>
                    <button onClick={() => setPrefs((p:any) => ({...p, [key]:!p[key]}))} className={`w-11 h-6 rounded-full transition-colors relative ${prefs[key] ? 'bg-accent' : 'bg-surface3'}`}>
                      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${prefs[key] ? 'left-[22px]' : 'left-0.5'}`} />
                    </button>
                  </div>
                ))}
                <Button variant="primary" onClick={savePrefs} disabled={loading}>{loading ? 'Saving…' : 'Save Preferences'}</Button>
              </div>
            </Card>
          )}

          {tab === 'billing' && (
            <Card>
              <h3 className="font-dm-serif text-[18px] text-text mb-2">Billing & Subscription</h3>
              <p className="text-text3 text-[13px] mb-5">Manage your plan and payment details.</p>
              <div className="bg-surface2 border border-border rounded-xl p-4 mb-5">
                <div className="text-[12px] text-text3 uppercase tracking-wide mb-1">Current Plan</div>
                <div className="text-[16px] font-semibold text-text">{user?.plan === 'annual' ? 'Pro Annual' : user?.plan === 'pro' ? 'Pro Monthly' : 'Free'}</div>
              </div>
              <div className="flex gap-3 flex-wrap">
                <Button variant="primary" onClick={() => window.location.href='/billing'}>Manage Plan</Button>
              </div>
            </Card>
          )}

          {tab === 'data' && (
            <Card>
              <h3 className="font-dm-serif text-[18px] text-text mb-2">My Data</h3>
              <p className="text-text2 text-[13px] mb-5">Download everything MedPrep has stored about your account, preferences, and study history.</p>
              <div className="bg-surface2 border border-border rounded-xl p-4 mb-5">
                {user?.stats && Object.entries(user.stats as Record<string,number>).map(([k,v]) => (
                  <div key={k} className="flex justify-between py-2 border-b border-border last:border-0 text-[13px]">
                    <span className="text-text2 capitalize">{k.replace(/([A-Z])/g,' $1').trim()}</span>
                    <span className="text-text font-medium">{v}</span>
                  </div>
                ))}
              </div>
              <Button variant="ghost" onClick={exportData}>📥 Export My Data (JSON)</Button>
            </Card>
          )}

          {tab === 'danger' && (
            <Card className="border-red/30">
              <h3 className="font-dm-serif text-[18px] text-red mb-2">Danger Zone</h3>
              <p className="text-text2 text-[13px] mb-5">Deleting your account is permanent and cannot be undone. All your progress, preferences, and data will be erased.</p>
              <div className="space-y-3 max-w-sm">
                <Input label="Enter your password" type="password" placeholder="Your current password" value={deletePassword} onChange={e => setDeletePassword(e.target.value)} />
                <Input label='Type "DELETE" to confirm' placeholder="DELETE" value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} />
                <Button variant="danger" onClick={deleteAccount} disabled={loading || deleteConfirm !== 'DELETE'}>
                  {loading ? 'Deleting…' : 'Delete My Account Permanently'}
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
