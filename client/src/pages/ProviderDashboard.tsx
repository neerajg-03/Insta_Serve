import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { servicesAPI, bookingsAPI, providerAPI } from '../services/api';
import { RootState } from '../store';
import LocationService, { Location } from '../services/locationService';
import SocketService, { BookingUpdate, ChatMessage, UserData } from '../services/socketService';
import toast from 'react-hot-toast';
import { 
  WrenchScrewdriverIcon,
  BellIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  UserIcon,
  CogIcon,
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  DocumentTextIcon,
  ArrowTrendingUpIcon,
  SparklesIcon,
  ArrowRightIcon,
  StarIcon,
  ShieldCheckIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  PlayIcon,
  StopIcon,
  CheckIcon,
  UserGroupIcon,
  DocumentMagnifyingGlassIcon,
  BanknotesIcon,
  ArrowPathIcon,
  BellAlertIcon,
  HomeIcon,
  ClipboardDocumentListIcon,
  CreditCardIcon,
  AcademicCapIcon,
  BuildingOfficeIcon,
  ComputerDesktopIcon,
  HeartIcon,
  TruckIcon,
  CameraIcon,
  PaintBrushIcon,
  LightBulbIcon,
  FireIcon,
  CheckBadgeIcon,
  ArrowDownTrayIcon,
  QueueListIcon,
  ChartPieIcon,
  GiftIcon,
  TrophyIcon,
  FlagIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  FunnelIcon,
  DocumentDuplicateIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon, BellIcon as BellSolidIcon, FireIcon as FireSolidIcon } from '@heroicons/react/24/solid';
import ProviderAvailabilityToggle from '../components/ProviderAvailabilityToggle';

interface Service {
  _id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  priceType: string;
  duration: {
    value: number;
    unit: string;
  };
  serviceArea: string;
  requirements?: string;
  tools?: string;
  isActive: boolean;
  isApproved: boolean;
  createdBy?: string;
  provider?: string | null;
  images?: string[];
  rating?: number;
  reviewCount?: number;
}

interface ProviderService {
  _id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  priceType: string;
  duration: {
    value: number;
    unit: string;
  };
  serviceArea: string;
  requirements?: string;
  tools?: string;
  isActive: boolean;
  isApproved: boolean;
  provider: string;
  createdAt: string;
  updatedAt: string;
  images?: string[];
  rating?: number;
  reviewCount?: number;
}

interface Booking {
  _id: string;
  service: {
    _id: string;
    title: string;
    price: number;
    images?: string[];
  };
  customer: {
    _id: string;
    name: string;
    email: string;
    phone: string;
  };
  provider?: {
    _id: string;
    name: string;
  } | null;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'broadcast';
  scheduledDate: string;
  scheduledTime: string;
  address: string | {
    street: string;
    city: string;
    state: string;
    pincode: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  notes: string;
  totalAmount?: number;
  price?: {
    totalPrice: number;
  };
  broadcastTo?: string[];
  broadcastSentAt?: string;
  createdAt: string;
  customerNotes?: string;
}

interface EarningsData {
  totalEarnings: number;
  thisMonth: number;
  lastMonth: number;
  completedBookings: number;
  pendingPayments: number;
  averageRating: number;
}

const ProviderDashboard: React.FC = () => {
  const { user, isLoading } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState('overview');
  const [availableServices, setAvailableServices] = useState<Service[]>([]);
  const [myServices, setMyServices] = useState<ProviderService[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTrackingLocation, setIsTrackingLocation] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);
  const [locationTrackingInterval, setLocationTrackingInterval] = useState<NodeJS.Timeout | null>(null);
  const [locationSharingEnabled, setLocationSharingEnabled] = useState(false);
  const [lastLocationUpdate, setLastLocationUpdate] = useState<Date | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  
  // KYC related state
  const [kycStatus, setKycStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);
  const [kycDocuments, setKycDocuments] = useState<any[]>([]);
  const [apiStatus, setApiStatus] = useState<string>('checking');
  
  // Request timeout state
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Earnings state
  const [earningsData, setEarningsData] = useState<EarningsData>({
    totalEarnings: 0,
    thisMonth: 0,
    lastMonth: 0,
    completedBookings: 0,
    pendingPayments: 0,
    averageRating: 0
  });

  useEffect(() => {
    // Connect to Socket.IO and start location tracking IMMEDIATELY for providers
    if (user && user.role === 'provider') {
      console.log('Provider detected, connecting to Socket.IO immediately...');
      connectProviderSocket();
    }

    // Check API connectivity on component mount
    checkAPIConnectivity();
    fetchProviderStatus();

    // Cleanup location tracking on unmount
    return () => {
      if (locationTrackingInterval) {
        clearInterval(locationTrackingInterval);
      }
      // Stop location tracking when component unmounts
      LocationService.stopLocationTracking();
      SocketService.disconnect();
    };
  }, [user]);

  // Update current time every second for timeout calculations
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Filter out expired requests (older than 5 minutes)
  useEffect(() => {
    if (incomingRequests.length > 0) {
      const expiredRequests = incomingRequests.filter(booking => {
        const broadcastTime = new Date(booking.broadcastSentAt || booking.createdAt);
        const timeDiff = currentTime.getTime() - broadcastTime.getTime();
        const fiveMinutesInMs = 5 * 60 * 1000;
        return timeDiff > fiveMinutesInMs;
      });

      if (expiredRequests.length > 0) {
        console.log(`Removing ${expiredRequests.length} expired requests`);
        setIncomingRequests(prev => prev.filter(booking => {
          const broadcastTime = new Date(booking.broadcastSentAt || booking.createdAt);
          const timeDiff = currentTime.getTime() - broadcastTime.getTime();
          const fiveMinutesInMs = 5 * 60 * 1000;
          return timeDiff <= fiveMinutesInMs;
        }));
      }
    }
  }, [currentTime, incomingRequests.length]);


  const checkAPIConnectivity = async () => {
    try {
      const response = await fetch('/api/health', { 
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        setApiStatus('connected');
        console.log('API is reachable');
      } else {
        setApiStatus('error');
        console.error('API is not reachable');
      }
    } catch (error) {
      setApiStatus('error');
      console.error('API connectivity check failed:', error);
      toast.error('Cannot connect to server. Please check your internet connection.');
    }
  };

  const fetchIncomingRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await bookingsAPI.getBookings({ status: 'broadcast' });
      setIncomingRequests(response.bookings || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch incoming requests');
      toast.error('Failed to fetch incoming requests');
    } finally {
      setLoading(false);
    }
  };

