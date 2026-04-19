import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL;

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle errors
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

/* ================= AUTH ================= */
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

/* ================= SERVICES ================= */
export const servicesAPI = {
  getServices: (params?: any) =>
    api.get('/api/services', { params }).then(res => res.data),

  getService: (id: string) =>
    api.get(`/api/services/${id}`).then(res => res.data),

  getAvailableServices: () =>
    api.get('/api/services/available').then(res => res.data),

  getProviderServices: (params?: any) =>
    api.get('/api/services/provider/my', { params }).then(res => res.data),

  requestService: (serviceId: string) =>
    api.post(`/api/services/${serviceId}/request`).then(res => res.data),

  createService: (data: any) =>
    api.post('/api/services', data).then(res => res.data),

  updateService: (id: string, data: any) =>
    api.put(`/api/services/${id}`, data).then(res => res.data),

  deleteService: (id: string) =>
    api.delete(`/api/services/${id}`).then(res => res.data),

  searchServices: (query: string, filters?: any) =>
    api.get('/api/services/search', { params: { q: query, ...filters } }).then(res => res.data),
};

/* ================= ADMIN SERVICES ================= */
export const adminServicesAPI = {
  getServiceRequests: (params?: any) =>
    api.get('/api/admin/service-requests', { params }).then(res => res.data),

  approveServiceRequest: (serviceId: string, data: any) =>
    api.post(`/api/admin/provider-services/${serviceId}/approve`, data).then(res => res.data),

  rejectServiceRequest: (serviceId: string, data: any) =>
    api.post(`/api/admin/provider-services/${serviceId}/reject`, data).then(res => res.data),
};

/* ================= BOOKINGS ================= */
export const bookingsAPI = {
  getBookings: (params?: any) =>
    api.get('/api/bookings', { params }).then(res => res.data),

  getBooking: (id: string) =>
    api.get(`/api/bookings/${id}`).then(res => res.data),

  createBooking: (data: any) =>
    api.post('/api/bookings', data).then(res => res.data),

  updateBooking: (id: string, data: any) =>
    api.put(`/api/bookings/${id}`, data).then(res => res.data),

  cancelBooking: (id: string, reason?: string) =>
    api.post(`/api/bookings/${id}/cancel`, { reason }).then(res => res.data),

  completeBooking: (id: string, data?: any) =>
    api.post(`/api/bookings/${id}/complete`, data).then(res => res.data),

  completeBookingWithReview: (id: string, data: any) =>
    api.post(`/api/bookings/${id}/complete-customer`, data).then(res => res.data),

  rejectBroadcastRequest: (id: string) =>
    api.post(`/api/bookings/${id}/reject-broadcast`).then(res => res.data),
};

/* ================= PAYMENTS ================= */
export const paymentsAPI = {
  createPaymentIntent: (data: any) =>
    api.post('/api/payments/create-intent', data).then(res => res.data),

  confirmPayment: (data: any) =>
    api.post('/api/payments/confirm', data).then(res => res.data),

  getPaymentHistory: (params?: any) =>
    api.get('/api/payments/history', { params }).then(res => res.data),

  getPaymentMethods: () =>
    api.get('/api/payments/payment-methods').then(res => res.data),

  savePaymentMethod: (data: any) =>
    api.post('/api/payments/payment-methods', data).then(res => res.data),

  deletePaymentMethod: (id: string) =>
    api.delete(`/api/payments/payment-methods/${id}`).then(res => res.data),

  refundPayment: (data: any) =>
    api.post('/api/payments/refund', data).then(res => res.data),
};

