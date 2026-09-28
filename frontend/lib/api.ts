import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
});

// Attach JWT on every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('medprep_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto logout on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const isPublicAuthRequest = /\/auth\/(login|register)(\?|$)/.test(err.config?.url || '');
    if (err.response?.status === 401 && !isPublicAuthRequest && typeof window !== 'undefined') {
      localStorage.removeItem('medprep_token');
      localStorage.removeItem('medprep_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