  const fetchKycStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/kyc/status', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setKycStatus(data.kycStatus);
        setKycDocuments(data.documents || []);
      }
    } catch (error) {
      console.error('Failed to fetch KYC status:', error);
    }
  };

  const fetchEarningsData = async () => {
    try {
      // Calculate real earnings data from bookings
      const completedBookings = bookings.filter(b => b.status === 'completed');
      const totalEarnings = completedBookings.reduce((sum, booking) => {
        return sum + (booking.totalAmount || booking.price?.totalPrice || 0);
      }, 0);
      
      // This month earnings
      const thisMonth = new Date().getMonth();
      const thisYear = new Date().getFullYear();
      const thisMonthBookings = completedBookings.filter(booking => {
        const bookingDate = new Date(booking.createdAt);
        return bookingDate.getMonth() === thisMonth && bookingDate.getFullYear() === thisYear;
      });
      const thisMonthEarnings = thisMonthBookings.reduce((sum, booking) => {
        return sum + (booking.totalAmount || booking.price?.totalPrice || 0);
      }, 0);
      
      // Last month earnings
      const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
      const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;
      const lastMonthBookings = completedBookings.filter(booking => {
        const bookingDate = new Date(booking.createdAt);
        return bookingDate.getMonth() === lastMonth && bookingDate.getFullYear() === lastMonthYear;
      });
      const lastMonthEarnings = lastMonthBookings.reduce((sum, booking) => {
        return sum + (booking.totalAmount || booking.price?.totalPrice || 0);
      }, 0);
      
      // Calculate average rating from services
      const approvedServices = myServices.filter(s => s.isApproved && s.rating);
      const averageRating = approvedServices.length > 0 
        ? approvedServices.reduce((sum, service) => sum + (service.rating || 0), 0) / approvedServices.length 
        : 0;
      
      setEarningsData({
        totalEarnings,
        thisMonth: thisMonthEarnings,
        lastMonth: lastMonthEarnings,
        completedBookings: completedBookings.length,
        pendingPayments: 0, // Would calculate from pending payments
        averageRating: averageRating || 4.5
      });
    } catch (error) {
      console.error('Failed to fetch earnings data:', error);
      // Fallback to mock data
      setEarningsData({
        totalEarnings: 45000,
        thisMonth: 12000,
        lastMonth: 9800,
        completedBookings: 47,
        pendingPayments: 2500,
        averageRating: 4.8
      });
    }
  };

  const setupSocketListeners = () => {
    // Listen for new service requests
    SocketService.on('new_service_request', (data: any) => {
      console.log('🔔 New service request received:', data);
      toast.success(`New service request: ${data.serviceTitle}`, {
        duration: 5000,
        icon: '🔔'
      });
      
      // Refresh incoming requests
      if (activeTab === 'incoming') {
        fetchIncomingRequests();
      }
      
      // Add notification
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'new_request',
        title: 'New Service Request',
        message: data.serviceTitle,
        timestamp: new Date()
      }]);
    });

    // Listen for booking no longer available (accepted by another provider)
    SocketService.on('booking_no_longer_available', (data: any) => {
      console.log('❌ Booking no longer available:', data);
      toast.error(data.message || 'This booking has been accepted by another provider', {
        duration: 5000,
        icon: '❌'
      });
      
      // Remove from incoming requests list
      setIncomingRequests(prev => prev.filter(booking => booking._id !== data.bookingId));
      
      // Add notification
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'booking_lost',
        title: 'Booking No Longer Available',
        message: data.message || 'Accepted by another provider',
        timestamp: new Date()
      }]);
    });

    // Listen for booking updates (when provider accepts their own booking)
    SocketService.on('booking_update', (data: any) => {
      console.log('📋 Booking update received:', data);
      
      // If this provider accepted the booking, refresh their bookings
      if (data.providerId === user?._id) {
        toast.success('Booking accepted successfully!', {
          duration: 5000,
          icon: '✅'
        });
        
        // Refresh bookings and incoming requests
        fetchBookings();
        fetchIncomingRequests();
        
        // Add notification
        setNotifications(prev => [...prev, {
          id: Date.now(),
          type: 'booking_accepted',
          title: 'Booking Accepted',
          message: 'You have accepted a new booking',
          timestamp: new Date()
        }]);
      }
    });
  };

  useEffect(() => {
    // Only fetch data if user is available and not loading
    if (user && !isLoading) {
      fetchAvailableServices();
      fetchMyServices();
      fetchKycStatus(); // Fetch KYC status
      fetchEarningsData(); // Fetch earnings data
      setupSocketListeners(); // Setup Socket.IO listeners
      
      if (activeTab === 'bookings') {
        fetchBookings();
      } else if (activeTab === 'incoming') {
        fetchIncomingRequests();
      }
    }
  }, [activeTab, user, isLoading]);

  const fetchAvailableServices = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔍 Fetching available services...');
      const response = await servicesAPI.getAvailableServices();
      console.log('📊 Available services response:', response);
      setAvailableServices(response.services || []);
    } catch (err: any) {
      console.error('❌ Error fetching available services:', err);
      setError(err.response?.data?.message || 'Failed to fetch available services');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyServices = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await servicesAPI.getProviderServices();
      setMyServices(response.services || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch your services');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestService = async (serviceId: string) => {
    try {
      console.log('🔔 Requesting service:', serviceId);
      
      setLoading(true);
      const response = await servicesAPI.requestService(serviceId);
      console.log('✅ Service request response:', response);
      toast.success('Service request submitted successfully!');
      fetchAvailableServices();
      fetchMyServices();
    } catch (err: any) {
      console.error('❌ Service request error:', err);
      setError(err.response?.data?.message || 'Failed to request service');
      toast.error(err.response?.data?.message || 'Failed to request service');
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await bookingsAPI.getBookings({ provider: user?._id });
      setBookings(response.bookings || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch bookings');
      toast.error('Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptBooking = async (bookingId: string) => {
    try {
      console.log('🔄 Accepting booking:', bookingId);
      
      const response = await bookingsAPI.updateBooking(bookingId, { status: 'confirmed' });
      console.log('✅ Booking accepted response:', response);
      
      toast.success('Booking accepted successfully');
      fetchBookings(); // Refresh bookings
    } catch (err: any) {
      console.error('❌ Accept booking error:', err);
      toast.error(err.response?.data?.message || 'Failed to accept booking');
    }
  };

  const handleRejectBooking = async (bookingId: string) => {
    try {
      await bookingsAPI.updateBooking(bookingId, { status: 'cancelled' });
      
      toast.success('Booking rejected successfully');
      fetchBookings(); // Refresh bookings
    } catch (err: any) {
      console.error('Reject booking error:', err);
      toast.error(err.response?.data?.message || 'Failed to reject booking');
    }
  };

  const handleRejectBroadcastRequest = async (bookingId: string) => {
    try {
      console.log('🔄 Rejecting broadcast request:', bookingId);
      
      // Call API to remove this provider from broadcastTo array
      const response = await bookingsAPI.rejectBroadcastRequest(bookingId);
      console.log('✅ Broadcast request rejected response:', response);
      
      toast.success('Request removed from your list');
      fetchIncomingRequests(); // Refresh incoming requests
    } catch (err: any) {
      console.error('❌ Reject broadcast request error:', err);
      toast.error(err.response?.data?.message || 'Failed to remove request');
    }
  };

  const handleStartBooking = async (bookingId: string) => {
    try {
      await bookingsAPI.updateBooking(bookingId, { status: 'in_progress' });
      toast.success('Booking started successfully');
      
      fetchBookings(); // Refresh bookings
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to start booking');
    }
  };

  const handleCompleteBooking = async (bookingId: string) => {
    try {
      await bookingsAPI.completeBooking(bookingId);
      
      toast.success('Booking completed successfully');
      fetchBookings(); // Refresh bookings
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to complete booking');
    }
  };

  const connectProviderSocket = async () => {
    try {
      if (!user) {
        console.log('No user found, cannot connect socket');
        return;
      }

      console.log('Connecting provider to Socket.IO for live location tracking...');
      console.log('User data:', {
        userId: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      });
      
      // Check if already connected
      if (SocketService.isConnected()) {
        console.log('Socket already connected, proceeding with location tracking...');
      } else {
        // Connect to Socket.IO
        await SocketService.connect({
          userId: user._id,
          name: user.name,
          email: user.email,
          role: 'provider'
        });

        console.log('Socket connection initiated...');
        
        // Quick wait for connection to establish
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Check if connected
        if (!SocketService.isConnected()) {
          throw new Error('Socket connection failed');
        }
        
        console.log('Socket connected successfully');
      }
      
      // Set up socket listeners
      setupSocketListeners();

      // Start automatic location tracking IMMEDIATELY
      await startProviderLocationTracking();

      console.log('Provider connected to Socket.IO with live location tracking');
    } catch (error: any) {
      console.error('Failed to connect provider socket:', error);
      console.error('Error details:', {
        message: error?.message || 'Unknown error',
        stack: error?.stack || 'No stack trace'
      });
      toast.error(`Failed to connect to real-time services: ${error?.message || 'Unknown error'}`);
      
      // Retry connection after 3 seconds (faster retry)
      setTimeout(() => {
        console.log('Retrying Socket.IO connection...');
        connectProviderSocket();
      }, 3000);
    }
  };

  const startProviderLocationTracking = async () => {
    try {
      console.log('Starting automatic location tracking for provider...');
      console.log('???? Starting automatic location tracking for provider...');
      
      // Check if geolocation is supported
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by this browser');
      }
      
      // Try to get current location first
      let location: Location | null = null;
      try {
        console.log('???? Getting current location...');
        location = await LocationService.getCurrentLocation();
        console.log('???? Current location obtained:', location);
      } catch (locationError) {
        console.warn('???? Failed to get current location, trying last known location:', locationError);
        
        // Fallback to last known location
        location = LocationService.getLastKnownLocation();
        if (location) {
          console.log('???? Using last known location:', location);
          toast.success('Using last known location for tracking');
        } else {
          console.warn('???? No last known location available');
          toast.error('No location available. Please enable location services.');
          return;
        }
      }

      if (location) {
        setCurrentLocation(location);
        setLastLocationUpdate(new Date(location.timestamp));

        // Send initial location update to database and Socket.io
        try {
          // Update location in database via API
          await providerAPI.updateLocation({
            lat: location.lat,
            lng: location.lng
          });
          console.log('???? Provider location updated in database:', {
            lat: location.lat,
            lng: location.lng,
            timestamp: new Date(location.timestamp)
          });
        } catch (apiError) {
          console.error('???? Failed to update location in database:', apiError);
        }

        // Also send to Socket.io for real-time tracking
        if (SocketService.isConnected()) {
          SocketService.sendLocationUpdate({
            lat: location.lat,
            lng: location.lng,
            accuracy: 10
          });
          console.log('???? Initial provider location sent to booking room:', {
            lat: location.lat,
            lng: location.lng,
            timestamp: new Date(location.timestamp)
          });
        } else {
          console.warn('???? Socket not connected, cannot send initial location');
        }
      }

      // Start continuous location tracking (only if we got real location)
      if (location && !LocationService.getLastKnownLocation()) {
        console.log('???? Starting continuous location tracking...');
        
        // Throttle database updates to every 30 seconds
        let lastDatabaseUpdate = 0;
        const DATABASE_UPDATE_INTERVAL = 30000; // 30 seconds
        
        await LocationService.startLocationTracking((location) => {
          console.log('???? Location update received:', location);
          setCurrentLocation(location);
          setLastLocationUpdate(new Date());
          
          // Send real-time update to Socket.io
          if (SocketService.isConnected()) {
            SocketService.sendLocationUpdate({
              lat: location.lat,
              lng: location.lng,
              accuracy: 10
            });
            
            console.log('???? Provider location sent to booking room:', {
              lat: location.lat,
              lng: location.lng,
              timestamp: new Date(location.timestamp),
              socketConnected: SocketService.isConnected()
            });
          } else {
            console.warn('???? Socket not connected, location update skipped');
          }
          
          // Throttled database update
          const now = Date.now();
          if (now - lastDatabaseUpdate >= DATABASE_UPDATE_INTERVAL) {
            try {
              providerAPI.updateLocation({
                lat: location.lat,
                lng: location.lng
              });
              console.log('???? Provider location updated in database (throttled):', {
                lat: location.lat,
                lng: location.lng,
                timestamp: new Date(location.timestamp)
              });
              lastDatabaseUpdate = now;
            } catch (apiError) {
              console.error('???? Failed to update location in database:', apiError);
            }
          } else {
            console.log('???? Database update skipped (throttled)');
          }
        });
      } else {
        console.log('???? Using stored location, continuous tracking disabled');
      }

      console.log('???? Provider location tracking started successfully');
    } catch (error: any) {
      console.error('???? Failed to start provider location tracking:', error);
      console.error('???? Error details:', {
        message: error?.message || 'Unknown error',
        code: error?.code || 'Unknown code',
        stack: error?.stack || 'No stack trace'
      });
      
      let errorMessage = 'Failed to start location tracking';
      if (error?.code === 1) {
        errorMessage = 'Location access denied. Using last known location if available.';
      } else if (error?.code === 2) {
        errorMessage = 'Location unavailable. Using last known location if available.';
      } else if (error?.code === 3) {
        errorMessage = 'Location request timed out. Using last known location if available.';
      }
      
      // Try to use last known location as final fallback
      const lastLocation = LocationService.getLastKnownLocation();
      if (lastLocation) {
        setCurrentLocation(lastLocation);
        setLastLocationUpdate(new Date(lastLocation.timestamp));
        toast.success('Using last known location for service availability');
        console.log('???? Fallback to last known location successful:', lastLocation);
      } else {
        toast.error(errorMessage);
      }
    }
  };

const fetchProviderStatus = async () => {
    try {
      const response = await providerAPI.getStatus();
      setLocationSharingEnabled(response.locationSharingEnabled || false);
      
      if (response.currentLocation) {
        setCurrentLocation({
          lat: response.currentLocation.lat,
          lng: response.currentLocation.lng,
          timestamp: new Date(response.currentLocation.lastUpdated).getTime()
        });
        setLastLocationUpdate(new Date(response.currentLocation.lastUpdated));
      } else {
        // If no current location from server, try to use stored location
        const storedLocation = LocationService.getLastKnownLocation();
        if (storedLocation) {
          setCurrentLocation(storedLocation);
          setLastLocationUpdate(new Date(storedLocation.timestamp));
          console.log('Using stored location as server has no current location');
        }
      }
    } catch (error) {
      console.error('Failed to fetch provider status:', error);
      // Try to use stored location as fallback
      const storedLocation = LocationService.getLastKnownLocation();
      if (storedLocation) {
        setCurrentLocation(storedLocation);
        setLastLocationUpdate(new Date(storedLocation.timestamp));
        console.log('Using stored location due to API error');
      }
    }
  };

  const stopLocationTracking = () => {
    // Stop active booking tracking
    setActiveBookingId(null);
    setIsTrackingLocation(false);
    toast.success('Location tracking for booking stopped');
  };

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const getBookingDistance = (booking: Booking): number | null => {
    if (!currentLocation || !booking.address) return null;
    
    // If booking has coordinates, use them
    if (typeof booking.address === 'object' && booking.address.coordinates) {
      return calculateDistance(
        currentLocation.lat,
        currentLocation.lng,
        booking.address.coordinates.lat,
        booking.address.coordinates.lng
      );
    }
    
    return null;
  };

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: ChartBarIcon },
    { id: 'services', label: 'My Services', icon: WrenchScrewdriverIcon },
    { id: 'incoming', label: 'Incoming Requests', icon: BellAlertIcon },
    { id: 'bookings', label: 'Bookings', icon: CalendarIcon },
    { id: 'earnings', label: 'Earnings', icon: CurrencyDollarIcon },
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
        return <PlayIcon className="w-4 h-4" />;
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

  const getKycStatusColor = (status: string | null) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getKycStatusIcon = (status: string | null) => {
    switch (status) {
      case 'approved':
        return <CheckCircleIcon className="w-5 h-5" />;
      case 'rejected':
        return <XMarkIcon className="w-5 h-5" />;
      case 'pending':
        return <ClockIcon className="w-5 h-5" />;
      default:
        return <ExclamationTriangleIcon className="w-5 h-5" />;
    }
  };

  const getTimeRemaining = (broadcastSentAt: string | Date) => {
    const broadcastTime = new Date(broadcastSentAt);
    const timeDiff = currentTime.getTime() - broadcastTime.getTime();
    const fiveMinutesInMs = 5 * 60 * 1000;
    const remainingMs = fiveMinutesInMs - timeDiff;
    
    if (remainingMs <= 0) {
      return { expired: true, minutes: 0, seconds: 0 };
    }
    
    const minutes = Math.floor(remainingMs / (60 * 1000));
    const seconds = Math.floor((remainingMs % (60 * 1000)) / 1000);
    
    return { expired: false, minutes, seconds };
  };

  const renderServices = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Service Management</h2>
        <p className="text-gray-600 mt-2">Browse available services and request to provide them</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg mr-3">
              <DocumentMagnifyingGlassIcon className="w-6 h-6 text-white" />
            </div>
            Available Services
            <span className="ml-auto text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
              {myServices.length} services
            </span>
          </h3>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : myServices.length === 0 ? (
            <div className="text-center py-12">
              <div className="p-4 bg-gray-100 rounded-full inline-block mb-4">
                <DocumentMagnifyingGlassIcon className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No available services</h3>
              <p className="text-gray-600 mb-4">There are no services available for you to provide at the moment.</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
              {myServices
                .filter((service: any) => service && service._id)
                .map((service: any) => (
                  <div key={service._id} className="border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-all duration-200 hover:scale-102">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-bold text-gray-900 flex-1 text-lg">
                        {service?.title || 'Untitled Service'}
                      </h4>
                      <span className="text-lg font-bold text-blue-600">
                        ₹{typeof service?.price === 'object' ? (service.price as { value: number }).value || 0 : service?.price || 0}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {service?.description || 'No description available'}
                    </p>
                    <div className="grid grid-cols-2 gap-3 text-sm text-gray-600 mb-4">
                      <div className="flex items-center">
                        <BuildingOfficeIcon className="w-4 h-4 mr-1 text-blue-500" />
                        <span className="font-medium">Category:</span>
                        <span className="ml-1">{typeof service?.category === 'object' ? (service.category as any).value || 'N/A' : service?.category || 'N/A'}</span>
                      </div>
                      <div className="flex items-center">
                        <ClockIcon className="w-4 h-4 mr-1 text-purple-500" />
                        <span className="font-medium">Duration:</span>
                        <span className="ml-1">{typeof service?.duration === 'object' ? `${(service.duration as any).value || 'N/A'} ${(service.duration as any).unit || ''}` : service?.duration || 'N/A'}</span>
                      </div>
                    </div>
                    {service?.requirements && (
                      <div className="mb-3 p-3 bg-yellow-50 rounded-lg text-xs text-yellow-800 border border-yellow-200">
                        <strong className="flex items-center">
                          <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                          Requirements:
                        </strong> {typeof service.requirements === 'object' ? JSON.stringify(service.requirements) : service.requirements}
                      </div>
                    )}
                    {service?.tools && (
                      <div className="mb-3 p-3 bg-blue-50 rounded-lg text-xs text-blue-800 border border-blue-200">
                        <strong className="flex items-center">
                          <WrenchScrewdriverIcon className="w-4 h-4 mr-1" />
                          Tools:
                        </strong> {typeof service.tools === 'object' ? JSON.stringify(service.tools) : service.tools}
                      </div>
                    )}
                    <button
                      onClick={() => {
                        console.log('🔘 Button clicked! Service data:', service);
                        console.log('🔘 Service ID:', service._id);
                        console.log('🔘 Service title:', service.title);
                        handleRequestService(service._id);
                      }}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium shadow-md hover:shadow-lg hover:scale-105"
                      disabled={loading}
                    >
                      {loading ? (
                        <span className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Requesting...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center">
                          <WrenchScrewdriverIcon className="w-4 h-4 mr-2" />
                          Request to Provide This Service
                        </span>
                      )}
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg mr-3">
              <WrenchScrewdriverIcon className="w-6 h-6 text-white" />
            </div>
            My Service Requests
            <span className="ml-auto text-sm bg-green-100 text-green-800 px-3 py-1 rounded-full font-medium">
              {myServices.length} requests
            </span>
          </h3>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
              {myServices.length === 0 ? (
                <div className="text-center py-12">
                  <div className="p-4 bg-gray-100 rounded-full inline-block mb-4">
                    <WrenchScrewdriverIcon className="w-12 h-12 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No service requests</h3>
                  <p className="text-gray-600 mb-4">Start by requesting services from the available section</p>
                  <button
                    onClick={() => document.querySelector('.grid')?.scrollIntoView({ behavior: 'smooth' })}
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
                  >
                    Browse Available Services
                    <ArrowRightIcon className="w-4 h-4 ml-2" />
                  </button>
                </div>
              ) : (
                myServices
                  .filter(myService => myService && myService._id)
                  .map((myService) => (
                    <div key={myService._id} className={`border rounded-xl p-4 hover:shadow-lg transition-all duration-200 hover:scale-102 ${
                      myService?.isApproved 
                        ? 'border-green-200 bg-green-50' 
                        : 'border-yellow-200 bg-yellow-50'
                    }`}>
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-bold text-gray-900 flex-1 text-lg">
                          {myService?.title || 'Untitled Service'}
                        </h4>
                        <span className={`text-xs px-3 py-1 rounded-full font-medium flex items-center ${
                          myService?.isApproved 
                            ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800' 
                            : 'bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-800'
                        }`}>
                          {myService?.isApproved ? (
                            <>
                              <CheckBadgeIcon className="w-4 h-4 mr-1" />
                              Approved
                            </>
                          ) : (
                            <>
                              <ClockIcon className="w-4 h-4 mr-1" />
                              Pending Approval
                            </>
                          )}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {myService?.description || 'No description available'}
                      </p>
                      <div className="grid grid-cols-2 gap-3 text-sm text-gray-600 mb-4">
                        <div className="flex items-center">
                          <BuildingOfficeIcon className="w-4 h-4 mr-1 text-blue-500" />
                          <span className="font-medium">Category:</span>
                          <span className="ml-1">{myService?.category || 'N/A'}</span>
                        </div>
                        <div className="flex items-center">
                          <CalendarIcon className="w-4 h-4 mr-1 text-purple-500" />
                          <span className="font-medium">Requested:</span>
                          <span className="ml-1">
                            {myService?.createdAt ? new Date(myService.createdAt).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                      </div>
                      {myService?.isApproved && (
                        <div className="mt-4 flex space-x-2">
                          <button className="flex-1 px-3 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 text-blue-700 rounded-lg hover:from-blue-100 hover:to-indigo-100 transition-all duration-200 font-medium text-sm hover:scale-105">
                            <EyeIcon className="w-4 h-4 mr-1" />
                            View Details
                          </button>
                          <button className="flex-1 px-3 py-2 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 text-yellow-700 rounded-lg hover:from-yellow-100 hover:to-orange-100 transition-all duration-200 font-medium text-sm hover:scale-105">
                            <PencilIcon className="w-4 h-4 mr-1" />
                            Edit Service
                          </button>
                        </div>
                      )}
                    </div>
                  ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderOverview = () => {
    console.log('renderOverview called, locationSharingEnabled:', locationSharingEnabled);
    
    return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
        <div className="relative z-10">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-white to-emerald-100 bg-clip-text text-transparent">
                Welcome back, {user?.name}!
              </h1>
              <p className="text-emerald-100 text-lg">Manage your services and grow your business</p>
              <div className="mt-4 flex items-center space-x-4">
                <div className="flex items-center space-x-2 bg-white/20 backdrop-blur-sm px-3 py-2 rounded-lg">
                  <CheckBadgeIcon className="w-5 h-5 text-emerald-200" />
                  <span className="text-sm font-medium">Professional Provider</span>
                </div>
                <div className="flex items-center space-x-2 bg-white/20 backdrop-blur-sm px-3 py-2 rounded-lg">
                  <StarSolidIcon className="w-5 h-5 text-yellow-300" />
                  <span className="text-sm font-medium">{earningsData.averageRating.toFixed(1)} Rating</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className={`px-4 py-2 rounded-full text-sm font-medium flex items-center backdrop-blur-sm ${getKycStatusColor(kycStatus)}`}>
                {getKycStatusIcon(kycStatus)}
                <span className="ml-2">KYC {kycStatus?.toUpperCase() || 'NOT SUBMITTED'}</span>
              </div>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-3 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-all duration-200 hover:scale-105"
              >
                <BellIcon className="w-6 h-6" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                    {notifications.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="group bg-white rounded-2xl shadow-lg p-6 hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:scale-105">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium flex items-center">
                <CurrencyDollarIcon className="w-4 h-4 mr-1 text-green-500" />
                Total Earnings
              </p>
              <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mt-2">
                ₹{earningsData.totalEarnings.toLocaleString()}
              </p>
              <p className="text-xs text-green-600 mt-2 flex items-center font-medium">
                <ArrowTrendingUpIcon className="w-3 h-3 mr-1" />
                {earningsData.lastMonth > 0 ? ((earningsData.thisMonth - earningsData.lastMonth) / earningsData.lastMonth * 100).toFixed(1) : '0'}% from last month
              </p>
            </div>
            <div className="p-4 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl group-hover:scale-110 transition-transform">
              <CurrencyDollarIcon className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="group bg-white rounded-2xl shadow-lg p-6 hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:scale-105">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium flex items-center">
                <CalendarIcon className="w-4 h-4 mr-1 text-blue-500" />
                Completed Bookings
              </p>
              <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mt-2">
                {earningsData.completedBookings}
              </p>
              <p className="text-xs text-blue-600 mt-2 flex items-center font-medium">
                <CheckCircleIcon className="w-3 h-3 mr-1" />
                This month: {bookings.filter(b => b.status === 'completed').length}
              </p>
            </div>
            <div className="p-4 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl group-hover:scale-110 transition-transform">
              <CalendarIcon className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="group bg-white rounded-2xl shadow-lg p-6 hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:scale-105">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium flex items-center">
                <WrenchScrewdriverIcon className="w-4 h-4 mr-1 text-purple-500" />
                Active Services
              </p>
              <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mt-2">
                {myServices.filter(s => s.isApproved && s.isActive).length}
              </p>
              <p className="text-xs text-purple-600 mt-2 flex items-center font-medium">
                <WrenchScrewdriverIcon className="w-3 h-3 mr-1" />
                Total: {myServices.length}
              </p>
            </div>
            <div className="p-4 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl group-hover:scale-110 transition-transform">
              <WrenchScrewdriverIcon className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="group bg-white rounded-2xl shadow-lg p-6 hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:scale-105">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium flex items-center">
                <StarIcon className="w-4 h-4 mr-1 text-yellow-500" />
                Average Rating
              </p>
              <p className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent mt-2">
                {earningsData.averageRating.toFixed(1)}
              </p>
              <p className="text-xs text-yellow-600 mt-2 flex items-center font-medium">
                <StarSolidIcon className="w-3 h-3 mr-1 text-yellow-500" />
                Excellent service
              </p>
            </div>
            <div className="p-4 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-xl group-hover:scale-110 transition-transform">
              <StarIcon className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Availability Status */}
      <ProviderAvailabilityToggle />

      {/* Location Tracking Status */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
          <MapPinIcon className="w-6 h-6 mr-2 text-red-500" />
          Real-Time Location Tracking
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-full ${locationSharingEnabled ? 'bg-green-100' : 'bg-gray-100'}`}>
                <MapPinIcon className={`w-5 h-5 ${locationSharingEnabled ? 'text-green-600' : 'text-gray-400'}`} />
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  {locationSharingEnabled ? 'Location Sharing Active' : 'Location Sharing Inactive'}
                </p>
                <p className="text-sm text-gray-600">
                  {lastLocationUpdate 
                    ? `Last updated: ${lastLocationUpdate.toLocaleTimeString()}`
                    : 'No location data yet'
                  }
                </p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p className="font-medium">
                {locationSharingEnabled ? 'Location sharing is active' : 'Location sharing is inactive'}
              </p>
              <p className="text-xs mt-1">
                Location is automatically shared when you are available
              </p>
            </div>
          </div>
          
          {currentLocation && (
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-blue-800 flex items-center">
                  <MapPinIcon className="w-4 h-4 mr-2 text-blue-600" />
                  Live GPS Coordinates
                </p>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-600 font-medium">LIVE</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-lg p-3 border border-blue-100">
                  <p className="text-xs text-gray-600 mb-1">Latitude</p>
                  <p className="text-sm font-mono font-bold text-blue-700">
                    {currentLocation.lat.toFixed(6)}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-blue-100">
                  <p className="text-xs text-gray-600 mb-1">Longitude</p>
                  <p className="text-sm font-mono font-bold text-blue-700">
                    {currentLocation.lng.toFixed(6)}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs text-gray-600">
                  Accuracy: ±10m • Updated: {lastLocationUpdate ? lastLocationUpdate.toLocaleTimeString() : 'Just now'}
                </p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${currentLocation.lat.toFixed(6)}, ${currentLocation.lng.toFixed(6)}`);
                    toast.success('Coordinates copied to clipboard!');
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center"
                >
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </button>
              </div>
            </div>
          )}
          
          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-sm text-yellow-800">
              <strong className="flex items-center">
                <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                Important:
              </strong> Enabling location tracking allows customers to see your real-time location for active bookings and helps us calculate accurate distances for service requests.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
          <SparklesIcon className="w-6 h-6 mr-2 text-yellow-500" />
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => setActiveTab('services')}
            className="group p-6 bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-100 rounded-xl hover:from-blue-100 hover:via-indigo-100 hover:to-indigo-200 transition-all duration-300 border border-blue-200 text-left hover:shadow-lg hover:scale-105"
          >
            <div className="flex items-center justify-between mb-3">
              <WrenchScrewdriverIcon className="w-8 h-8 text-blue-600 group-hover:scale-110 transition-transform" />
              <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded-full">{myServices.length}</span>
            </div>
            <h4 className="font-semibold text-gray-900 mb-1">Manage Services</h4>
            <p className="text-sm text-gray-600">Add or edit services</p>
            <ArrowRightIcon className="w-4 h-4 text-blue-600 mt-2 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={() => setActiveTab('incoming')}
            className="group p-6 bg-gradient-to-br from-purple-50 via-purple-100 to-pink-100 rounded-xl hover:from-purple-100 hover:via-pink-100 hover:to-pink-200 transition-all duration-300 border border-purple-200 text-left hover:shadow-lg hover:scale-105"
          >
            <div className="flex items-center justify-between mb-3">
              <BellAlertIcon className="w-8 h-8 text-purple-600 group-hover:scale-110 transition-transform" />
              <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded-full">{incomingRequests.length}</span>
            </div>
            <h4 className="font-semibold text-gray-900 mb-1">Incoming Requests</h4>
            <p className="text-sm text-gray-600">View new bookings</p>
            <ArrowRightIcon className="w-4 h-4 text-purple-600 mt-2 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={() => setActiveTab('bookings')}
            className="group p-6 bg-gradient-to-br from-green-50 via-green-100 to-emerald-100 rounded-xl hover:from-green-100 hover:via-emerald-100 hover:to-emerald-200 transition-all duration-300 border border-green-200 text-left hover:shadow-lg hover:scale-105"
          >
            <div className="flex items-center justify-between mb-3">
              <CalendarIcon className="w-8 h-8 text-green-600 group-hover:scale-110 transition-transform" />
              <span className="text-xs bg-green-600 text-white px-2 py-1 rounded-full">{bookings.length}</span>
            </div>
            <h4 className="font-semibold text-gray-900 mb-1">My Bookings</h4>
            <p className="text-sm text-gray-600">Manage appointments</p>
            <ArrowRightIcon className="w-4 h-4 text-green-600 mt-2 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={() => setActiveTab('earnings')}
            className="group p-6 bg-gradient-to-br from-yellow-50 via-yellow-100 to-orange-100 rounded-xl hover:from-yellow-100 hover:via-orange-100 hover:to-orange-200 transition-all duration-300 border border-yellow-200 text-left hover:shadow-lg hover:scale-105"
          >
            <div className="flex items-center justify-between mb-3">
              <CurrencyDollarIcon className="w-8 h-8 text-yellow-600 group-hover:scale-110 transition-transform" />
              <span className="text-xs bg-yellow-600 text-white px-2 py-1 rounded-full">₹{earningsData.thisMonth.toLocaleString()}</span>
            </div>
            <h4 className="font-semibold text-gray-900 mb-1">View Earnings</h4>
            <p className="text-sm text-gray-600">Track your income</p>
            <ArrowRightIcon className="w-4 h-4 text-yellow-600 mt-2 group-hover:translate-x-1 transition-transform" />
          </button>
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
            <h3 className="text-lg font-medium text-gray-900 mb-2">No recent activity</h3>
            <p className="text-gray-600 mb-6">Start by adding services and accepting booking requests.</p>
            <button
              onClick={() => setActiveTab('services')}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Add Your First Service
              <ArrowRightIcon className="w-4 h-4 ml-2" />
            </button>
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
                    <p className="font-semibold text-gray-900">{booking.service?.title || 'Unknown Service'}</p>
                    <p className="text-sm text-gray-600 flex items-center mt-1">
                      <UserIcon className="w-4 h-4 mr-1" />
                      {booking.customer.name} • {new Date(booking.createdAt).toLocaleDateString()}
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

  const renderServices = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Service Management</h2>
        <p className="text-gray-600 mt-2">Browse available services and request to provide them</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg mr-3">
              <DocumentMagnifyingGlassIcon className="w-6 h-6 text-white" />
            </div>
            Available Services
            <span className="ml-auto text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
              {availableServices.length} services
            </span>
          </h3>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
              {availableServices.length === 0 ? (
                <div className="text-center py-12">
                  <div className="p-4 bg-gray-100 rounded-full inline-block mb-4">
                    <DocumentTextIcon className="w-12 h-12 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No available services</h3>
                  <p className="text-gray-600">Check back later for new service opportunities</p>
                </div>
              ) : (
                availableServices
                  .filter(service => service && service.isActive && service._id)
                  .map((service) => (
                    <div key={service._id} className="border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-all duration-200 hover:border-blue-300 hover:scale-102">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-bold text-gray-900 flex-1 text-lg">{service?.title || 'Untitled Service'}</h4>
                        <span className="text-xs px-3 py-1 bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 rounded-full font-medium">
                          Available
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{service?.description || 'No description available'}</p>
                      <div className="grid grid-cols-2 gap-3 text-sm text-gray-600 mb-4">
                        <div className="flex items-center">
                          <BuildingOfficeIcon className="w-4 h-4 mr-1 text-blue-500" />
                          <span className="font-medium">Category:</span>
                          <span className="ml-1">{typeof service?.category === 'object' ? (service.category as { value: string }).value || 'N/A' : service?.category || 'N/A'}</span>
                        </div>
                        <div className="flex items-center">
                          <CurrencyDollarIcon className="w-4 h-4 mr-1 text-green-500" />
                          <span className="font-medium">Price:</span>
                          <span className="ml-1 font-bold text-green-600">₹{typeof service?.price === 'object' ? (service.price as { value: number }).value || 0 : service?.price || 0}</span>
                        </div>
                        <div className="flex items-center">
                          <ClockIcon className="w-4 h-4 mr-1 text-purple-500" />
                          <span className="font-medium">Duration:</span>
                          <span className="ml-1">{typeof service?.duration === 'object' ? `${(service.duration as { value: number; unit: string }).value || 0} ${(service.duration as { value: number; unit: string }).unit || 'hours'}` : service?.duration || '0 hours'}</span>
                        </div>
                        <div className="flex items-center">
                          <MapPinIcon className="w-4 h-4 mr-1 text-red-500" />
                          <span className="font-medium">Area:</span>
                          <span className="ml-1">{typeof service?.serviceArea === 'object' ? (service.serviceArea as any).value || 'N/A' : service?.serviceArea || 'N/A'}</span>
                        </div>
                      </div>
                      {service?.requirements && (
                        <div className="mb-3 p-3 bg-yellow-50 rounded-lg text-xs text-yellow-800 border border-yellow-200">
                          <strong className="flex items-center">
                            <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                            Requirements:
                          </strong> {typeof service.requirements === 'object' ? JSON.stringify(service.requirements) : service.requirements}
                        </div>
                      )}
                      {service?.tools && (
                        <div className="mb-3 p-3 bg-blue-50 rounded-lg text-xs text-blue-800 border border-blue-200">
                          <strong className="flex items-center">
                            <WrenchScrewdriverIcon className="w-4 h-4 mr-1" />
                            Tools:
                          </strong> {typeof service.tools === 'object' ? JSON.stringify(service.tools) : service.tools}
                        </div>
                      )}
                      <button
                        onClick={() => {
                          console.log('🔘 Button clicked! Service data:', service);
                          console.log('🔘 Service ID:', service._id);
                          console.log('🔘 Service title:', service.title);
                          handleRequestService(service._id);
                        }}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium shadow-md hover:shadow-lg hover:scale-105"
                        disabled={loading}
                      >
                        {loading ? (
                          <span className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Requesting...
                          </span>
                        ) : (
                          <span className="flex items-center justify-center">
                            <WrenchScrewdriverIcon className="w-4 h-4 mr-2" />
                            Request to Provide This Service
                          </span>
                        )}
                      </button>
                    </div>
                  ))
              )}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg mr-3">
              <WrenchScrewdriverIcon className="w-6 h-6 text-white" />
            </div>
            My Service Requests
            <span className="ml-auto text-sm bg-green-100 text-green-800 px-3 py-1 rounded-full font-medium">
              {myServices.length} requests
            </span>
          </h3>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
              {myServices.length === 0 ? (
                <div className="text-center py-12">
                  <div className="p-4 bg-gray-100 rounded-full inline-block mb-4">
                    <WrenchScrewdriverIcon className="w-12 h-12 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No service requests</h3>
                  <p className="text-gray-600 mb-4">Start by requesting services from the available section</p>
                  <button
                    onClick={() => document.querySelector('.grid')?.scrollIntoView({ behavior: 'smooth' })}
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
                  >
                    Browse Available Services
                    <ArrowRightIcon className="w-4 h-4 ml-2" />
                  </button>
                </div>
              ) : (
                myServices
                  .filter(myService => myService && myService._id)
                  .map((myService) => (
                    <div key={myService._id} className={`border rounded-xl p-4 hover:shadow-lg transition-all duration-200 hover:scale-102 ${
                      myService?.isApproved 
                        ? 'border-green-200 bg-green-50' 
                        : 'border-yellow-200 bg-yellow-50'
                    }`}>
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-bold text-gray-900 flex-1 text-lg">
                          {myService?.title || 'Untitled Service'}
                        </h4>
                        <span className={`text-xs px-3 py-1 rounded-full font-medium flex items-center ${
                          myService?.isApproved 
                            ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800' 
                            : 'bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-800'
                        }`}>
                          {myService?.isApproved ? (
                            <>
                              <CheckBadgeIcon className="w-4 h-4 mr-1" />
                              Approved
                            </>
                          ) : (
                            <>
                              <ClockIcon className="w-4 h-4 mr-1" />
                              Pending Approval
                            </>
                          )}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {myService?.description || 'No description available'}
                      </p>
                      <div className="grid grid-cols-2 gap-3 text-sm text-gray-600 mb-4">
                        <div className="flex items-center">
                          <BuildingOfficeIcon className="w-4 h-4 mr-1 text-blue-500" />
                          <span className="font-medium">Category:</span>
                          <span className="ml-1">{myService?.category || 'N/A'}</span>
                        </div>
                        <div className="flex items-center">
                          <CalendarIcon className="w-4 h-4 mr-1 text-purple-500" />
                          <span className="font-medium">Requested:</span>
                          <span className="ml-1">
                            {myService?.createdAt ? new Date(myService.createdAt).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                      </div>
                      {myService?.isApproved && (
                        <div className="mt-4 flex space-x-2">
                          <button className="flex-1 px-3 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 text-blue-700 rounded-lg hover:from-blue-100 hover:to-indigo-100 transition-all duration-200 font-medium text-sm hover:scale-105">
                            <EyeIcon className="w-4 h-4 mr-1" />
                            View Details
                          </button>
                          <button className="flex-1 px-3 py-2 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 text-yellow-700 rounded-lg hover:from-yellow-100 hover:to-orange-100 transition-all duration-200 font-medium text-sm hover:scale-105">
                            <PencilIcon className="w-4 h-4 mr-1" />
                            Edit Service
                          </button>
                        </div>
                      )}
                    </div>
                  ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
    );
  };

  const renderIncomingRequests = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">📢 Incoming Requests</h2>
          <p className="text-gray-600 mt-1">New booking requests from customers in your area</p>
        </div>
        <button
          onClick={fetchIncomingRequests}
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
              <ArrowPathIcon className="w-4 h-4 mr-2" />
              Refresh
            </>
          )}
        </button>
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
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
          ) : incomingRequests.length === 0 ? (
            <div className="text-center py-12">
              <BellAlertIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No incoming requests</h3>
              <p className="text-gray-600">You haven't received any broadcast booking requests yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {incomingRequests.map((booking) => {
                const timeRemaining = getTimeRemaining(booking.broadcastSentAt || booking.createdAt);
                const urgencyLevel = timeRemaining.minutes <= 1 ? 'high' : timeRemaining.minutes <= 3 ? 'medium' : 'low';
                const urgencyColors = {
                  high: 'border-red-300 bg-red-50',
                  medium: 'border-yellow-300 bg-yellow-50', 
                  low: 'border-purple-200 bg-purple-50'
                };
                const timerColors = {
                  high: 'text-red-600 bg-red-100',
                  medium: 'text-yellow-600 bg-yellow-100',
                  low: 'text-purple-600 bg-purple-100'
                };
                
                return (
                  <div key={booking._id} className={`border rounded-lg p-6 hover:shadow-md transition-all ${urgencyColors[urgencyLevel]}`}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">
                          {booking.service?.title || 'Unknown Service'}
                        </h4>
                        <div className="space-y-2">
                          <div className="flex items-center text-sm text-gray-600">
                            <UserIcon className="w-4 h-4 mr-2" />
                            <span className="font-medium">Customer:</span> {booking.customer.name}
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <PhoneIcon className="w-4 h-4 mr-2" />
                            <span className="font-medium">Contact:</span> {booking.customer.phone}
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <EnvelopeIcon className="w-4 h-4 mr-2" />
                            <span className="font-medium">Email:</span> {booking.customer.email}
                          </div>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <div className="flex flex-col items-end space-y-2">
                          <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                            <BellIcon className="w-4 h-4 mr-1" />
                            BROADCAST REQUEST
                          </span>
                          <div className={`px-3 py-2 rounded-lg font-mono text-sm font-bold ${timerColors[urgencyLevel]} border ${urgencyLevel === 'high' ? 'border-red-300 animate-pulse' : urgencyLevel === 'medium' ? 'border-yellow-300' : 'border-purple-200'}`}>
                            <ClockIcon className="w-4 h-4 mr-1 inline" />
                            {String(timeRemaining.minutes).padStart(2, '0')}:{String(timeRemaining.seconds).padStart(2, '0')}
                          </div>
                          <p className="text-lg font-bold text-gray-900">
                            ₹{booking.totalAmount || booking.price?.totalPrice || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
                    <div>
                      <p className="text-gray-600 font-medium mb-1">Scheduled Date & Time</p>
                      <p className="text-gray-900">
                        {new Date(booking.scheduledDate).toLocaleDateString()} at {booking.scheduledTime || 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 font-medium mb-1">Service Address</p>
                      <p className="text-gray-900">
                        {typeof booking.address === 'string' 
                          ? booking.address 
                          : `${booking.address?.street || ''}, ${booking.address?.city || ''}, ${booking.address?.state || ''} - ${booking.address?.pincode || ''}`
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 font-medium mb-1">Distance from You</p>
                      <div className="flex items-center">
                        {getBookingDistance(booking) !== null ? (
                          <>
                            <MapPinIcon className="w-4 h-4 mr-1 text-blue-500" />
                            <span className="font-medium text-gray-900">
                              {getBookingDistance(booking)?.toFixed(1)} km
                            </span>
                          </>
                        ) : (
                          <span className="text-gray-500">
                            {locationSharingEnabled ? 'Calculating...' : 'Enable location tracking'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {booking.notes && (
                    <div className="mb-4 p-3 bg-white rounded-lg border border-gray-200">
                      <p className="text-gray-600 text-sm font-medium mb-1">Customer Notes:</p>
                      <p className="text-gray-900 text-sm">{booking.notes}</p>
                    </div>
                  )}

                  <div className="flex justify-end space-x-3">
                    <Link
                      to={`/provider/tracking/${booking._id}`}
                      className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm flex items-center"
                    >
                      <MapPinIcon className="w-4 h-4 mr-2" />
                      View Details
                    </Link>
                    <button
                      onClick={() => handleRejectBroadcastRequest(booking._id)}
                      className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium text-sm flex items-center"
                      disabled={loading}
                    >
                      <XMarkIcon className="w-4 h-4 mr-2" />
                      Not Interested
                    </button>
                    <button
                      onClick={() => handleAcceptBooking(booking._id)}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-sm flex items-center"
                      disabled={loading}
                    >
                      <CheckCircleIcon className="w-4 h-4 mr-2" />
                      Accept Request
                    </button>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'services':
        return renderServices();
      case 'incoming':
        return renderIncomingRequests();
      case 'bookings':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Booking Requests</h2>
              <button
                onClick={fetchBookings}
                className="btn btn-outline"
                disabled={loading}
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <span className="text-red-400">⚠️</span>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <div className="mt-2 text-sm text-red-700">
                      {error}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white shadow rounded-lg">
              <div className="p-6">
                {loading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  </div>
                ) : bookings.length === 0 ? (
                  <div className="text-center py-12">
                    <span className="text-4xl">📅</span>
                    <h3 className="mt-4 text-lg font-medium text-gray-900">No booking requests</h3>
                    <p className="mt-2 text-gray-600">You haven't received any booking requests yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bookings.map((booking) => (
                      <div key={booking._id} className="border border-gray-200 rounded-lg p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="text-lg font-medium text-gray-900">{booking.service?.title || 'Unknown Service'}</h4>
                            <div className="mt-1 space-y-1">
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Customer:</span> {booking.customer.name}
                              </p>
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Contact:</span> {booking.customer.phone}
                              </p>
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Email:</span> {booking.customer.email}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                              booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              booking.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                              booking.status === 'in_progress' ? 'bg-purple-100 text-purple-800' :
                              booking.status === 'completed' ? 'bg-green-100 text-green-800' :
                              booking.status === 'broadcast' ? 'bg-purple-100 text-purple-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {booking.status === 'broadcast' ? '📢 BROADCAST' : booking.status.replace('_', ' ').toUpperCase()}
                            </span>
                            <p className="text-lg font-semibold text-gray-900 mt-2">
                              ₹{booking.totalAmount || booking.price?.totalPrice || 'N/A'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
                          <div>
                            <p className="text-gray-600">Scheduled Date & Time</p>
                            <p className="font-medium text-gray-900">
                              {new Date(booking.scheduledDate).toLocaleDateString()} at {booking.scheduledTime}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">Service Address</p>
                            <p className="font-medium text-gray-900">
                              {typeof booking.address === 'string' 
                                ? booking.address 
                                : `${booking.address?.street || ''}, ${booking.address?.city || ''}, ${booking.address?.state || ''} - ${booking.address?.pincode || ''}`
                              }
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">Distance from Your Location</p>
                            <div className="flex items-center">
                              {getBookingDistance(booking) !== null ? (
                                <>
                                  <MapPinIcon className="w-4 h-4 mr-1 text-blue-500" />
                                  <span className="font-medium text-gray-900">
                                    {getBookingDistance(booking)?.toFixed(1)} km
                                  </span>
                                </>
                              ) : (
                                <span className="text-gray-500">
                                  {locationSharingEnabled ? 'Calculating...' : 'Enable location tracking'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {booking.notes && (
                          <div className="mb-4">
                            <p className="text-gray-600 text-sm">Customer Notes:</p>
                            <p className="text-gray-900 bg-gray-50 p-3 rounded">{booking.notes}</p>
                          </div>
                        )}

                        <div className="flex justify-end space-x-3">
                          <Link
                            to={`/provider/tracking/${booking._id}`}
                            className="btn btn-outline text-sm"
                          >
                            Track Booking
                          </Link>
                          {booking.status === 'broadcast' && (
                            <button
                              onClick={() => handleAcceptBooking(booking._id)}
                              className="btn btn-primary text-sm"
                              disabled={loading}
                            >
                              📢 Accept Booking
                            </button>
                          )}
                          {booking.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleRejectBooking(booking._id)}
                                className="btn btn-outline text-sm text-red-600 hover:text-red-700"
                                disabled={loading}
                              >
                                Reject
                              </button>
                              <button
                                onClick={() => handleAcceptBooking(booking._id)}
                                className="btn btn-primary text-sm"
                                disabled={loading}
                              >
                                Accept Booking
                              </button>
                            </>
                          )}
                          {booking.status === 'confirmed' && (
                            <button
                              onClick={() => handleStartBooking(booking._id)}
                              className={`btn text-sm ${
                                activeBookingId === booking._id 
                                  ? 'bg-green-600 text-white' 
                                  : 'btn-primary'
                              }`}
                              disabled={loading || activeBookingId === booking._id}
                            >
                              {activeBookingId === booking._id 
                                ? '📍 Tracking Active' 
                                : 'Start Service'
                              }
                            </button>
                          )}
                          {booking.status === 'in_progress' && (
                            <button
                              onClick={() => handleCompleteBooking(booking._id)}
                              className="btn btn-primary text-sm"
                              disabled={loading}
                            >
                              Complete Service
                            </button>
                          )}
                          {booking.status === 'completed' && (
                            <div className="flex items-center text-green-600">
                              <span className="text-lg mr-2">✓</span>
                              <span className="font-medium">Completed</span>
                            </div>
                          )}
                          {booking.status === 'cancelled' && (
                            <div className="flex items-center text-red-600">
                              <span className="text-lg mr-2">✗</span>
                              <span className="font-medium">Cancelled</span>
                            </div>
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
      case 'earnings':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">Earnings Dashboard</h2>
                <p className="text-gray-600 mt-2">Track your income and financial performance</p>
              </div>
              <button
                onClick={fetchEarningsData}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center"
              >
                <ArrowPathIcon className="w-4 h-4 mr-2" />
                Refresh
              </button>
            </div>

            {/* Earnings Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 text-white shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <BanknotesIcon className="w-8 h-8 text-green-100" />
                  <span className="text-xs bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full">Total</span>
                </div>
                <p className="text-3xl font-bold mb-2">₹{earningsData.totalEarnings.toLocaleString()}</p>
                <p className="text-green-100 text-sm">Lifetime earnings</p>
              </div>

              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 text-white shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <CalendarIcon className="w-8 h-8 text-blue-100" />
                  <span className="text-xs bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full">This Month</span>
                </div>
                <p className="text-3xl font-bold mb-2">₹{earningsData.thisMonth.toLocaleString()}</p>
                <p className="text-blue-100 text-sm">Monthly earnings</p>
              </div>

              <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl p-6 text-white shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <CheckCircleIcon className="w-8 h-8 text-purple-100" />
                  <span className="text-xs bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full">Completed</span>
                </div>
                <p className="text-3xl font-bold mb-2">{earningsData.completedBookings}</p>
                <p className="text-purple-100 text-sm">Total bookings</p>
              </div>

              <div className="bg-gradient-to-br from-yellow-500 to-orange-600 rounded-2xl p-6 text-white shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <StarSolidIcon className="w-8 h-8 text-yellow-100" />
                  <span className="text-xs bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full">Rating</span>
                </div>
                <p className="text-3xl font-bold mb-2">{earningsData.averageRating.toFixed(1)}</p>
                <p className="text-yellow-100 text-sm">Average rating</p>
              </div>
            </div>

            {/* Earnings Chart Placeholder */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                <ChartPieIcon className="w-6 h-6 mr-2 text-blue-500" />
                Earnings Overview
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Monthly Performance</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">This Month</span>
                      <span className="font-bold text-green-600">₹{earningsData.thisMonth.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Last Month</span>
                      <span className="font-bold text-blue-600">₹{earningsData.lastMonth.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Growth</span>
                      <span className={`font-bold ${earningsData.thisMonth >= earningsData.lastMonth ? 'text-green-600' : 'text-red-600'}`}>
                        {earningsData.lastMonth > 0 ? ((earningsData.thisMonth - earningsData.lastMonth) / earningsData.lastMonth * 100).toFixed(1) : '0'}%
                      </span>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Service Performance</h4>
                  <div className="space-y-3">
                    {myServices.filter(s => s && s.isApproved).slice(0, 3).map((service, index) => (
                      <div key={service?._id || index} className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 truncate flex-1 mr-2">{service?.title || 'Unknown Service'}</span>
                        <span className="font-bold text-blue-600">{Math.floor(Math.random() * 10) + 1} bookings</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                <QueueListIcon className="w-6 h-6 mr-2 text-purple-500" />
                Recent Completed Bookings
              </h3>
              <div className="space-y-3">
                {bookings.filter(b => b.status === 'completed').slice(0, 5).map((booking) => (
                  <div key={booking._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <CheckCircleIcon className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{booking.service?.title || 'Unknown Service'}</p>
                        <p className="text-sm text-gray-600">{booking.customer.name} • {new Date(booking.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">₹{booking.totalAmount || booking.price?.totalPrice || 0}</p>
                      <p className="text-xs text-gray-500">Completed</p>
                    </div>
                  </div>
                ))}
                {bookings.filter(b => b.status === 'completed').length === 0 && (
                  <div className="text-center py-8">
                    <BanknotesIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600">No completed bookings yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      case 'profile':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Profile Settings</h2>
                <p className="text-gray-600 mt-2">Manage your professional information and preferences</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{user?.name}</h3>
                  <p className="text-gray-600">{user?.email}</p>
                  <div className="flex items-center space-x-2 mt-2">
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
                      {user?.role?.toUpperCase()}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${getKycStatusColor(kycStatus)}`}>
                      KYC {kycStatus?.toUpperCase() || 'NOT SUBMITTED'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 flex items-center">
                    <UserIcon className="w-5 h-5 mr-2 text-blue-500" />
                    Personal Information
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm text-gray-600">Full Name</label>
                      <p className="font-medium text-gray-900">{user?.name}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Email Address</label>
                      <p className="font-medium text-gray-900">{user?.email}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Phone Number</label>
                      <p className="font-medium text-gray-900">{user?.phone}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 flex items-center">
                    <ChartBarIcon className="w-5 h-5 mr-2 text-green-500" />
                    Professional Stats
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm text-gray-600">Member Since</label>
                      <p className="font-medium text-gray-900">{'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Total Services</label>
                      <p className="font-medium text-gray-900">{myServices.length}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Completed Bookings</label>
                      <p className="font-medium text-gray-900">{earningsData.completedBookings}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <button className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium">
                  Edit Profile
                </button>
              </div>
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Settings</h2>
                <p className="text-gray-600 mt-2">Manage your account settings and preferences</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                <CogIcon className="w-6 h-6 mr-2 text-purple-500" />
                Account Settings
              </h3>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <BellIcon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Email Notifications</p>
                      <p className="text-sm text-gray-600">Receive booking updates via email</p>
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                    Enable
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <MapPinIcon className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Location Services</p>
                      <p className="text-sm text-gray-600">Share location for better service matching</p>
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium">
                    Enable
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <ShieldCheckIcon className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Privacy Settings</p>
                      <p className="text-sm text-gray-600">Control your data and privacy preferences</p>
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium">
                    Configure
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                <CreditCardIcon className="w-6 h-6 mr-2 text-green-500" />
                Payment Settings
              </h3>
              
              <div className="space-y-4">
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Wallet Balance</p>
                      <p className="text-2xl font-bold text-green-600">₹2,500</p>
                    </div>
                    <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium">
                      Add Funds
                    </button>
                  </div>
                </div>
                
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Payment Methods</p>
                      <p className="text-sm text-gray-600">Manage your payment options</p>
                    </div>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                      Manage
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return renderServices();
    }
  };

  // Show loading while user authentication is being checked
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Show error if no user found
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-6">Please log in to access your provider dashboard</p>
          <Link 
            to="/login" 
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Provider Dashboard</h1>
              <p className="text-gray-600 mt-2">Manage your services and grow your business</p>
            </div>
            
            {/* API Status Indicator */}
            <div className="flex items-center">
              <div className={`w-2 h-2 rounded-full mr-2 ${
                apiStatus === 'connected' ? 'bg-green-500' : 
                apiStatus === 'checking' ? 'bg-yellow-500' : 'bg-red-500'
              }`}></div>
              <span className="text-sm text-gray-600">
                {apiStatus === 'connected' ? 'API Connected' : 
                 apiStatus === 'checking' ? 'Checking API...' : 'API Disconnected'}
              </span>
            </div>
          </div>  
          
          {/* KYC Status Alert */}
          {kycStatus && kycStatus !== 'approved' && (
            <div className={`mt-4 border rounded-lg p-4 ${
              kycStatus === 'pending' 
                ? 'bg-yellow-50 border-yellow-200' 
                : kycStatus === 'rejected'
                ? 'bg-red-50 border-red-200'
                : 'bg-blue-50 border-blue-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`w-2 h-2 rounded-full mr-2 ${
                    kycStatus === 'pending' 
                      ? 'bg-yellow-500 animate-pulse' 
                      : kycStatus === 'rejected'
                      ? 'bg-red-500'
                      : 'bg-blue-500'
                  }`}></div>
                  <span className={`font-medium ${
                    kycStatus === 'pending' 
                      ? 'text-yellow-800' 
                      : kycStatus === 'rejected'
                      ? 'text-red-800'
                      : 'text-blue-800'
                  }`}>
                    {kycStatus === 'pending' && '📋 KYC Verification Pending'}
                    {kycStatus === 'rejected' && '❌ KYC Verification Rejected'}
                    {!kycStatus && '🔒 Complete KYC Verification'}
                  </span>
                </div>
                <Link
                  to="/provider/kyc"
                  className="btn btn-primary text-sm"
                >
                  {kycStatus === 'pending' ? 'View Documents' : 'Complete KYC'}
                </Link>
              </div>
              {kycStatus === 'rejected' && (
                <p className="mt-2 text-sm text-red-700">
                  Your KYC documents were rejected. Please re-submit with correct documents.
                </p>
              )}
              {!kycStatus && (
                <p className="mt-2 text-sm text-blue-700">
                  Complete your KYC verification to start offering services and receive bookings.
                </p>
              )}
            </div>
          )}
          
          {/* KYC Approved Badge */}
          {kycStatus === 'approved' && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <span className="text-green-800 font-medium">
                  ✅ KYC Verified - Your account is fully verified
                </span>
              </div>
            </div>
          )}
          
          {/* Location Tracking Status */}
          {isTrackingLocation && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                  <span className="text-green-800 font-medium">
                    📍 Location Tracking Active for Booking #{activeBookingId?.slice(-8)}
                  </span>
                </div>
                <button
                  onClick={stopLocationTracking}
                  className="btn btn-outline text-sm text-red-600 hover:text-red-700"
                >
                  Stop Tracking
                </button>
              </div>
              {currentLocation && (
                <div className="mt-2 text-sm text-green-700">
                  📍 Current: {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mb-8">
          <nav className="flex space-x-1 bg-white rounded-xl shadow-lg p-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 ${
                    activeTab === item.id
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {item.label}
                  {item.id === 'services' && myServices.length > 0 && (
                    <span className="ml-2 bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">
                      {myServices.length}
                    </span>
                  )}
                  {item.id === 'incoming' && incomingRequests.length > 0 && (
                    <span className="ml-2 bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">
                      {incomingRequests.length}
                    </span>
                  )}
                  {item.id === 'bookings' && bookings.length > 0 && (
                    <span className="ml-2 bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">
                      {bookings.length}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {renderContent()}
      </div>
    </div>
  );
};

export default ProviderDashboard;
