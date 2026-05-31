import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT from auth store on every request
apiClient.interceptors.request.use((config) => {
  // Lazy-import to avoid circular dependency at module load time
  const raw = localStorage.getItem('auth-storage');
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      const token: string | null = parsed?.state?.token ?? null;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // ignore malformed storage
    }
  }
  return config;
});

// Response interceptor to automatically unpack success/error envelopes
apiClient.interceptors.response.use(
  (response) => {
    if (response.data && typeof response.data === 'object' && 'success' in response.data) {
      return response.data;
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Clear stale auth and redirect to login
      localStorage.removeItem('auth-storage');
      if (window.location.pathname !== '/login') {
        window.location.replace('/login');
      }
    }
    if (error.response?.data?.error) {
      return Promise.reject(error.response.data.error);
    }
    return Promise.reject({
      code: 'HTTP_CLIENT_ERROR',
      message: error.message || 'An unknown network error occurred.',
      details: error,
    });
  },
);

export default apiClient;
