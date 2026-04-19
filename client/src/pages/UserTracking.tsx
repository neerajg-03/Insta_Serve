// Modern User Tracking Component with Real-time Live Tracking
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { bookingsAPI } from '../services/api';
import socketService, { LocationData } from '../services/socketService';
import toast from 'react-hot-toast';
import LiveTrackingMap from '../components/LiveTrackingMap';
import { calculateTrackingInfo, formatDistance, formatDuration, getCurrentLocation, watchLocation, stopWatchingLocation } from '../utils/geoUtils';
import {
  MapPinIcon,
  PhoneIcon,
  UserIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CalendarIcon,
  CreditCardIcon,
  StarIcon,
  ShieldCheckIcon,
  ChatBubbleLeftIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckSolidIcon, StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import ChatComponent from '../components/ChatComponent';
import razorpayService from '../services/razorpayService';

interface Booking {
  _id: string;
  service: {
    _id: string;
    title: string;
    description: string;
    category: string;
    price: number;
    duration: {
      value: number;
      unit: string;
    };
    images?: string[];
  };
  customer: {
    _id: string;
    name: string;
    email: string;
    phone: string;
    address: string | {
      street: string;
      city: string;
      state: string;
      pincode: string;
    };
  };
  provider?: {
    _id: string;
    name: string;
    email: string;
    phone: string;
    rating?: number;
    totalServices?: number;
    verified?: boolean;
    location?: {
      latitude: number;
      longitude: number;
    };
  } | null;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'broadcast';
  scheduledDate: string;
  scheduledTime: string;
  address: string | {
    street: string;
    city: string;
    state: string;
    pincode: string;
  };
  notes: string;
  totalAmount?: number;
  price?: {
    totalPrice: number;
  };
  createdAt: string;
  updatedAt: string;
  paymentStatus?: 'pending' | 'paid' | 'failed';
}

interface TimelineEvent {
  id: string;
  type: 'booking_created' | 'provider_assigned' | 'service_started' | 'provider_arrived' | 'service_completed';
  title: string;
  description: string;
  timestamp: Date;
  completed: boolean;
}

const UserTracking: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid' | 'failed'>('pending');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  
  // Real-time tracking states
  const [providerLocation, setProviderLocation] = useState<LocationData | null>(null);
  const [customerLocation, setCustomerLocation] = useState<LocationData | null>(null);
  const [trackingInfo, setTrackingInfo] = useState({ distance: 0, duration: 0, unit: 'km' });
  const [isTracking, setIsTracking] = useState(false);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [locationWatchId, setLocationWatchId] = useState<number | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    if (id) {
      fetchBookingDetails();
    }
  }, [id]);

  useEffect(() => {
    // Initialize socket connection and location tracking
    initializeTracking();
    
    return () => {
      cleanup();
    };
  }, [booking, user]);

  const initializeTracking = async () => {
    if (!booking || !user) return;

    try {
      // Connect to socket
      await socketService.connect({
        userId: user._id,
        name: user.name,
        email: user.email,
        role: 'customer'
      });
      
      setSocketConnected(socketService.isConnected());

      // Join booking room for real-time updates
      socketService.joinBookingRoom(booking._id);

      // Set up location update listener
      socketService.onLocationUpdate((data) => {
        if (data.bookingId === booking._id) {
          console.log('Provider location update received:', data.location);
          setProviderLocation(data.location);
          setIsTracking(true);
          
          // Update tracking info
          if (customerLocation) {
            const info = calculateTrackingInfo(data.location, customerLocation);
            setTrackingInfo(info);
          }
        }
      });

      // Set up booking update listener
      socketService.onBookingUpdate((data) => {
        if (data.bookingId === booking._id) {
          console.log('Booking status update:', data);
          setBooking(prev => prev ? { ...prev, status: data.status } : null);
          addTimelineEvent(data.status);
        }
      });

      // Get customer location
      try {
        const location = await getCurrentLocation();
        setCustomerLocation(location);
        
        // Start watching location for updates
        const watchId = watchLocation(
          (newLocation) => {
            setCustomerLocation(newLocation);
            socketService.sendLocationUpdate(newLocation, booking._id);
          },
          (error) => {
            console.error('Location watch error:', error);
            toast.error('Location tracking disabled');
          }
        );
        setLocationWatchId(watchId);
      } catch (error) {
        console.error('Could not get customer location:', error);
        toast.error('Could not access your location');
      }

    } catch (error) {
      console.error('Failed to initialize tracking:', error);
      toast.error('Failed to start live tracking');
    }
  };

  const cleanup = () => {
    if (locationWatchId !== null) {
      stopWatchingLocation(locationWatchId);
      setLocationWatchId(null);
    }
    
    socketService.leaveBookingRoom(booking?._id || '');
    socketService.off('location_update');
    socketService.off('booking_update');
  };

  const fetchBookingDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching booking details for ID:', id);
      const response = await bookingsAPI.getBooking(id!);
      
      let bookingData = null;
      if (response?.booking) {
        bookingData = response.booking;
      } else if (response) {
        bookingData = response;
      }
      
      if (bookingData) {
        setBooking(bookingData);
        if (bookingData.paymentStatus) {
          setPaymentStatus(bookingData.paymentStatus);
        }
        initializeTimeline(bookingData);
        console.log('Successfully loaded real booking data');
      } else {
        throw new Error('Booking not found or invalid response format');
      }
    } catch (error: any) {
      console.error('Error fetching booking details:', error);
      
      if (error.response?.status === 404) {
        setError('Booking not found. The booking ID may not exist in the database.');
      } else if (error.response?.status === 403 || error.response?.status === 401) {
        setError('Authentication required. Please log in again.');
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else {
        setError(error.response?.data?.message || error.message || 'Failed to fetch booking details');
      }
      
      toast.error('Failed to load booking details');
    } finally {
      setLoading(false);
    }
  };

  const initializeTimeline = (bookingData: Booking) => {
    const events: TimelineEvent[] = [
      {
        id: '1',
        type: 'booking_created',
        title: 'Booking Created',
        description: 'Service request submitted successfully',
        timestamp: new Date(bookingData.createdAt),
        completed: true
      }
    ];

    if (bookingData.status !== 'broadcast' && bookingData.provider) {
      events.push({
        id: '2',
        type: 'provider_assigned',
        title: 'Provider Assigned',
        description: `${bookingData.provider.name} has been assigned to your service`,
        timestamp: new Date(bookingData.updatedAt),
        completed: true
      });
    }

    if (bookingData.status === 'in_progress') {
      events.push({
        id: '3',
        type: 'service_started',
        title: 'Service Started',
        description: 'Provider has started working on your service',
        timestamp: new Date(),
        completed: true
      });
    }

    setTimelineEvents(events);
  };

  const addTimelineEvent = (status: string) => {
    const newEvent: TimelineEvent = {
      id: Date.now().toString(),
      type: status as any,
      title: getStatusText(status),
      description: getStatusDescription(status),
      timestamp: new Date(),
      completed: true
    };

    setTimelineEvents(prev => [...prev, newEvent]);
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'confirmed': return 'Confirmed';
      case 'in_progress': return 'In Progress';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      case 'broadcast': return 'Finding Provider';
      default: return 'Unknown';
    }
  };

  const getStatusDescription = (status: string) => {
    switch (status) {
      case 'pending': return 'Your booking is pending confirmation';
      case 'confirmed': return 'Provider has confirmed your booking';
      case 'in_progress': return 'Provider is currently working on your service';
      case 'completed': return 'Service has been completed successfully';
      case 'cancelled': return 'Booking has been cancelled';
      case 'broadcast': return 'Searching for available providers';
      default: return 'Status updated';
    }
  };

  const handleContactProvider = () => {
    if (booking?.provider?.phone) {
      window.location.href = `tel:${booking.provider.phone}`;
    }
  };

  const handleNavigateToLocation = () => {
    if (booking?.address) {
      const addressString = typeof booking.address === 'string' 
        ? booking.address 
        : `${booking.address?.street || ''}, ${booking.address?.city || ''}, ${booking.address?.state || ''} - ${booking.address?.pincode || ''}`;
      
      const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addressString)}&travelmode=driving`;
      window.open(url, '_blank');
    }
  };

  const handlePayNow = async () => {
    if (!booking) return;
    
    try {
      setProcessingPayment(true);
      
      // Load Razorpay script
      await razorpayService.loadRazorpayScript();
      
      // Process payment with Razorpay
      const paymentOptions = {
        amount: booking?.totalAmount || booking?.price?.totalPrice || 0,
        currency: 'INR',
        receipt: `receipt_${booking?._id}`,
        notes: {
          bookingId: booking?._id,
          serviceTitle: booking?.service?.title || 'Service',
          customerName: user?.name || 'Customer'
        },
        bookingId: booking?._id,
        customerName: user?.name || 'Customer',
        customerEmail: user?.email || '',
        customerPhone: user?.phone || ''
      };
      
      const response = await razorpayService.processPayment(paymentOptions);
      
      setPaymentStatus('paid');
      toast.success('Payment processed successfully!');
      setShowPaymentModal(false);
      
      // Update booking details
      fetchBookingDetails();
    } catch (error: any) {
      setPaymentStatus('failed');
      toast.error(error.message || 'Payment processing failed');
    } finally {
      setProcessingPayment(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'confirmed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_progress': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      case 'broadcast': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <ClockIcon className="w-5 h-5" />;
      case 'confirmed': return <CheckCircleIcon className="w-5 h-5" />;
      case 'in_progress': return <MapPinIcon className="w-5 h-5" />;
      case 'completed': return <CheckSolidIcon className="w-5 h-5" />;
      case 'cancelled': return <ExclamationTriangleIcon className="w-5 h-5" />;
      case 'broadcast': return <ClockIcon className="w-5 h-5" />;
      default: return <ClockIcon className="w-5 h-5" />;
    }
  };

  const formatAddress = (address: string | any) => {
    if (typeof address === 'string') return address;
    if (typeof address === 'object' && address !== null) {
      return `${address.street || ''}, ${address.city || ''}, ${address.state || ''} - ${address.pincode || ''}`;
    }
    return 'Address not available';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <ExclamationTriangleIcon className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error || 'Booking not found'}</p>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Dashboard
            </button>
            <button
              onClick={fetchBookingDetails}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center mb-2">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="mr-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <ArrowRightIcon className="w-5 h-5 rotate-180" />
                </button>
                <h1 className="text-3xl font-bold">Live Service Tracking</h1>
              </div>
              <p className="text-blue-100">Booking ID: #{booking._id.slice(-8)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-blue-100 mb-1">Connection Status</p>
              <span className={`inline-flex items-center px-3 py-1 text-sm font-semibold rounded-full ${
                socketConnected ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
              }`}>
                <div className={`w-2 h-2 rounded-full mr-2 ${socketConnected ? 'bg-white' : 'bg-white animate-pulse'}`}></div>
                {socketConnected ? 'CONNECTED' : 'DISCONNECTED'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Live Tracking Map */}
            {booking?.status && (booking.status === 'in_progress' || booking.status === 'confirmed') && (
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-6">
                  <h2 className="text-2xl font-bold mb-4 flex items-center">
                    <MapPinIcon className="w-6 h-6 mr-2" />
                    Live Provider Tracking
                  </h2>
                  
                  {isTracking && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white/20 rounded-xl p-4">
                        <p className="text-purple-100 text-sm mb-1">Distance</p>
                        <p className="font-semibold text-lg">{formatDistance(trackingInfo.distance)}</p>
                        <p className="text-purple-100 text-sm">From your location</p>
                      </div>
                      <div className="bg-white/20 rounded-xl p-4">
                        <p className="text-purple-100 text-sm mb-1">ETA</p>
                        <p className="font-semibold text-lg">{formatDuration(trackingInfo.duration)}</p>
                        <p className="text-purple-100 text-sm">Estimated arrival</p>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Live Map */}
                <div className="p-6">
                  <LiveTrackingMap
                    providerLocation={providerLocation}
                    customerLocation={customerLocation}
                    isProvider={false}
                    bookingId={booking._id}
                  />
                  
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <button
                      onClick={handleNavigateToLocation}
                      className="px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium flex items-center justify-center"
                    >
                      <MapPinIcon className="w-4 h-4 mr-2" />
                      Get Directions
                    </button>
                    <button
                      onClick={handleContactProvider}
                      className="px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium flex items-center justify-center"
                    >
                      <PhoneIcon className="w-4 h-4 mr-2" />
                      Call Provider
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Service Status Card */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6">
                <h2 className="text-2xl font-bold mb-4">Service Status</h2>
                
                {booking?.status === 'broadcast' && (
                  <div className="flex items-center">
                    <div className="animate-pulse">
                      <ClockIcon className="w-8 h-8 mr-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-lg">Waiting for Provider</p>
                      <p className="text-blue-100">Your service request has been broadcast to nearby providers</p>
                    </div>
                  </div>
                )}
                
                {booking?.status === 'confirmed' && (
                  <div className="flex items-center">
                    <CheckCircleIcon className="w-8 h-8 mr-4" />
                    <div>
                      <p className="font-semibold text-lg">Provider Confirmed</p>
                      <p className="text-blue-100">A provider has accepted your request and is on the way</p>
                    </div>
                  </div>
                )}
                
                {booking?.status === 'in_progress' && (
                  <div className="flex items-center">
                    <div className="animate-pulse">
                      <MapPinIcon className="w-8 h-8 mr-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-lg">Service In Progress</p>
                      <p className="text-blue-100">Provider is currently working on your service</p>
                    </div>
                  </div>
                )}
                
                {booking?.status === 'completed' && (
                  <div className="flex items-center">
                    <CheckSolidIcon className="w-8 h-8 mr-4" />
                    <div>
                      <p className="font-semibold text-lg">Service Completed</p>
                      <p className="text-blue-100">Your service has been completed successfully</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Service Details */}
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Service</p>
                    <p className="font-semibold text-gray-900">{booking.service?.title || 'Service'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Scheduled Date</p>
                    <p className="font-semibold text-gray-900">
                      {booking.scheduledDate ? new Date(booking.scheduledDate).toLocaleDateString() : 'Not scheduled'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Service Address</p>
                    <p className="font-semibold text-gray-900 text-sm">
                      {formatAddress(booking.address)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Amount</p>
                    <p className="font-semibold text-gray-900">¥{booking.totalAmount || booking.price?.totalPrice || 0}</p>
                  </div>
                </div>

                {/* Payment Status */}
                <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <CreditCardIcon className="w-5 h-5 mr-2 text-gray-600" />
                      <div>
                        <p className="text-sm text-gray-600">Payment Status</p>
                        <p className="font-semibold">
                          {paymentStatus === 'pending' && <span className="text-yellow-600">Pending</span>}
                          {paymentStatus === 'paid' && <span className="text-green-600">Paid</span>}
                          {paymentStatus === 'failed' && <span className="text-red-600">Failed</span>}
                        </p>
                      </div>
                    </div>
                    {paymentStatus === 'pending' && (
                      <button
                        onClick={() => setShowPaymentModal(true)}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                      >
                        Pay Now
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Provider Information */}
            {booking.provider && (
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                  <UserIcon className="w-5 h-5 mr-2 text-blue-500" />
                  Provider Information
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                      <UserIcon className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{booking.provider.name}</p>
                      {booking.provider.verified && (
                        <div className="flex items-center text-sm text-green-600">
                          <ShieldCheckIcon className="w-4 h-4 mr-1" />
                          Verified Provider
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-3 pt-4 border-t">
                    <div className="flex items-center text-sm">
                      <PhoneIcon className="w-4 h-4 mr-2 text-gray-400" />
                      <span className="text-gray-600">{booking.provider.phone}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <span className="w-4 h-4 mr-2 text-gray-400">@</span>
                      <span className="text-gray-600 text-xs">{booking.provider.email}</span>
                    </div>
                    {booking.provider.rating && (
                      <div className="flex items-center text-sm">
                        <StarSolidIcon className="w-4 h-4 mr-1 text-yellow-500" />
                        <span className="text-gray-600">{booking.provider.rating} rating</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <button
                    onClick={handleContactProvider}
                    className="w-full px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium flex items-center justify-center"
                  >
                    <PhoneIcon className="w-4 h-4 mr-2" />
                    Call Provider
                  </button>
                  <button
                    onClick={() => setShowChat(true)}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium flex items-center justify-center"
                  >
                    <ChatBubbleLeftIcon className="w-4 h-4 mr-2" />
                    Chat with Provider
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Service Details */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                <CalendarIcon className="w-5 h-5 mr-2 text-blue-500" />
                Service Details
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Service</p>
                  <p className="font-medium text-gray-900">{booking.service?.title || 'Service'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Category</p>
                  <p className="font-medium text-gray-900">
                    {booking.service?.category?.replace(/_/g, ' ')?.replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Duration</p>
                  <p className="font-medium text-gray-900">
                    {booking.service?.duration?.value || 'N/A'} {booking.service?.duration?.unit || ''}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Price</p>
                  <p className="font-medium text-gray-900">¥{booking.service?.price || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Live Timeline */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                <ClockIcon className="w-5 h-5 mr-2 text-blue-500" />
                Live Timeline
              </h3>
              <div className="space-y-4">
                {timelineEvents.map((event, index) => (
                  <div key={event.id} className="flex items-start">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 mt-0.5 ${
                      event.completed ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      {event.completed ? (
                        <CheckSolidIcon className="w-4 h-4 text-green-600" />
                      ) : (
                        <div className="w-4 h-4 bg-gray-400 rounded-full animate-pulse"></div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{event.title}</p>
                      <p className="text-sm text-gray-600">{event.description}</p>
                      <p className="text-xs text-gray-500">{event.timestamp.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
                
                {booking?.status === 'in_progress' && (
                  <div className="flex items-start">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                      <div className="w-4 h-4 bg-purple-600 rounded-full animate-pulse"></div>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Service In Progress</p>
                      <p className="text-sm text-gray-600">Provider is currently working on your service</p>
                      <p className="text-xs text-gray-500">{new Date().toLocaleString()}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            {booking.notes && (
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <ExclamationTriangleIcon className="w-5 h-5 mr-2 text-yellow-500" />
                  Notes
                </h3>
                <p className="text-gray-700 bg-gray-50 p-4 rounded-xl">{booking.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Complete Payment</h3>
            <p className="text-gray-600 mb-6">
              Complete the payment to confirm your booking
            </p>
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Amount:</span>
                <span className="text-2xl font-bold text-gray-900">
                  ¥{booking.totalAmount || booking.price?.totalPrice || 0}
                </span>
              </div>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handlePayNow}
                disabled={processingPayment}
                className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium disabled:opacity-50"
              >
                {processingPayment ? 'Processing...' : 'Pay Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Component */}
      {booking && booking.provider && (
        <ChatComponent
          bookingId={booking._id}
          recipientId={booking.provider._id}
          recipientName={booking.provider.name}
          isOpen={showChat}
          onClose={() => setShowChat(false)}
          isProvider={false}
        />
      )}
    </div>
  );
};

export default UserTracking;
