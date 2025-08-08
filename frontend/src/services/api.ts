import axios from 'axios';

// Resolver URL base del backend
const BACKEND_URL =
  (import.meta as any).env.VITE_BACKEND_URL ||
  ((import.meta as any).env.DEV ? 'http://localhost:3002' : 'https://dev-apiwaprueba.aova.mx');

export const api = axios.create({
  baseURL: BACKEND_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor: añadir Authorization si existe y prefijar /api a rutas absolutas
api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  if (token) {
    config.headers = {
      ...(config.headers as any),
      Authorization: `Bearer ${token}`
    };
  }

  if (config.url && config.url.startsWith('/')) {
    if (!config.url.startsWith('/api/')) {
      config.url = '/api' + config.url;
    }
  }

  return config;
});

