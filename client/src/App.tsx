import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { useDispatch } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { store, AppDispatch } from './store';
import { getCurrentUser } from './store/slices/authSlice';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Services from './pages/Services';
import ServiceDetail from './pages/ServiceDetail';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import ProviderDashboard from './pages/ProviderDashboard';
import KYCVerification from './pages/KYCVerification';
import ProviderTracking from './pages/ProviderTracking';
import UserTracking from './pages/UserTracking';
import Wallet from './pages/Wallet';
import About from './pages/About';
import Contact from './pages/Contact';
import ProtectedRoute from './components/ProtectedRoute';

function AppContent() {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    // Restore user session on app startup
    const token = localStorage.getItem('token');
    if (token) {
      // Set token in Redux state first
      dispatch({ type: 'auth/setToken', payload: token });
      // Then get current user
      dispatch(getCurrentUser());
    }
  }, [dispatch]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="services" element={<Services />} />
          <Route path="services/:id" element={<ServiceDetail />} />
          <Route path="dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="admin" element={
            <ProtectedRoute requiredRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="provider" element={
            <ProtectedRoute requiredRole="provider">
              <ProviderDashboard />
            </ProtectedRoute>
          } />
          <Route path="provider/kyc" element={
            <ProtectedRoute requiredRole="provider">
              <KYCVerification />
            </ProtectedRoute>
          } />
          <Route path="tracking/:id" element={
            <ProtectedRoute requiredRole="customer">
              <UserTracking />
            </ProtectedRoute>
          } />
          <Route path="provider/tracking/:id" element={
            <ProtectedRoute requiredRole="provider">
              <ProviderTracking />
            </ProtectedRoute>
          } />
          <Route path="wallet" element={
            <ProtectedRoute>
              <Wallet />
            </ProtectedRoute>
          } />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
        </Route>
      </Routes>
      <Toaster position="top-right" />
    </div>
  );
}

function App() {
  return (
    <Provider store={store}>
      <Router>
        <AppContent />
      </Router>
    </Provider>
  );
}

export default App;
