import axios from 'axios';
import { getCookie, removeCookie } from '../cookies';

export const api = axios.create({
  baseURL: import.meta.env.VITE_PUBLIC_API_URL || 'http://localhost:3333',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Anexa o token JWT automaticamente em todas as requisições
api.interceptors.request.use((config) => {
  const token = getCookie('token') || localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Trata erros de autenticação globalmente
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      removeCookie('token');
      localStorage.removeItem('token');
      if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
