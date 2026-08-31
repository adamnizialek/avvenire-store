import axios from 'axios';

const apiUrl = import.meta.env.VITE_API_URL;
if (!apiUrl && import.meta.env.PROD) {
  // Fail loud in a misconfigured production build instead of silently sending
  // authenticated requests to the visitor's own localhost.
  console.error('VITE_API_URL is not set — API requests will fail.');
}

const api = axios.create({
  baseURL: apiUrl || 'http://localhost:3000/api',
  // Auth rides in an httpOnly cookie set by the backend; page scripts (and
  // therefore XSS) can never read it. No Authorization header, no
  // localStorage token.
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only treat a 401 as session expiry when we believed we were logged in —
    // a 401 from a login/register attempt is handled in-page. The cached
    // profile (non-secret) is the "was logged in" flag; the cookie itself is
    // invisible to us by design.
    const wasLoggedIn = Boolean(localStorage.getItem('auth_user'));
    const path = window.location.pathname;
    const onAuthPage = path === '/login' || path === '/register';
    if (error.response?.status === 401 && wasLoggedIn && !onAuthPage) {
      localStorage.removeItem('auth_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default api;
