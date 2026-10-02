import api from './api';

export interface User {
  _id: string;
  name: string;
  email: string;
  plan: 'free' | 'pro' | 'annual';
  bio?: string;
  school?: string;
  year?: string;
  timezone?: string;
  avatar?: string;
  stats?: Record<string, number>;
  preferences?: Record<string, unknown>;
  createdAt?: string;
}

export const login = async (email: string, password: string) => {
  const { data } = await api.post('/auth/login', { email: email.trim().toLowerCase(), password });
  localStorage.setItem('medprep_token', data.token);
  localStorage.setItem('medprep_user', JSON.stringify(data.user));
  return data;
};

export const register = async (payload: { name: string; email: string; password: string; school?: string; year?: string }) => {
  const { data } = await api.post('/auth/register', { ...payload, name: payload.name.trim(), email: payload.email.trim().toLowerCase() });
  localStorage.setItem('medprep_token', data.token);
  localStorage.setItem('medprep_user', JSON.stringify(data.user));
  return data;
};

export const googleLogin = async (credential: string) => {
  const { data } = await api.post('/auth/google', { credential });
  localStorage.setItem('medprep_token', data.token);
  localStorage.setItem('medprep_user', JSON.stringify(data.user));
  return data;
};

export const getPostAuthPath = () => {
  const referral = typeof window === 'undefined'
    ? ''
    : (new URLSearchParams(window.location.search).get('referral') || localStorage.getItem('medprep_pending_referral') || '').trim().toUpperCase();
  return /^[A-Z0-9_-]{4,32}$/.test(referral)
    ? `/billing?referral=${encodeURIComponent(referral)}`
    : '/courses';
};

export const logout = () => {
  localStorage.removeItem('medprep_token');
  localStorage.removeItem('medprep_user');
  window.location.href = '/login';
};

export const getStoredUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem('medprep_user') || 'null'); } catch { return null; }
};

export const isPro = (user: User | null) => ['pro','annual'].includes(user?.plan || '');