/* ================= WALLET ================= */
export const walletAPI = {
  getWallet: () =>
    api.get('/api/wallet').then(res => res.data),

  getBalance: () =>
    api.get('/api/wallet/balance').then(res => res.data),

  getTransactions: (params?: any) =>
    api.get('/api/wallet/transactions', { params }).then(res => res.data),

  createRazorpayOrder: (amount: number) =>
    api.post('/api/wallet/create-order', { amount }).then(res => res.data),

  verifyRazorpayPayment: (data: any) =>
    api.post('/api/wallet/verify-payment', data).then(res => res.data),

  recharge: (data: any) =>
    api.post('/api/wallet/recharge', data).then(res => res.data),

  debit: (data: any) =>
    api.post('/api/wallet/debit', data).then(res => res.data),

  addBonus: (data: any) =>
    api.post('/api/wallet/bonus', data).then(res => res.data),

  updateSettings: (settings: any) =>
    api.put('/api/wallet/settings', { settings }).then(res => res.data),

  getStats: () =>
    api.get('/api/wallet/stats').then(res => res.data),
};

/* ================= USERS ================= */
export const usersAPI = {
  updateProfile: (data: any) =>
    api.put('/api/users/profile', data).then(res => res.data),

  updateSettings: (data: any) =>
    api.put('/api/users/settings', data).then(res => res.data),

  uploadKYCDocuments: (data: any) =>
    api.post('/api/kyc', data).then(res => res.data),

  uploadKYCDocument: (formData: FormData) =>
    api.post('/api/upload/kyc-document', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(res => res.data),

  getKYCStatus: () =>
    api.get('/api/kyc/status').then(res => res.data),

  uploadProfilePicture: (formData: FormData) =>
    api.post('/api/users/profile-picture', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(res => res.data),
};

/* ================= PROVIDER ================= */
export const providerAPI = {
  updateAvailability: (data: any) =>
    api.put('/api/provider/availability', data).then(res => res.data),

  updateLocation: (data: any) =>
    api.put('/api/provider/location', data).then(res => res.data),

  getStatus: () =>
    api.get('/api/provider/status').then(res => res.data),

  getNearbyProviders: (params: any) =>
    api.get('/api/provider/nearby', { params }).then(res => res.data),
};

/* ================= ADMIN ================= */
export const adminAPI = {
  getUsers: (params?: any) =>
    api.get('/api/admin/users', { params }).then(res => res.data),

  getUser: (id: string) =>
    api.get(`/api/admin/users/${id}`).then(res => res.data),

  updateUser: (id: string, data: any) =>
    api.put(`/api/admin/users/${id}`, data).then(res => res.data),

  getPendingKYC: () =>
    api.get('/api/admin/kyc/pending').then(res => res.data),

  approveKYC: (userId: string) =>
    api.post(`/api/admin/kyc/${userId}/approve`).then(res => res.data),

  rejectKYC: (userId: string, reason: string) =>
    api.post(`/api/admin/kyc/${userId}/reject`, { reason }).then(res => res.data),

  getAnalytics: () =>
    api.get('/api/admin/analytics').then(res => res.data),

  getServices: (params?: any) =>
    api.get('/api/admin/services', { params }).then(res => res.data),

  approveService: (id: string) =>
    api.post(`/api/admin/services/${id}/approve`).then(res => res.data),

  updateService: (id: string, data: any) =>
    api.put(`/api/admin/services/${id}`, data).then(res => res.data),

  createService: (data: any) =>
    api.post('/api/admin/services', data).then(res => res.data),

  approveServiceRequest: (id: string, data: any) =>
    api.post(`/api/services/admin/${id}/approve`, data).then(res => res.data),

  rejectServiceRequest: (id: string, data: any) =>
    api.post(`/api/services/admin/${id}/reject`, data).then(res => res.data),

  getCoupons: (params?: any) =>
    api.get('/api/admin/coupons', { params }).then(res => res.data),

  createCoupon: (data: any) =>
    api.post('/api/admin/coupons', data).then(res => res.data),

  updateCoupon: (id: string, data: any) =>
    api.put(`/api/admin/coupons/${id}`, data).then(res => res.data),

  deleteCoupon: (id: string) =>
    api.delete(`/api/admin/coupons/${id}`).then(res => res.data),

  getCouponStats: (id: string) =>
    api.get(`/api/admin/coupons/${id}/stats`).then(res => res.data),
};

export default api;
