import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { bookingsAPI } from '../services/api';
import LocationService, { Location, GoogleMapsDistanceResult } from '../services/locationService';
import SocketService, { LocationData, BookingUpdate, ChatMessage } from '../services/socketService';
import PaymentService from '../services/paymentService';
import toast from 'react-hot-toast';
// Temporarily using inline components to fix compilation
// import CustomerTrackingView from '../components/booking/CustomerTrackingView';
import ProviderTrackingView from '../components/booking/ProviderTrackingView';

// Professional CustomerTrackingView matching ProviderTrackingView design
const ProfessionalCustomerTrackingView: React.FC<any> = ({
  booking,
  currentLocation,
  providerLocation,
  distance,
  estimatedArrival,
  connectionStatus,
  isTracking,
  onContactProvider,
  onNavigateToLocation,
  onPayNow,
  onManualLocationUpdate,
  paymentStatus,
  trackingUpdates,
  getStatusIcon,
  googleMapsData
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-purple-100 text-purple-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatAddress = (address: string | any) => {
    if (typeof address === 'string') return address;
    if (typeof address === 'object' && address !== null) {
      return `${address.street || ''}, ${address.city || ''}, ${address.state || ''} - ${address.pincode || ''}`;
    }
    return 'Address not available';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Service Tracking</h1>
              <p className="text-blue-100">Booking ID: #{booking?._id?.slice(-8)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-blue-100">Current Status</p>
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(booking?.status)}`}>
                {getStatusIcon(booking?.status)} {booking?.status?.replace('_', ' ').toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Tracking Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Live Status Card */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6">
                <h2 className="text-xl font-bold mb-2">Live Status</h2>
                
                {booking?.status === 'broadcast' && (
                  <div className="flex items-center">
                    <span className="text-3xl mr-3">ð¢</span>
                    <div>
                      <p className="font-semibold">Finding Providers</p>
                      <p className="text-blue-100">Broadcasting your request to nearby providers...</p>
                    </div>
                  </div>
                )}
                
                {booking?.status === 'confirmed' && (
                  <div className="flex items-center">
                    <span className="text-3xl mr-3">â</span>
                    <div>
                      <p className="font-semibold">Provider Confirmed!</p>
                      <p className="text-blue-100">Your service has been accepted</p>
                    </div>
                  </div>
                )}
                
                {booking?.status === 'in_progress' && (
                  <div className="flex items-center">
                    <div className="animate-pulse">
                      <span className="text-3xl mr-3">ð</span>
                    </div>
                    <div>
                      <p className="font-semibold">Provider is on the way!</p>
                      <p className="text-blue-100">
                        {distance ? `${distance.toFixed(1)} km away` : 'Tracking location...'}
                        {estimatedArrival && ` â¢ ETA: ${estimatedArrival}`}
                      </p>
                    </div>
                  </div>
                )}
                
                {booking?.status === 'completed' && (
                  <div className="flex items-center">
                    <span className="text-3xl mr-3">ð</span>
                    <div>
                      <p className="font-semibold">Service Completed!</p>
                      <p className="text-blue-100">Thank you for using InstaServe</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Service Details */}
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Service</p>
                    <p className="font-semibold text-gray-900">{booking?.service?.title}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Scheduled Date</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(booking?.scheduledDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Service Address</p>
                    <p className="font-semibold text-gray-900 text-sm">
                      {formatAddress(booking?.address)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Amount</p>
                    <p className="font-semibold text-gray-900">â¹{booking?.totalAmount || booking?.price?.totalPrice || 0}</p>
                  </div>
                </div>

                {/* Payment Status */}
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Payment Status</p>
                      <p className="font-semibold">
                        {paymentStatus === 'pending' && <span className="text-yellow-600">â³ Pending</span>}
                        {paymentStatus === 'paid' && <span className="text-green-600">â Paid</span>}
                        {paymentStatus === 'failed' && <span className="text-red-600">â Failed</span>}
                      </p>
                    </div>
                    {paymentStatus === 'pending' && (
                      <button
                        onClick={onPayNow}
                        className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        â³ Pay Now
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Live Tracking Map */}
            {booking?.status === 'in_progress' && booking?.provider && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">📍 Live Tracking</h2>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <div className={`w-2 h-2 rounded-full mr-2 ${
                        connectionStatus === 'CONNECTED' ? 'bg-green-500' : 'bg-red-500'
                      }`}></div>
                      <span className="text-sm text-gray-600">
                        {connectionStatus === 'CONNECTED' ? 'Live' : 'Offline'}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Location Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">📍 Your Location</h4>
                    {currentLocation ? (
                      <div className="text-sm text-blue-700">
                        <p>Lat: {currentLocation.lat.toFixed(6)}</p>
                        <p>Lng: {currentLocation.lng.toFixed(6)}</p>
                        <p>Updated: {new Date(currentLocation.timestamp).toLocaleTimeString()}</p>
                      </div>
                    ) : (
                      <p className="text-blue-600">Getting location...</p>
                    )}
                  </div>
                  
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-semibold text-green-900 mb-2">📍 Provider Location</h4>
                    {providerLocation ? (
                      <div className="text-sm text-green-700">
                        <p>Lat: {providerLocation.lat.toFixed(6)}</p>
                        <p>Lng: {providerLocation.lng.toFixed(6)}</p>
                        <p>Updated: {new Date(providerLocation.timestamp).toLocaleTimeString()}</p>
                      </div>
                    ) : (
                      <p className="text-green-600">Waiting for provider location...</p>
                    )}
                  </div>
                </div>

                {/* Distance & ETA */}
                {googleMapsData && (
                  <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold text-gray-900">Distance & ETA</h4>
                        <p className="text-sm text-gray-600">
                          📍 Provider is {googleMapsData.distance.text} away
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-orange-600">
                          🕒 {googleMapsData.duration.text}
                        </p>
                        <p className="text-sm text-gray-600">Estimated arrival</p>
                      </div>
                    </div>
                    {googleMapsData.status === 'FALLBACK' && (
                      <p className="text-xs text-yellow-600 mt-2">⚠️ Using approximate distance calculation</p>
                    )}
                  </div>
                )}

                {/* Map Placeholder */}
                <div className="bg-gray-100 rounded-lg h-64 flex items-center justify-center relative overflow-hidden">
                  <div className="absolute top-4 left-4 bg-white rounded shadow p-2 z-10">
                    <p className="text-xs font-medium">Live Map View</p>
                    <p className="text-xs text-gray-600">Real-time tracking</p>
                  </div>
                  
                  {currentLocation && providerLocation ? (
                    <div className="text-center">
                      <span className="text-4xl mb-2 block">📍</span>
                      <p className="text-gray-600">Map rendering with provider location</p>
                      <p className="text-sm text-gray-500 mt-2">
                          📍 Provider is {googleMapsData?.distance.text || `${distance?.toFixed(1)} km`} away
                      </p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <span className="text-4xl mb-2 block">📍</span>
                      <p className="text-gray-600">Waiting for location data...</p>
                      {googleMapsData && (
                        <p className="text-sm text-gray-500 mt-2">
                          ð {googleMapsData.distance.text} away
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Timeline */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">ð Service Timeline</h2>
              <div className="space-y-4">
                {trackingUpdates?.map((update: any, index: number) => (
                  <div key={update._id} className="flex items-start">
                    <div className="flex-shrink-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        index === trackingUpdates.length - 1 ? 'bg-blue-600 text-white' : 'bg-gray-300'
                      }`}>
                        {getStatusIcon(update.status)}
                      </div>
                    </div>
                    <div className="ml-4 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-900">{update.message}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(update.timestamp).toLocaleString()}
                        </p>
                      </div>
                      {update.location && (
                        <p className="text-sm text-gray-600 mt-1">ð {update.location}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Provider Information */}
            {booking?.provider && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">ð¨â§ Provider Information</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-medium text-gray-900">{booking.provider.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="font-medium text-gray-900">{booking.provider.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium text-gray-900 text-sm">{booking.provider.email}</p>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <button
                    onClick={onContactProvider}
                    className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    ð Call Provider
                  </button>
                  <button
                    onClick={onNavigateToLocation}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    ð Navigate to Location
                  </button>
                </div>
              </div>
            )}

            {/* Broadcast Status */}
            {!booking?.provider && booking?.status === 'broadcast' && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">ð¢ Broadcast Status</h3>
                <div className="text-center py-4">
                  <span className="text-4xl mb-3 block">ð¡</span>
                  <p className="text-gray-600 mb-2">Finding Available Providers</p>
                  <p className="text-sm text-gray-500">Your request has been sent to nearby providers</p>
                  <div className="mt-4">
                    <div className="animate-pulse bg-blue-100 rounded-lg p-3">
                      <p className="text-blue-700 text-sm">â³ Waiting for provider acceptance...</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Service Details */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">ð¡ Service Details</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Service</p>
                  <p className="font-medium text-gray-900">{booking?.service?.title || 'Service'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Category</p>
                  <p className="font-medium text-gray-900">
                    {booking?.service?.category?.replace(/_/g, ' ')?.replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Duration</p>
                  <p className="font-medium text-gray-900">
                    {booking?.service?.duration?.value || 'N/A'} {booking?.service?.duration?.unit || ''}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Price</p>
                  <p className="font-medium text-gray-900">â¹{booking?.service?.price || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Debug Controls */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">ð Debug Controls</h3>
              <div className="space-y-2">
                <button
                  onClick={onManualLocationUpdate}
                  className="w-full bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
                >
                  ð Send Location Update
                </button>
                <div className="text-xs text-gray-600">
                  <p>Connection: {connectionStatus}</p>
                  <p>Tracking: {isTracking ? 'Active' : 'Inactive'}</p>
                </div>
              </div>
            </div>

            {/* Notes */}
            {booking?.notes && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">ð Notes</h3>
                <p className="text-gray-700 bg-gray-50 p-3 rounded">{booking.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

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
    address: string | {
      street: string;
      city: string;
      state: string;
      pincode: string;
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
  tracking: {
    currentLocation?: string;
    estimatedArrival?: string;
    providerLocation?: {
      lat: number;
      lng: number;
    };
    customerLocation?: {
      lat: number;
      lng: number;
    };
    distance?: number;
  };
}

interface TrackingUpdate {
  _id: string;
  booking: string;
  status: string;
  message: string;
  timestamp: string;
  location?: string;
}

const BookingTracking: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  
  const [booking, setBooking] = useState<Booking | null>(null);
  const [trackingUpdates, setTrackingUpdates] = useState<TrackingUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [providerLocation, setProviderLocation] = useState<Location | null>(null);
  const [customerLocation, setCustomerLocation] = useState<Location | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [estimatedArrival, setEstimatedArrival] = useState<string>('');
  const [googleMapsData, setGoogleMapsData] = useState<GoogleMapsDistanceResult | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('DISCONNECTED');
  
  // Payment states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid' | 'failed'>('pending');
  
  // Chat states
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  
  // Map and refs
  const mapRef = useRef<HTMLDivElement>(null);
  const socketConnected = useRef(false);

  useEffect(() => {
    console.log('BookingTracking component mounted with ID:', id);
    fetchBookingDetails();
    fetchTrackingUpdates();
    
    return () => {
      // Cleanup
      LocationService.stopLocationTracking();
      if (id) {
        SocketService.leaveBookingRoom(id);
      }
      SocketService.disconnect();
      setIsTracking(false);
    };
  }, [id]);

  // Separate effect for initializing real-time tracking after booking is loaded
  useEffect(() => {
    if (booking && user && !isTracking) {
      console.log('ð [EFFECT] Booking data available, initializing real-time tracking');
      initializeRealTimeTracking();
    }
  }, [booking, user, isTracking]);

  const initializeRealTimeTracking = async () => {
    try {
      if (!user) {
        console.warn('No user found for real-time tracking');
        return;
      }

      console.log('ð [INIT] Starting real-time tracking initialization');

      // First, get user's current location
      const location = await LocationService.getCurrentLocation();
      setCurrentLocation(location);
      console.log('ð [INIT] Current location obtained:', location);

      // Connect to Socket.IO
      console.log('ð [INIT] Connecting to Socket.IO...');
      await SocketService.connect({
        userId: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      });

      socketConnected.current = true;
      setConnectionStatus('CONNECTED');
      console.log('ð [INIT] Socket.IO connected successfully');

      // Set up Socket.IO event listeners BEFORE starting location tracking
      SocketService.onLocationUpdate(handleLocationUpdate);
      SocketService.onBookingUpdate(handleBookingStatusUpdate);
      SocketService.onChatMessage(handleChatMessage);
      console.log('ð [INIT] Socket.IO event listeners set up');

      // Join booking room for targeted location sharing
      if (id && booking) {
        console.log('ð [INIT] Joining booking room:', id);
        SocketService.joinBookingRoom(id);
        
        // Wait a moment for room to be joined
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Start location tracking AFTER everything else is set up
      console.log('ð [INIT] Starting location tracking...');
      await LocationService.startLocationTracking((newLocation) => {
        setCurrentLocation(newLocation);
        
        // Send location update to server
        if (booking && user) {
          console.log('ð [LOCATION] Sending location update:', {
            userRole: user.role,
            userId: user._id,
            bookingId: booking._id,
            location: newLocation,
            socketConnected: SocketService.isConnected()
          });
          SocketService.sendLocationUpdate(newLocation, booking._id);
        } else {
          console.warn('ð [LOCATION] Not sending location update - missing data:', {
            hasBooking: !!booking,
            hasUser: !!user
          });
        }
      });
      
      setIsTracking(true);
      console.log('ð [INIT] Real-time tracking initialization completed');

      // Add connection monitoring
      const checkConnection = setInterval(() => {
        if (!SocketService.isConnected()) {
          console.warn('ð [MONITOR] Socket connection lost, attempting reconnection...');
          setConnectionStatus('DISCONNECTED');
          // Don't clear interval here, let it keep trying
        } else {
          setConnectionStatus('CONNECTED');
        }
      }, 5000);

      // Cleanup interval on unmount
      return () => clearInterval(checkConnection);

      } catch (error) {
      console.error('Error initializing location tracking:', error);
      setConnectionStatus('ERROR');
      
      // Type guard for error handling
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Show user-friendly error message
      if (errorMessage.includes('Server connection failed')) {
        toast.error('Unable to connect to server. Please check your internet connection and try again.');
      } else if (errorMessage.includes('Authentication')) {
        toast.error('Authentication failed. Please login again.');
      } else {
        toast.error('Failed to enable real-time tracking. Some features may not work.');
      }
    }
  };

  const handleLocationUpdate = async (data: any) => {
    console.log('ð [DEBUG] ===== LOCATION UPDATE RECEIVED =====');
    console.log('ð [DEBUG] Full data object:', JSON.stringify(data, null, 2));
    console.log('ð [DEBUG] Current booking ID:', id);
    console.log('ð [DEBUG] Data booking ID:', data.bookingId);
    console.log('ð [DEBUG] User role:', user?.role);
    console.log('ð [DEBUG] User ID:', user?._id);
    console.log('ð [DEBUG] Booking data:', booking ? 'Available' : 'Not available');
    console.log('ð [DEBUG] Has providerId:', !!data.providerId);
    console.log('ð [DEBUG] Has customerId:', !!data.customerId);
    console.log('ð [DEBUG] Has userId:', !!data.userId);
    console.log('ð [DEBUG] Provider ID in data:', data.providerId);
    console.log('ð [DEBUG] Customer ID in data:', data.customerId);
    console.log('ð [DEBUG] User ID in data:', data.userId);
    console.log('ð [DEBUG] Booking provider ID:', booking?.provider?._id);
    console.log('ð [DEBUG] Booking customer ID:', booking?.customer?._id);
    
    // Filter by bookingId if present (for targeted updates)
    if (data.bookingId && data.bookingId !== id) {
      console.log('ð [DEBUG] Ignoring location update for different booking:', data.bookingId);
      return;
    }
    
    // Handle missing booking data gracefully
    if (!booking) {
      console.warn('â [DEBUG] No booking data available, cannot process location update');
      return;
    }
    
    let locationUpdated = false;
    let newProviderLocation: Location | null = null;
    let newCustomerLocation: Location | null = null;
    
    // Handle provider location updates
    if (data.providerId && user) {
      console.log('ð [DEBUG] Processing provider location update');
      console.log('ð [DEBUG] User role:', user.role);
      console.log('ð [DEBUG] Data providerId:', data.providerId);
      console.log('ð [DEBUG] Booking providerId:', booking?.provider?._id);
      console.log('ð [DEBUG] User ID:', user._id);
      console.log('ð [DEBUG] Provider match:', data.providerId === booking?.provider?._id);
      console.log('ð [DEBUG] Self match:', data.providerId === user._id);
      
      if (user.role === 'customer' && data.providerId === booking?.provider?._id) {
        // Customer receiving provider location
        console.log('ð [SUCCESS] Customer should receive provider location');
        newProviderLocation = {
          lat: data.location.lat,
          lng: data.location.lng,
          timestamp: data.timestamp
        };
        setProviderLocation(newProviderLocation);
        console.log('ð [SUCCESS] Provider location set:', newProviderLocation);
        locationUpdated = true;
      } else if (user?.role === 'provider' && data.providerId === user._id) {
        // Provider receiving their own location (echo)
        console.log('ð [DEBUG] Provider received own location echo');
      } else {
        console.log('ð [DEBUG] Provider location update not matching conditions');
      }
    }
    
    // Handle customer location updates
    if (data.customerId && user) {
      console.log('ð [DEBUG] Processing customer location update');
      console.log('ð [DEBUG] User role:', user.role);
      console.log('ð [DEBUG] Data customerId:', data.customerId);
      console.log('ð [DEBUG] Booking customerId:', booking?.customer?._id);
      console.log('ð [DEBUG] User ID:', user._id);
      console.log('ð [DEBUG] Customer match:', data.customerId === booking?.customer?._id);
      console.log('ð [DEBUG] Self match:', data.customerId === user._id);
      
      if (user.role === 'provider' && data.customerId === booking?.customer?._id) {
        // Provider receiving customer location
        console.log('ð [SUCCESS] Provider should receive customer location');
        newCustomerLocation = {
          lat: data.location.lat,
          lng: data.location.lng,
          timestamp: data.timestamp
        };
        setCustomerLocation(newCustomerLocation);
        console.log('ð [SUCCESS] Customer location set:', newCustomerLocation);
        locationUpdated = true;
      } else if (user?.role === 'customer' && data.customerId === user._id) {
        // Customer receiving their own location (echo)
        console.log('ð [DEBUG] Customer received own location echo');
      } else {
        console.log('ð [DEBUG] Customer location update not matching conditions');
      }
    }
    
    // Also handle generic location_update for backward compatibility
    if (data.userId && !data.providerId && !data.customerId) {
      const location: Location = {
        lat: data.location.lat,
        lng: data.location.lng,
        timestamp: data.timestamp
      };
      
      if (data.userId === booking?.provider?._id && user?.role === 'customer') {
        setProviderLocation(location);
        console.log('Customer received provider location (fallback):', location);
        locationUpdated = true;
      } else if (data.userId === booking?.customer?._id && user?.role === 'provider') {
        setCustomerLocation(location);
        console.log('Provider received customer location (fallback):', location);
        locationUpdated = true;
      }
    }
    
    // Calculate distance if both locations are available and location was updated
    if (locationUpdated) {
      // Use newly updated locations
      const userLocation = user?.role === 'customer' ? currentLocation : providerLocation;
      const targetLocation = user?.role === 'customer' ? newProviderLocation || providerLocation : newCustomerLocation || customerLocation;
      
      if (userLocation && targetLocation) {
        try {
          // Use Google Maps API for accurate distance and time
          const googleResult = await LocationService.calculateDistanceWithGoogleMaps(userLocation, targetLocation);
          setGoogleMapsData(googleResult);
          
          // Update distance and ETA with Google Maps data
          const distanceKm = googleResult.distance.value / 1000; // Convert meters to km
          setDistance(distanceKm);
          setEstimatedArrival(googleResult.duration.text);
        } catch (error) {
          console.error('Error calculating distance with Google Maps:', error);
          // Fallback to Haversine calculation
          const dist = LocationService.calculateDistance(userLocation, targetLocation);
          setDistance(dist);
          
          const eta = LocationService.calculateETA(dist);
          setEstimatedArrival(`${Math.round(eta)} minutes`);
        }
      }
    }
  };

  const handleBookingStatusUpdate = (update: BookingUpdate) => {
    if (update.bookingId === id) {
      // Update booking status
      if (booking) {
        setBooking(prev => prev ? { ...prev, status: update.status as any } : null);
      }
      
      // Add to tracking updates
      setTrackingUpdates(prev => [...prev, {
        _id: Date.now().toString(),
        booking: update.bookingId,
        status: update.status,
        message: update.message || `Status updated to ${update.status}`,
        timestamp: update.timestamp.toString()
      }]);
      
      toast.success(`Booking status: ${update.status}`);
    }
  };

  const handleChatMessage = (message: any) => {
    if (message.bookingId === id) {
      setChatMessages(prev => [...prev, message]);
    }
  };

  // Payment functions
  const handlePayment = async () => {
    if (!booking) return;
    
    try {
      setProcessingPayment(true);
      
      const result = await PaymentService.processPayment(
        booking._id,
        booking.totalAmount || booking.price?.totalPrice || 0
      );
      
      if (result.success) {
        setPaymentStatus('paid');
        setShowPaymentModal(false);
        toast.success('Payment successful!');
        
        // Update booking status
        setBooking(prev => prev ? { ...prev, status: 'confirmed' } : null);
      } else {
        setPaymentStatus('failed');
        toast.error(result.error || 'Payment failed');
      }
    } catch (error) {
      setPaymentStatus('failed');
      toast.error('Payment processing failed');
    } finally {
      setProcessingPayment(false);
    }
  };

  // Chat functions
  const sendMessage = () => {
    if (!newMessage.trim() || !booking || !user) return;
    
    const recipientId = user?.role === 'customer' 
      ? booking.provider?._id 
      : booking.customer._id;
    
    if (!recipientId) return;
    
    SocketService.sendChatMessage({
      id: Date.now().toString(),
      bookingId: booking._id,
      senderId: user._id,
      senderName: user.name,
      recipientId,
      recipientName: user?.role === 'customer' ? booking.provider?.name || 'Provider' : booking.customer.name || 'Customer',
      message: newMessage.trim(),
      timestamp: new Date(),
      type: 'text'
    });
    
    setNewMessage('');
  };

  const handleBookingAction = async (action: 'cancel' | 'reschedule' | 'complete' | 'in_progress') => {
    if (!booking) return;
    
    try {
      let endpoint = '';
      let message = '';
      
      switch (action) {
        case 'cancel':
          endpoint = `/bookings/${booking._id}/cancel`;
          message = 'Booking cancelled';
          break;
        case 'in_progress':
          endpoint = `/bookings/${booking._id}`;
          message = 'Service started';
          break;
        case 'complete':
          endpoint = `/bookings/${booking._id}/complete`;
          message = 'Booking marked as completed';
          break;
        default:
          return;
      }
      
      await bookingsAPI.updateBooking(booking._id, { status: action });
      
      // Send real-time update
      SocketService.sendBookingUpdate({
        bookingId: booking._id,
        status: action,
        customerId: booking.customer._id,
        providerId: booking.provider?._id || '',
        message,
        timestamp: new Date()
      });
      
      toast.success(message);
      
      // Update local booking state
      setBooking(prev => prev ? { ...prev, status: action as any } : null);
      
    } catch (error) {
      toast.error(`Failed to ${action} booking`);
    }
  };

  const handleReportIssue = () => {
    // Open email client with pre-filled details
    const subject = encodeURIComponent(`Issue with Booking #${booking?._id?.slice(-8)}`);
    const body = encodeURIComponent(`
Booking ID: ${booking?._id}
Service: ${booking?.service?.title}
Issue: [Please describe issue here]

Date: ${new Date().toLocaleDateString()}
User: ${user?.name} (${user?.email})
    `);
    
    window.open(`mailto:support@instaserve.com?subject=${subject}&body=${body}`);
    toast.success('Opening email client to report issue');
  };

  // Role-specific handlers
  const handleContactProvider = () => {
    if (booking?.provider?.phone) {
      window.open(`tel:${booking.provider.phone}`);
    } else {
      toast.error('No provider contact available');
    }
  };

  const handleContactCustomer = () => {
    if (booking?.customer?.phone) {
      window.open(`tel:${booking.customer.phone}`);
    } else {
      toast.error('No customer contact available');
    }
  };

  const handleNavigateToLocation = () => {
    if (booking?.address && currentLocation) {
      if (typeof booking.address === 'string') {
        // If address is string, use Google Maps navigation
        const mapsUrl = LocationService.getGoogleMapsUrl(currentLocation, booking.address);
        window.open(mapsUrl, '_blank');
      } else {
        // If address is object, geocode it first or use coordinates
        const addressString = `${booking.address?.street || ''}, ${booking.address?.city || ''}, ${booking.address?.state || ''} - ${booking.address?.pincode || ''}`;
        const mapsUrl = LocationService.getGoogleMapsUrl(currentLocation, addressString);
        window.open(mapsUrl, '_blank');
      }
    } else {
      toast.error('Location or address not available');
    }
  };

  const handlePayNow = () => {
    setShowPaymentModal(true);
  };

  const handleStartService = () => {
    handleBookingAction('in_progress');
  };

  const handleCompleteService = () => {
    handleBookingAction('complete');
  };

  const handleManualLocationUpdate = () => {
    if (currentLocation && booking && user) {
      console.log('ð [MANUAL] Triggering manual location update');
      SocketService.sendLocationUpdate(currentLocation, booking._id);
      toast.success('Manual location update sent');
    } else {
      toast.error('Cannot send location update - missing data');
    }
  };

  const fetchBookingDetails = async () => {
    try {
      const response = await bookingsAPI.getBooking(id!);
      setBooking(response.booking);
      
      // Set initial payment status
      if (response.booking.paymentStatus) {
        setPaymentStatus(response.booking.paymentStatus);
      }
    } catch (error: any) {
      setError('Failed to fetch booking details');
      console.error('Error fetching booking:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrackingUpdates = async () => {
    try {
      // Mock tracking updates - in real app, this would fetch from API
      const mockUpdates: TrackingUpdate[] = [
        {
          _id: '1',
          booking: id!,
          status: 'pending',
          message: 'Booking request sent to provider',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          _id: '2',
          booking: id!,
          status: 'confirmed',
          message: 'Provider accepted the booking',
          timestamp: new Date(Date.now() - 3000000).toISOString(),
        },
        {
          _id: '3',
          booking: id!,
          status: 'in_progress',
          message: 'Provider is on the way to your location',
          timestamp: new Date(Date.now() - 1800000).toISOString(),
          location: 'Near Main Street, Mumbai',
        },
      ];
      setTrackingUpdates(mockUpdates);
    } catch (error: any) {
      console.error('Error fetching tracking updates:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return 'â';
      case 'confirmed':
        return 'â';
      case 'in_progress':
        return 'â';
      case 'completed':
        return 'â';
      case 'cancelled':
        return 'â';
      default:
        return 'â';
    }
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
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking not found</h2>
          <p className="text-gray-600 mb-4">The booking you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/dashboard?tab=bookings')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            View Bookings
          </button>
        </div>
      </div>
    );
  }

  const isCustomer = user?.role === 'customer';

  // Render role-specific view
  if (isCustomer) {
    return (
      <ProfessionalCustomerTrackingView
        booking={booking}
        currentLocation={currentLocation}
        providerLocation={providerLocation}
        distance={distance}
        estimatedArrival={estimatedArrival}
        connectionStatus={connectionStatus}
        isTracking={isTracking}
        onContactProvider={handleContactProvider}
        onNavigateToLocation={handleNavigateToLocation}
        onPayNow={handlePayNow}
        onManualLocationUpdate={handleManualLocationUpdate}
        paymentStatus={paymentStatus}
        trackingUpdates={trackingUpdates}
        getStatusIcon={getStatusIcon}
        googleMapsData={googleMapsData}
      />
    );
  } else {
    return (
      <ProviderTrackingView
        booking={booking}
        currentLocation={currentLocation}
        customerLocation={customerLocation}
        distance={distance}
        estimatedArrival={estimatedArrival}
        connectionStatus={connectionStatus}
        isTracking={isTracking}
        onContactCustomer={handleContactCustomer}
        onNavigateToLocation={handleNavigateToLocation}
        onStartService={handleStartService}
        onCompleteService={handleCompleteService}
        onManualLocationUpdate={handleManualLocationUpdate}
        trackingUpdates={trackingUpdates}
        getStatusIcon={getStatusIcon}
        googleMapsData={googleMapsData}
      />
    );
  }
};

export default BookingTracking;
