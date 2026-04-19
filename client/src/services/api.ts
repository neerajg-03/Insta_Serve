import axios from 'axios';

// Base URL from environment
const API_BASE_URL = process.env.REACT_APP_API_URL;

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isInitialLoad = performance.now() < 10000;
      const hasToken = localStorage.getItem('token');

      if (!isInitialLoad && hasToken) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

/* =========================
   AUTH APIs
========================= */
export const authAPI = {
  login: (data: { email: string; password: string }) =>
    api.post('/api/auth/login', data).then(res => res.data),

  register: (data: any) =>
    api.post('/api/auth/register', data).then(res => res.data),

  getCurrentUser: () =>
    api.get('/api/auth/me').then(res => res.data),

  updateProfile: (data: any) =>
    api.put('/api/auth/profile', data).then(res => res.data),

  changePassword: (data: any) =>
    api.post('/api/auth/change-password', data).then(res => res.data),

  deleteAccount: (password: string) =>
    api.delete('/api/auth/delete-account', { data: { password } }).then(res => res.data),

  logout: () =>
    api.post('/api/auth/logout').then(res => res.data),
};

/* =========================
   SERVICES
========================= */
export const servicesAPI = {
  getServices: (params?: any) =>
    api.get('/api/services', { params }).then(res => res.data),

  getService: (id: string) =>
    api.get(`/api/services/${id}`).then(res => res.data),

  getAvailableServices: () =>
    api.get('/api/services/available').then(res => res.data),

  createService: (data: any) =>
    api.post('/api/services', data).then(res => res.data),

  updateService: (id: string, data: any) =>
    api.put(`/api/services/${id}`, data).then(res => res.data),

  deleteService: (id: string) =>
    api.delete(`/api/services/${id}`).then(res => res.data),
};

/* =========================
   BOOKINGS
========================= */
export const bookingsAPI = {
  getBookings: (params?: any) =>
    api.get('/api/bookings', { params }).then(res => res.data),

  getBooking: (id: string) =>
    api.get(`/api/bookings/${id}`).then(res => res.data),

  createBooking: (data: any) =>
    api.post('/api/bookings', data).then(res => res.data),

  updateBooking: (id: string, data: any) =>
    api.put(`/api/bookings/${id}`, data).then(res => res.data),

  cancelBooking: (id: string) =>
    api.post(`/api/bookings/${id}/cancel`).then(res => res.data),
};

/* =========================
   PAYMENTS
========================= */
export const paymentsAPI = {
  createIntent: (data: any) =>
    api.post('/api/payments/create-intent', data).then(res => res.data),

  confirmPayment: (data: any) =>
    api.post('/api/payments/confirm', data).then(res => res.data),
};

/* =========================
   WALLET
========================= */
export const walletAPI = {
  getWallet: () =>
    api.get('/api/wallet').then(res => res.data),

  createOrder: (amount: number) =>
    api.post('/api/wallet/create-order', { amount }).then(res => res.data),

  verifyPayment: (data: any) =>
    api.post('/api/wallet/verify-payment', data).then(res => res.data),
};

/* =========================
   PROVIDER
========================= */
export const providerAPI = {
  updateAvailability: (data: any) =>
    api.put('/api/provider/availability', data).then(res => res.data),

  updateLocation: (data: any) =>
    api.put('/api/provider/location', data).then(res => res.data),

  getStatus: () =>
    api.get('/api/provider/status').then(res => res.data),
};

/* =========================
   ADMIN
========================= */
export const adminAPI = {
  getUsers: () =>
    api.get('/api/admin/users').then(res => res.data),

  getAnalytics: () =>
    api.get('/api/admin/analytics').then(res => res.data),
};

export default api;
