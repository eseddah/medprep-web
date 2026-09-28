import api from './api';

export interface User {
  _id: string;
  name: string;
  email: string;
  plan: 'free' | 'pro' | 'annual';
  bio?: string;
  school?: string;
  year?: string;
  avatar?: string;
  stats?: Record<string, number>;
  preferences?: Record<string, unknown>;
  createdAt?: string;
}

export const login = async (email: string, password: string) => {
  const { data } = await api.post('/auth/login', { email, password });
  localStorage.setItem('medprep_token', data.token);
  localStorage.setItem('medprep_user', JSON.stringify(data.user));
  return data;
};

export const register = async (payload: { name: string; email: string; password: string; school?: string; year?: string }) => {
  const { data } = await api.post('/auth/register', payload);
  localStorage.setItem('medprep_token', data.token);
  localStorage.setItem('medprep_user', JSON.stringify(data.user));
  return data;
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
