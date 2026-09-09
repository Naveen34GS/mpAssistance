import axios from 'axios';
import { supabase } from './supabase';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true, // For cookies (PIN session)
});

// Add a request interceptor to attach Supabase JWT
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  
  const pinSession = localStorage.getItem('pin_session');
  if (pinSession) {
    config.headers['x-pin-session'] = pinSession;
  }
  
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;
