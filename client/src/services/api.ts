import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

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
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only logout on 401 if it's not during initial app load or user restoration
    if (error.response?.status === 401) {
      // Check if this is during app initialization (first 10 seconds)
      const isInitialLoad = performance.now() < 10000;
      
      // Also check if we have a token (means user was logged in before)
      const hasToken = localStorage.getItem('token');
      
      if (!isInitialLoad && hasToken) {
        console.log('🔒 Session expired, logging out...');
        localStorage.removeItem('token');
        // Use window.location.reload() instead of direct navigation to avoid issues
        window.location.href = '/login';
      } else {
        console.log('⚠️ 401 during app load or no token found, ignoring...');
        // Don't logout during initial load or if no token exists
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials: { email: string; password: string }) =>
    api.post('/auth/login', credentials).then(res => res.data),
  
  register: (userData: any) =>
    api.post('/auth/register', userData).then(res => res.data),
  
  getCurrentUser: () =>
    api.get('/auth/me').then(res => res.data),
  
  updateProfile: (profileData: any) =>
    api.put('/auth/profile', profileData).then(res => res.data),
  
  changePassword: (passwordData: { currentPassword: string; newPassword: string }) =>
    api.post('/auth/change-password', passwordData).then(res => res.data),
  
  deleteAccount: (password: string) =>
    api.delete('/auth/delete-account', { data: { password } }).then(res => res.data),
  
  logout: () =>
    api.post('/auth/logout').then(res => res.data),
};

// Services API
export const servicesAPI = {
  getServices: (params?: any) =>
    api.get('/services', { params }).then(res => res.data),
  
  getService: (id: string) =>
    api.get(`/services/${id}`).then(res => res.data),
  
  getAvailableServices: () =>
    api.get('/services/available').then(res => res.data),
  
  getProviderServices: (params?: any) =>
    api.get('/services/provider/my', { params }).then(res => res.data),
  
  requestService: (serviceId: string) =>
    api.post(`/services/${serviceId}/request`).then(res => res.data),
  
  createService: (serviceData: any) =>
    api.post('/services', serviceData).then(res => res.data),
  
  updateService: (id: string, serviceData: any) =>
    api.put(`/services/${id}`, serviceData).then(res => res.data),
  
  deleteService: (id: string) =>
    api.delete(`/services/${id}`).then(res => res.data),
  
  searchServices: (query: string, filters?: any) =>
    api.get('/services/search', { params: { q: query, ...filters } }).then(res => res.data),
};

// Admin Services API
export const adminServicesAPI = {
  getServiceRequests: (params?: any) =>
    api.get('/admin/service-requests', { params }).then(res => res.data),
  
  approveServiceRequest: (serviceId: string, data: { providerId: string }) =>
    api.post(`/admin/provider-services/${serviceId}/approve`, data).then(res => res.data),
  
  rejectServiceRequest: (serviceId: string, data: { providerId: string; rejectionReason?: string }) =>
    api.post(`/admin/provider-services/${serviceId}/reject`, data).then(res => res.data),
};

// Bookings API
export const bookingsAPI = {
  getBookings: (params?: any) =>
    api.get('/bookings', { params }).then(res => res.data),
  
  getBooking: (id: string) =>
    api.get(`/bookings/${id}`).then(res => res.data),
  
  createBooking: (bookingData: any) =>
    api.post('/bookings', bookingData).then(res => res.data),
  
  updateBooking: (id: string, bookingData: any) =>
    api.put(`/bookings/${id}`, bookingData).then(res => res.data),
  
  cancelBooking: (id: string, reason?: string) =>
    api.post(`/bookings/${id}/cancel`, { reason }).then(res => res.data),
  
  completeBooking: (id: string, completionData?: any) =>
    api.post(`/bookings/${id}/complete`, completionData).then(res => res.data),
  
  completeBookingWithReview: (id: string, reviewData: { rating: number; comment: string }) =>
    api.post(`/bookings/${id}/complete-customer`, reviewData).then(res => res.data),
  
  rejectBroadcastRequest: (id: string) =>
    api.post(`/bookings/${id}/reject-broadcast`).then(res => res.data),
};

// Payments API
export const paymentsAPI = {
  createPaymentIntent: (paymentData: any) =>
    api.post('/payments/create-intent', paymentData).then(res => res.data),
  
  confirmPayment: (paymentData: any) =>
    api.post('/payments/confirm', paymentData).then(res => res.data),
  
  getPaymentHistory: (params?: any) =>
    api.get('/payments/history', { params }).then(res => res.data),
  
  getPaymentMethods: () =>
    api.get('/payments/payment-methods').then(res => res.data),
  
  savePaymentMethod: (paymentData: any) =>
    api.post('/payments/payment-methods', paymentData).then(res => res.data),
  
  deletePaymentMethod: (paymentMethodId: string) =>
    api.delete(`/payments/payment-methods/${paymentMethodId}`).then(res => res.data),
  
  refundPayment: (refundData: any) =>
    api.post('/payments/refund', refundData).then(res => res.data),
};

