import axios from 'axios';

const apiUrl = import.meta.env.VITE_API_URL;
if (!apiUrl && import.meta.env.PROD) {
  // Fail loud in a misconfigured production build instead of silently sending
  // authenticated requests to the visitor's own localhost.
  console.error('VITE_API_URL is not set — API requests will fail.');
}

const api = axios.create({
  baseURL: apiUrl || 'http://localhost:3000/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only treat a 401 as session expiry when the request was actually
    // authenticated — a 401 from a login/register attempt is handled in-page.
    const hadToken = Boolean(localStorage.getItem('auth_token'));
    const path = window.location.pathname;
    const onAuthPage = path === '/login' || path === '/register';
    if (error.response?.status === 401 && hadToken && !onAuthPage) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default api;
