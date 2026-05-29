import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor to automatically unpack success/error envelopes
apiClient.interceptors.response.use(
  (response) => {
    // Unpack the { success: true, data, meta } envelope
    if (response.data && typeof response.data === 'object' && 'success' in response.data) {
      return response.data;
    }
    return response;
  },
  (error) => {
    // Unpack the { success: false, error: { code, message, details } } envelope
    if (error.response && error.response.data && error.response.data.error) {
      return Promise.reject(error.response.data.error);
    }
    return Promise.reject({
      code: 'HTTP_CLIENT_ERROR',
      message: error.message || 'An unknown network error occurred.',
      details: error,
    });
  }
);

export default apiClient;