// Wallet API
export const walletAPI = {
  getWallet: () =>
    api.get('/wallet').then(res => res.data),
  
  getBalance: () =>
    api.get('/wallet/balance').then(res => res.data),
  
  getTransactions: (params?: any) =>
    api.get('/wallet/transactions', { params }).then(res => res.data),
  
  createRazorpayOrder: (amount: number) =>
    api.post('/wallet/create-order', { amount }).then(res => res.data),
  
  verifyRazorpayPayment: (paymentData: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string; amount: number }) =>
    api.post('/wallet/verify-payment', paymentData).then(res => res.data),
  
  recharge: (rechargeData: { amount: number; paymentMethod?: string; metadata?: any }) =>
    api.post('/wallet/recharge', rechargeData).then(res => res.data),
  
  debit: (debitData: { amount: number; description?: string; referenceId?: string; referenceType?: string; metadata?: any }) =>
    api.post('/wallet/debit', debitData).then(res => res.data),
  
  addBonus: (bonusData: { userId: string; amount: number; description?: string; metadata?: any }) =>
    api.post('/wallet/bonus', bonusData).then(res => res.data),
  
  updateSettings: (settings: any) =>
    api.put('/wallet/settings', { settings }).then(res => res.data),
  
  getStats: () =>
    api.get('/wallet/stats').then(res => res.data),
};

// Users API
export const usersAPI = {
  updateProfile: (profileData: any) =>
    api.put('/users/profile', profileData).then(res => res.data),
  
  updateSettings: (settings: any) =>
    api.put('/users/settings', settings).then(res => res.data),
  
  uploadKYCDocuments: (documents: any) =>
    api.post('/kyc', documents).then(res => res.data),
  
  uploadKYCDocument: (formData: FormData) =>
    api.post('/upload/kyc-document', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(res => res.data),
  
  getKYCStatus: () =>
    api.get('/kyc/status').then(res => res.data),
  
  uploadProfilePicture: (formData: FormData) =>
    api.post('/users/profile-picture', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(res => res.data),
};

// Provider API
export const providerAPI = {
  updateAvailability: (availabilityData: { isAvailable?: boolean; locationSharingEnabled?: boolean }) =>
    api.put('/provider/availability', availabilityData).then(res => res.data),
  
  updateLocation: (locationData: { lat: number; lng: number }) =>
    api.put('/provider/location', locationData).then(res => res.data),
  
  getStatus: () =>
    api.get('/provider/status').then(res => res.data),
  
  getNearbyProviders: (params: { lat: string; lng: string; category: string; radius?: string }) =>
    api.get('/provider/nearby', { params }).then(res => res.data),
};

// Admin API
export const adminAPI = {
  getUsers: (params?: any) =>
    api.get('/admin/users', { params }).then(res => res.data),
  
  getUser: (id: string) =>
    api.get(`/admin/users/${id}`).then(res => res.data),
  
  updateUser: (id: string, userData: any) =>
    api.put(`/admin/users/${id}`, userData).then(res => res.data),
  
  getPendingKYC: () =>
    api.get('/admin/kyc/pending').then(res => res.data),
  
  approveKYC: (userId: string) =>
    api.post(`/admin/kyc/${userId}/approve`).then(res => res.data),
  
  rejectKYC: (userId: string, reason: string) =>
    api.post(`/admin/kyc/${userId}/reject`, { reason }).then(res => res.data),
  
  getAnalytics: () =>
    api.get('/admin/analytics').then(res => res.data),
  
  getServices: (params?: any) =>
    api.get('/admin/services', { params }).then(res => res.data),
  
  approveService: (serviceId: string) =>
    api.post(`/admin/services/${serviceId}/approve`).then(res => res.data),

  updateService: (serviceId: string, serviceData: any) =>
    api.put(`/admin/services/${serviceId}`, serviceData).then(res => res.data),

  createService: (serviceData: any) =>
    api.post('/admin/services', serviceData).then(res => res.data),

  approveServiceRequest: (serviceId: string, data: { providerId: string }) =>
    api.post(`/services/admin/${serviceId}/approve`, data).then(res => res.data),

  rejectServiceRequest: (serviceId: string, data: { providerId: string; rejectionReason?: string }) =>
    api.post(`/services/admin/${serviceId}/reject`, data).then(res => res.data),

  // Coupon Management
  getCoupons: (params?: any) =>
    api.get('/admin/coupons', { params }).then(res => res.data),
  
  createCoupon: (couponData: any) =>
    api.post('/admin/coupons', couponData).then(res => res.data),
  
  updateCoupon: (id: string, couponData: any) =>
    api.put(`/admin/coupons/${id}`, couponData).then(res => res.data),
  
  deleteCoupon: (id: string) =>
    api.delete(`/admin/coupons/${id}`).then(res => res.data),
  
  getCouponStats: (id: string) =>
    api.get(`/admin/coupons/${id}/stats`).then(res => res.data),
};

export default api;
