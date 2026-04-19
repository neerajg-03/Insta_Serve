import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { Link } from 'react-router-dom';
import { bookingsAPI, servicesAPI, usersAPI, authAPI } from '../services/api';
import { logout } from '../store/slices/authSlice';
import toast from 'react-hot-toast';
import { 
  HomeIcon, 
  CalendarIcon, 
  UserIcon, 
  CogIcon,
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  CurrencyDollarIcon,
  MagnifyingGlassIcon,
  BellIcon,
  ArrowTrendingUpIcon,
  SparklesIcon,
  StarIcon,
  DocumentTextIcon,
  CreditCardIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
  XMarkIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import ReviewModal from '../components/ReviewModal';
import ChangePasswordModal from '../components/ChangePasswordModal';
import DeleteAccountModal from '../components/DeleteAccountModal';

interface Booking {
  _id: string;
  service?: {
    title: string;
    category: string;
    price: number;
  } | null;
  provider?: {
    _id: string;
    name: string;
    email: string;
    phone: string;
  } | null;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'broadcast';
  scheduledDate: string;
  totalAmount?: number;
  price?: {
    totalPrice: number;
  };
  createdAt: string;
  notes?: string;
  address?: string | {
    street: string;
    city: string;
    state: string;
    pincode: string;
  };
}

interface Service {
  _id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  provider?: {
    name: string;
    rating?: number;
  };
  images?: string[];
  rating?: number;
  reviewCount?: number;
}

const Dashboard: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch<AppDispatch>();
  const [activeTab, setActiveTab] = useState('overview');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Profile state
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: typeof user?.address === 'string' ? user.address : user?.address?.city || ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  
  // Settings state
  const [settings, setSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    marketingEmails: false,
    language: 'en',
    currency: 'INR',
    darkMode: false,
    twoFactorAuth: false
  });
  const [settingsLoading, setSettingsLoading] = useState(false);

  // Review modal state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  // Password and account modals state
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);

  // Fetch user bookings
  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await bookingsAPI.getBookings({ customer: user?._id });
      setBookings(response.bookings || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch bookings');
      toast.error('Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  };

  // Fetch favorite services (using getServices with filters for now)
  const fetchFavorites = async () => {
    try {
      setLoading(true);
      setError(null);
      // For now, we'll use getServices. In a real app, this would be a dedicated favorites endpoint
      const response = await servicesAPI.getServices();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch favorites');
      toast.error('Failed to fetch favorites');
    } finally {
      setLoading(false);
    }
  };

  // Cancel booking
  const handleCancelBooking = async (bookingId: string) => {
    try {
      await bookingsAPI.cancelBooking(bookingId);
      toast.success('Booking cancelled successfully');
      fetchBookings(); // Refresh bookings
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to cancel booking');
    }
  };

  // Handle review submission
  const handleReviewSubmit = async (rating: number, comment: string) => {
    if (!selectedBooking) return;

    try {
      setReviewLoading(true);
      await bookingsAPI.completeBookingWithReview(selectedBooking._id, {
        rating,
        comment
      });
      
      toast.success('Review submitted successfully!');
      setShowReviewModal(false);
      setSelectedBooking(null);
      fetchBookings(); // Refresh bookings
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to submit review');
    } finally {
      setReviewLoading(false);
    }
  };

  // Open review modal
  const handleLeaveReview = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowReviewModal(true);
  };

  // Handle change password
  const handleChangePassword = async (passwordData: { currentPassword: string; newPassword: string }) => {
    try {
      setPasswordLoading(true);
      await authAPI.changePassword(passwordData);
      toast.success('Password changed successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to change password');
      throw error; // Re-throw to prevent modal from closing
    } finally {
      setPasswordLoading(false);
    }
  };

  // Handle delete account
  const handleDeleteAccount = async (password: string) => {
    try {
      setDeleteAccountLoading(true);
      await authAPI.deleteAccount(password);
      toast.success('Account deleted successfully');
      
      // Clear local storage and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Redirect to login page
      window.location.href = '/login';
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete account');
      throw error; // Re-throw to prevent modal from closing
    } finally {
      setDeleteAccountLoading(false);
    }
  };

  // Update profile
  const handleUpdateProfile = async (profileData: any) => {
    try {
      const response = await usersAPI.updateProfile(profileData);
      if (response.success) {
        toast.success('Profile updated successfully');
        // Update the user in Redux store if needed
        // dispatch(updateUser(response.user));
      } else {
        toast.error(response.message || 'Failed to update profile');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    }
  };

  // Save profile
  const handleSaveProfile = async () => {
    try {
      setProfileLoading(true);
      await handleUpdateProfile(profileData);
      setIsEditing(false);
    } catch (error) {
      // Error handled in handleUpdateProfile
    } finally {
      setProfileLoading(false);
    }
  };

  // Save settings
  const handleSaveSettings = async () => {
    try {
      setSettingsLoading(true);
      const response = await usersAPI.updateSettings(settings);
      if (response.success) {
        toast.success('Settings saved successfully');
      } else {
        toast.error(response.message || 'Failed to save settings');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSettingsLoading(false);
    }
  };

  useEffect(() => {
    // Always fetch bookings on component mount for overview stats
    fetchBookings();
  }, [activeTab]);

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: HomeIcon },
    { id: 'bookings', label: 'My Bookings', icon: CalendarIcon },
    { id: 'profile', label: 'Profile', icon: UserIcon },
    { id: 'settings', label: 'Settings', icon: CogIcon },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'broadcast':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircleIcon className="w-4 h-4" />;
      case 'in_progress':
        return <ClockIcon className="w-4 h-4" />;
      case 'completed':
        return <CheckIcon className="w-4 h-4" />;
      case 'cancelled':
        return <XMarkIcon className="w-4 h-4" />;
      case 'broadcast':
        return <BellIcon className="w-4 h-4" />;
      default:
        return <ClockIcon className="w-4 h-4" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmed';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      case 'broadcast':
        return 'Broadcast';
      default:
        return 'Pending';
    }
  };

  const renderOverview = () => (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.name}! 👋</h1>
            <p className="text-blue-100 text-lg">Manage your bookings and discover amazing services</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-3 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
            >
              <BellIcon className="w-6 h-6" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {notifications.length}
                </span>
              )}
            </button>
            <button
              onClick={() => dispatch(logout())}
              className="px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Total Bookings</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{bookings.length}</p>
              <p className="text-xs text-green-600 mt-2 flex items-center">
                <ArrowTrendingUpIcon className="w-3 h-3 mr-1" />
                12% from last month
              </p>
            </div>
            <div className="p-4 bg-blue-100 rounded-xl">
              <CalendarIcon className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Completed</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {bookings.filter(b => b.status === 'completed').length}
              </p>
              <p className="text-xs text-green-600 mt-2 flex items-center">
                <CheckCircleIcon className="w-3 h-3 mr-1" />
                Great job!
              </p>
            </div>
            <div className="p-4 bg-green-100 rounded-xl">
              <CheckCircleIcon className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Pending</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {bookings.filter(b => b.status === 'pending' || b.status === 'confirmed').length}
              </p>
              <p className="text-xs text-yellow-600 mt-2 flex items-center">
                <ClockIcon className="w-3 h-3 mr-1" />
                Action needed
              </p>
            </div>
            <div className="p-4 bg-yellow-100 rounded-xl">
              <ClockIcon className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Total Spent</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                ₹{bookings.filter(b => b.status === 'completed').reduce((sum, b) => sum + (b.totalAmount || b.price?.totalPrice || 0), 0)}
              </p>
              <p className="text-xs text-purple-600 mt-2 flex items-center">
                <CurrencyDollarIcon className="w-3 h-3 mr-1" />
                This month
              </p>
            </div>
            <div className="p-4 bg-purple-100 rounded-xl">
              <CurrencyDollarIcon className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
          <SparklesIcon className="w-6 h-6 mr-2 text-yellow-500" />
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/services"
            className="group p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl hover:from-blue-100 hover:to-blue-200 transition-all duration-200 border border-blue-200"
          >
            <MagnifyingGlassIcon className="w-8 h-8 text-blue-600 mb-3 group-hover:scale-110 transition-transform" />
            <h4 className="font-semibold text-gray-900 mb-1">Browse Services</h4>
            <p className="text-sm text-gray-600">Find what you need</p>
            <ArrowRightIcon className="w-4 h-4 text-blue-600 mt-2 group-hover:translate-x-1 transition-transform" />
          </Link>

          <button
            onClick={() => setActiveTab('bookings')}
            className="group p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl hover:from-green-100 hover:to-green-200 transition-all duration-200 border border-green-200 text-left"
          >
            <DocumentTextIcon className="w-8 h-8 text-green-600 mb-3 group-hover:scale-110 transition-transform" />
            <h4 className="font-semibold text-gray-900 mb-1">View Bookings</h4>
            <p className="text-sm text-gray-600">Manage bookings</p>
            <ArrowRightIcon className="w-4 h-4 text-green-600 mt-2 group-hover:translate-x-1 transition-transform" />
          </button>

          <Link
            to="/wallet"
            className="group p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl hover:from-purple-100 hover:to-purple-200 transition-all duration-200 border border-purple-200"
          >
            <CreditCardIcon className="w-8 h-8 text-purple-600 mb-3 group-hover:scale-110 transition-transform" />
            <h4 className="font-semibold text-gray-900 mb-1">Wallet</h4>
            <p className="text-sm text-gray-600">Manage payments</p>
            <ArrowRightIcon className="w-4 h-4 text-purple-600 mt-2 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-900 flex items-center">
            <ChartBarIcon className="w-6 h-6 mr-2 text-blue-500" />
            Recent Activity
          </h3>
          <button
            onClick={() => setActiveTab('bookings')}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center"
          >
            View All
            <ArrowRightIcon className="w-4 h-4 ml-1" />
          </button>
        </div>
        {bookings.length === 0 ? (
          <div className="text-center py-12">
            <CalendarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No recent bookings</h3>
            <p className="text-gray-600 mb-6">Start by browsing our services and booking your first service.</p>
            <Link
              to="/services"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Browse Services
              <ArrowRightIcon className="w-4 h-4 ml-2" />
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.slice(0, 3).map((booking) => (
              <div key={booking._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-white rounded-lg shadow-sm">
                    {getStatusIcon(booking.status)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{booking.service?.title || 'Service'}</p>
                    <p className="text-sm text-gray-600 flex items-center mt-1">
                      <CalendarIcon className="w-4 h-4 mr-1" />
                      {new Date(booking.createdAt).toLocaleDateString()} · {booking.provider?.name || 'No provider'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(booking.status)}`}>
                    {getStatusIcon(booking.status)}
                    <span className="ml-1">{getStatusText(booking.status)}</span>
                  </span>
                  <p className="text-sm font-semibold text-gray-900 mt-2">₹{booking.totalAmount || booking.price?.totalPrice || 'N/A'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderBookings = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Bookings</h2>
          <p className="text-gray-600 mt-1">Manage and track all your service bookings</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={fetchBookings}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                Refreshing...
              </>
            ) : (
              <>
                <ArrowTrendingUpIcon className="w-4 h-4 mr-2" />
                Refresh
              </>
            )}
          </button>
          <Link to="/services" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center">
            <CalendarIcon className="w-4 h-4 mr-2" />
            Book New Service
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-lg border border-gray-100">
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-12">
              <CalendarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings yet</h3>
              <p className="text-gray-600 mb-6">Start by browsing our services and booking your first service.</p>
              <Link
                to="/services"
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Browse Services
                <ArrowRightIcon className="w-4 h-4 ml-2" />
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map((booking) => (
                <div key={booking._id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">{booking.service?.title || 'Service'}</h4>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span className="flex items-center">
                          <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                          {booking.service?.category || 'N/A'}
                        </span>
                        {booking.provider && (
                          <span className="flex items-center">
                            <UserIcon className="w-4 h-4 mr-1" />
                            {booking.provider.name}
                          </span>
                        )}
                      </div>
                      {booking.status === 'broadcast' ? (
                        <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                          <p className="text-sm text-purple-800">
                            <BellIcon className="w-4 h-4 inline mr-1" />
                            <span className="font-medium">Broadcast Booking</span> - Waiting for providers to accept
                          </p>
                          <p className="text-xs text-purple-600 mt-1">All nearby providers have been notified</p>
                        </div>
                      ) : booking.provider ? (
                        <div className="mt-3 flex items-center space-x-4 text-sm text-gray-600">
                          <span className="flex items-center">
                            <PhoneIcon className="w-4 h-4 mr-1" />
                            {booking.provider.phone}
                          </span>
                          <span className="flex items-center">
                            <EnvelopeIcon className="w-4 h-4 mr-1" />
                            {booking.provider.email}
                          </span>
                        </div>
                      ) : (
                        <div className="mt-3 text-sm text-gray-600">
                          <span className="flex items-center">
                            <ClockIcon className="w-4 h-4 mr-1" />
                            Provider: Not assigned yet
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <span className={`inline-flex items-center px-3 py-1 text-sm font-semibold rounded-full border ${getStatusColor(booking.status)}`}>
                        {getStatusIcon(booking.status)}
                        <span className="ml-1">{getStatusText(booking.status)}</span>
                      </span>
                      <p className="text-lg font-bold text-gray-900 mt-2">₹{booking.price?.totalPrice || booking.totalAmount || 'N/A'}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
                    <div>
                      <p className="text-gray-600 font-medium mb-1">Scheduled Date</p>
                      <p className="text-gray-900">
                        {new Date(booking.scheduledDate).toLocaleDateString()} at {new Date(booking.scheduledDate).toLocaleTimeString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 font-medium mb-1">Service Address</p>
                      <p className="text-gray-900">
                        {typeof booking.address === 'string' 
                          ? booking.address 
                          : `${booking.address?.street || ''}, ${booking.address?.city || ''}`
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 font-medium mb-1">Booked on</p>
                      <p className="text-gray-900">{new Date(booking.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {booking.notes && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600 font-medium mb-1">Customer Notes:</p>
                      <p className="text-sm text-gray-900">{booking.notes}</p>
                    </div>
                  )}

                  <div className="flex justify-end space-x-3">
                    <Link
                      to={`/tracking/${booking._id}`}
                      className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm flex items-center"
                    >
                      <MapPinIcon className="w-4 h-4 mr-2" />
                      Track Booking
                    </Link>
                    <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm">
                      View Details
                    </button>
                    {booking.status === 'confirmed' && (
                      <button
                        onClick={() => handleCancelBooking(booking._id)}
                        className="px-4 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg hover:bg-red-100 transition-colors font-medium text-sm"
                        disabled={loading}
                      >
                        Cancel Booking
                      </button>
                    )}
                    {booking.status === 'completed' && (
                      <button
                        onClick={() => handleLeaveReview(booking)}
                        className="px-4 py-2 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-lg hover:bg-yellow-100 transition-colors font-medium text-sm flex items-center"
                      >
                        <StarIcon className="w-4 h-4 mr-2" />
                        Leave Review
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderProfile = () => {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Profile Settings</h2>
            <p className="text-gray-600 mt-1">Manage your personal information</p>
          </div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center"
            >
              <UserIcon className="w-4 h-4 mr-2" />
              Edit Profile
            </button>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="ml-4">
              <h3 className="text-xl font-semibold text-gray-900">{user?.name}</h3>
              <p className="text-gray-600">{user?.email}</p>
              <div className="flex items-center mt-1">
                <ShieldCheckIcon className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600">Verified Account</span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  readOnly={!isEditing}
                  disabled={!isEditing}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <input
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  readOnly={!isEditing}
                  disabled={!isEditing}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                <input
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  readOnly={!isEditing}
                  disabled={!isEditing}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                <input
                  type="text"
                  value={profileData.address}
                  onChange={(e) => setProfileData({...profileData, address: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  readOnly={!isEditing}
                  disabled={!isEditing}
                />
              </div>
            </div>
            
            {isEditing && (
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setProfileData({
                      name: user?.name || '',
                      email: user?.email || '',
                      phone: user?.phone || '',
                      address: typeof user?.address === 'string' ? user.address : user?.address?.city || ''
                    });
                  }}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  disabled={profileLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  disabled={profileLoading}
                >
                  {profileLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Account Actions */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Actions</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div>
                <h4 className="font-medium text-gray-900">Change Password</h4>
                <p className="text-sm text-gray-600">Update your account password</p>
              </div>
              <button 
                onClick={() => setShowChangePasswordModal(true)}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
              >
                Change Password
              </button>
            </div>
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div>
                <h4 className="font-medium text-gray-900">Delete Account</h4>
                <p className="text-sm text-gray-600">Permanently delete your account and data</p>
              </div>
              <button 
                onClick={() => setShowDeleteAccountModal(true)}
                className="px-4 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg hover:bg-red-100 transition-colors font-medium text-sm"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSettings = () => {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
            <p className="text-gray-600 mt-1">Manage your preferences and privacy</p>
          </div>
          <button
            onClick={handleSaveSettings}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            disabled={settingsLoading}
          >
            {settingsLoading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Notifications</h3>
          <div className="space-y-4">
            {[
              { key: 'emailNotifications', label: 'Email Notifications', desc: 'Receive booking updates via email' },
              { key: 'smsNotifications', label: 'SMS Notifications', desc: 'Receive booking updates via SMS' },
              { key: 'pushNotifications', label: 'Push Notifications', desc: 'Receive push notifications in browser' },
              { key: 'marketingEmails', label: 'Marketing Emails', desc: 'Receive promotional offers and updates' }
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">{item.label}</h4>
                  <p className="text-sm text-gray-600">{item.desc}</p>
                </div>
                <button
                  onClick={() => setSettings({...settings, [item.key]: !settings[item.key as keyof typeof settings]})}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings[item.key as keyof typeof settings] ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings[item.key as keyof typeof settings] ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Preferences */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Preferences</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
              <select
                value={settings.language}
                onChange={(e) => setSettings({...settings, language: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="en">English</option>
                <option value="hi">हिन्दी (Hindi)</option>
                <option value="bn">বাংলা (Bengali)</option>
                <option value="ta">தமிழ் (Tamil)</option>
                <option value="te">తెలుగు (Telugu)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
              <select
                value={settings.currency}
                onChange={(e) => setSettings({...settings, currency: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="INR">Indian Rupee (₹)</option>
                <option value="USD">US Dollar ($)</option>
                <option value="EUR">Euro (€)</option>
                <option value="GBP">British Pound (£)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Privacy & Security */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Privacy & Security</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div>
                <h4 className="font-medium text-gray-900">Two-Factor Authentication</h4>
                <p className="text-sm text-gray-600">Add an extra layer of security</p>
              </div>
              <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm">
                Enable 2FA
              </button>
            </div>
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div>
                <h4 className="font-medium text-gray-900">Download Your Data</h4>
                <p className="text-sm text-gray-600">Get a copy of all your data</p>
              </div>
              <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm">
                Download Data
              </button>
            </div>
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div>
                <h4 className="font-medium text-gray-900">Privacy Policy</h4>
                <p className="text-sm text-gray-600">Read our privacy policy</p>
              </div>
              <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm">
                View Policy
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'bookings':
        return renderBookings();
      case 'profile':
        return renderProfile();
      case 'settings':
        return renderSettings();
      default:
        return renderOverview();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Navigation Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-1 bg-white rounded-lg shadow-sm p-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    activeTab === item.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        {renderContent()}
      </div>

      {/* Review Modal */}
      {showReviewModal && selectedBooking && (
        <ReviewModal
          isOpen={showReviewModal}
          onClose={() => {
            setShowReviewModal(false);
            setSelectedBooking(null);
          }}
          onSubmit={handleReviewSubmit}
          loading={reviewLoading}
          serviceName={selectedBooking.service?.title}
        />
      )}

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
        onSubmit={handleChangePassword}
        loading={passwordLoading}
      />

      {/* Delete Account Modal */}
      <DeleteAccountModal
        isOpen={showDeleteAccountModal}
        onClose={() => setShowDeleteAccountModal(false)}
        onConfirm={handleDeleteAccount}
        loading={deleteAccountLoading}
      />
    </div>
  );
};

export default Dashboard;
