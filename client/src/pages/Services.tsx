import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RootState } from '../store';
import api from '../services/api';
import { servicesAPI, bookingsAPI, walletAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  MapPinIcon,
  ClockIcon,
  CurrencyRupeeIcon,
  UserGroupIcon,
  TagIcon,
  SparklesIcon,
  ArrowRightIcon,
  XMarkIcon,
  CalendarIcon,
  HomeIcon,
  UserIcon,
  WalletIcon,
  CreditCardIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

interface Service {
  _id: string;
  title: string;
  description: string;
  category: string;
  subcategory: string;
  price: number;
  priceType: string;
  duration: {
    value: number;
    unit: string;
  };
  serviceArea: string;
  isActive: boolean;
  isApproved: boolean;
  provider: null; // Service types have no provider
  createdBy: 'admin';
  providerCount?: number; // Number of providers offering this service
}

const Services: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);

  const categories = [
    { value: 'home_cleaning', label: 'Home Cleaning' },
    { value: 'beauty_wellness', label: 'Beauty & Wellness' },
    { value: 'appliance_repair', label: 'Appliance Repair' },
    { value: 'plumbing', label: 'Plumbing' },
    { value: 'electrical', label: 'Electrical' },
    { value: 'carpentry', label: 'Carpentry' },
    { value: 'painting', label: 'Painting' },
    { value: 'pest_control', label: 'Pest Control' },
    { value: 'packers_movers', label: 'Packers & Movers' },
    { value: 'home_tutoring', label: 'Home Tutoring' },
    { value: 'fitness_training', label: 'Fitness Training' },
    { value: 'event_management', label: 'Event Management' },
    { value: 'photography', label: 'Photography' },
    { value: 'web_development', label: 'Web Development' },
    { value: 'digital_marketing', label: 'Digital Marketing' }
  ];

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/services/public');
      
      // Remove duplicates based on title + category combination
      const uniqueServices = response.data.services || [];
      const seen = new Set();
      const deduplicatedServices = uniqueServices.filter((service: Service) => {
        const key = `${service.title.toLowerCase()}-${service.category}`;
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });
      
      setServices(deduplicatedServices);
    } catch (err: any) {
      console.error('Error fetching services:', err);
      setError(err.response?.data?.message || 'Failed to fetch services');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    const filters: any = {};
    if (searchTerm) filters.search = searchTerm;
    if (selectedCategory) filters.category = selectedCategory;
    if (priceRange.min) filters.minPrice = priceRange.min;
    if (priceRange.max) filters.maxPrice = priceRange.max;
    
    fetchFilteredServices(filters);
  };

  const fetchFilteredServices = async (filters: any) => {
    try {
      setLoading(true);
      setError(null);
      const response = await servicesAPI.getServices(filters);
      
      // Remove duplicates based on title + category combination
      const uniqueServices = response.services || [];
      const seen = new Set();
      const deduplicatedServices = uniqueServices.filter((service: Service) => {
        const key = `${service.title.toLowerCase()}-${service.category}`;
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });
      
      setServices(deduplicatedServices);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch services');
    } finally {
      setLoading(false);
    }
  };

  const handleBookService = (service: Service) => {
    if (!user) {
      toast.error('Please login to book a service');
      navigate('/login');
      return;
    }
    
    if (user.role !== 'customer') {
      toast.error('Only customers can book services');
      return;
    }

    setSelectedService(service);
    setShowBookingModal(true);
  };

  const handleConfirmBooking = async (bookingData: any) => {
    if (!selectedService) return;

    try {
      setBookingLoading(true);
      
      // Use current date/time for instant booking
      const currentDateTime = new Date().toISOString();
      
      const bookingPayload = {
        service: selectedService._id,
        scheduledDate: currentDateTime, // Current date for instant booking
        duration: selectedService.duration,
        price: {
          basePrice: selectedService.price,
          additionalCharges: 0,
          discount: 0,
          totalPrice: selectedService.price
        },
        serviceArea: selectedService.serviceArea,
        address: {
          ...bookingData.address,
          coordinates: bookingData.address.coordinates
        },
        notes: bookingData.notes || '',
        paymentMethod: bookingData.paymentMethod,
        // Add location type for backend processing
        locationType: bookingData.useCurrentLocation ? 'current' : 'manual'
      };

      const response = await bookingsAPI.createBooking(bookingPayload);
      
      // If wallet payment, process wallet debit
      if (bookingData.paymentMethod === 'wallet' && response.booking) {
        try {
          await walletAPI.debit({
            amount: selectedService.price,
            description: `Payment for ${selectedService.title}`,
            referenceId: response.booking._id,
            referenceType: 'booking',
            metadata: {
              serviceTitle: selectedService.title,
              serviceId: selectedService._id,
              bookingDate: currentDateTime
            }
          });
        } catch (walletError) {
          console.error('Wallet payment failed:', walletError);
          toast.error('Booking created but wallet payment failed. Please contact support.');
        }
      }
      
      toast.success('Instant booking request sent! Providers within 7km will be notified immediately.');
      setShowBookingModal(false);
      setSelectedService(null);
      
      // Navigate to bookings page to see status
      navigate('/dashboard', { state: { newBooking: response.booking } });
      
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create booking');
    } finally {
      setBookingLoading(false);
    }
  };

  const getCategoryLabel = (category: string) => {
    const cat = categories.find(c => c.value === category);
    return cat ? cat.label : category;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mx-auto"></div>
            <SparklesIcon className="absolute top-0 left-0 h-16 w-16 text-blue-600 animate-pulse" />
          </div>
          <p className="mt-6 text-gray-600 font-medium">Loading amazing services...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Modern Header */}
      <div className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-xl shadow-lg">
                <SparklesIcon className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Available Services
                </h1>
                <p className="text-gray-600 mt-1 flex items-center">
                  <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                  Book professional services - providers will be notified instantly
                </p>
              </div>
            </div>
            {user?.role === 'customer' && (
              <button 
                onClick={() => navigate('/dashboard')}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center space-x-2"
              >
                <CalendarIcon className="h-5 w-5" />
                <span>My Bookings</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modern Search and Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="flex items-center mb-6">
            <FunnelIcon className="h-6 w-6 text-blue-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">Find Your Perfect Service</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <MagnifyingGlassIcon className="h-4 w-4 mr-2 text-blue-600" />
                Search
              </label>
              <input
                type="text"
                placeholder="What service do you need?"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <TagIcon className="h-4 w-4 mr-2 text-blue-600" />
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <CurrencyRupeeIcon className="h-4 w-4 mr-2 text-blue-600" />
                Min Price
              </label>
              <input
                type="number"
                placeholder="Min amount"
                value={priceRange.min}
                onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <CurrencyRupeeIcon className="h-4 w-4 mr-2 text-blue-600" />
                Max Price
              </label>
              <input
                type="number"
                placeholder="Max amount"
                value={priceRange.max}
                onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>
          </div>
          
          <div className="mt-8 flex justify-center">
            <button
              onClick={handleSearch}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center space-x-3"
            >
              <MagnifyingGlassIcon className="h-5 w-5" />
              <span>Search Services</span>
            </button>
          </div>
        </div>
      </div>

      {/* Services List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {error && (
          <div className="mb-8 bg-red-50 border border-red-200 rounded-xl p-6 flex items-center">
            <XMarkIcon className="h-6 w-6 text-red-500 mr-3" />
            <p className="text-red-800 font-medium">{error}</p>
          </div>
        )}

        {services.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-gray-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
              <MagnifyingGlassIcon className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-3">No services found</h3>
            <p className="text-gray-600 text-lg">Try adjusting your search criteria or browse all categories</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service) => (
              <div key={service._id} className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 overflow-hidden border border-gray-100">
                <div className="p-8">
                  <div className="flex justify-between items-start mb-6">
                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {service.title}
                    </h3>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="bg-green-100 text-green-800 text-sm font-semibold px-3 py-1 rounded-full">
                        Available
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 mb-6 line-clamp-3 leading-relaxed">{service.description}</p>
                  
                  <div className="space-y-4 mb-6">
                    <div className="flex items-center text-sm text-gray-600">
                      <TagIcon className="h-5 w-5 mr-3 text-blue-500" />
                      <span className="font-medium">{getCategoryLabel(service.category)}</span>
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-600">
                      <ClockIcon className="h-5 w-5 mr-3 text-blue-500" />
                      <span>{service.duration.value} {service.duration.unit}</span>
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPinIcon className="h-5 w-5 mr-3 text-blue-500" />
                      <span>{service.serviceArea}</span>
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-600">
                      <UserGroupIcon className="h-5 w-5 mr-3 text-blue-500" />
                      <span>Multiple providers available</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center pt-6 border-t border-gray-100">
                    <div>
                      <div className="flex items-center">
                        <CurrencyRupeeIcon className="h-6 w-6 text-green-600 mr-1" />
                        <p className="text-3xl font-bold text-gray-900">{service.price}</p>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{service.priceType}</p>
                    </div>
                    
                    <button
                      onClick={() => handleBookService(service)}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center space-x-2"
                    >
                      <span>Book Now</span>
                      <ArrowRightIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Booking Modal */}
      {showBookingModal && selectedService && (
        <BookingModal
          service={selectedService}
          onClose={() => setShowBookingModal(false)}
          onConfirm={handleConfirmBooking}
          loading={bookingLoading}
        />
      )}
    </div>
  );
};

// Booking Modal Component
interface BookingModalProps {
  service: Service;
  onClose: () => void;
  onConfirm: (data: any) => void;
  loading: boolean;
}

const BookingModal: React.FC<BookingModalProps> = ({ service, onClose, onConfirm, loading }) => {
  const [bookingData, setBookingData] = useState({
    address: {
      street: '',
      city: '',
      state: '',
      pincode: '',
      coordinates: { lat: null as number | null, lng: null as number | null }
    },
    notes: '',
    useCurrentLocation: false,
    paymentMethod: 'wallet'
  });
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletLoading, setWalletLoading] = useState(false);

  // Fetch wallet balance on component mount
  useEffect(() => {
    fetchWalletBalance();
  }, []);

  const fetchWalletBalance = async () => {
    try {
      setWalletLoading(true);
      const response = await walletAPI.getBalance();
      if (response.success) {
        setWalletBalance(response.balance);
      }
    } catch (error) {
      console.error('Failed to fetch wallet balance:', error);
    } finally {
      setWalletLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate
    if (!bookingData.useCurrentLocation && (!bookingData.address.street || !bookingData.address.city || !bookingData.address.state || !bookingData.address.pincode)) {
      toast.error('Please complete all address fields or use current location');
      return;
    }
    
    if (bookingData.useCurrentLocation && !bookingData.address.coordinates.lat) {
      toast.error('Please enable location detection or enter address manually');
      return;
    }

    // Validate wallet balance if wallet payment selected
    if (bookingData.paymentMethod === 'wallet' && walletBalance < service.price) {
      toast.error('Insufficient wallet balance. Please recharge your wallet or choose another payment method.');
      return;
    }
    
    onConfirm(bookingData);
  };

  const handleGetCurrentLocation = () => {
    setLocationLoading(true);
    setLocationError('');
    
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      setLocationLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          // Get address from coordinates using reverse geocoding
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await response.json();
          
          if (data && data.address) {
            const address = data.address;
            setBookingData(prev => ({
              ...prev,
              address: {
                street: address.road || address.house_number || 'Current Location',
                city: address.city || address.town || address.village || 'Unknown City',
                state: address.state || address.state_district || 'Unknown State',
                pincode: address.postcode || '000000',
                coordinates: { lat: latitude, lng: longitude }
              },
              useCurrentLocation: true
            }));
          } else {
            // If reverse geocoding fails, at least save coordinates with default address
            setBookingData(prev => ({
              ...prev,
              address: {
                street: 'Current Location',
                city: 'Unknown City',
                state: 'Unknown State',
                pincode: '000000',
                coordinates: { lat: latitude, lng: longitude }
              },
              useCurrentLocation: true
            }));
          }
        } catch (error) {
          // If API fails, at least save coordinates with default address
          setBookingData(prev => ({
            ...prev,
            address: {
              street: 'Current Location',
              city: 'Unknown City',
              state: 'Unknown State',
              pincode: '000000',
              coordinates: { lat: latitude, lng: longitude }
            },
            useCurrentLocation: true
          }));
        }
        
        setLocationLoading(false);
        toast.success('Location detected successfully!');
      },
      (error) => {
        setLocationError('Unable to retrieve your location. Please enable location permissions or enter address manually.');
        setLocationLoading(false);
      }
    );
  };

  const handleManualAddress = () => {
    setBookingData(prev => ({
      ...prev,
      useCurrentLocation: false,
      address: {
        ...prev.address,
        coordinates: { lat: null, lng: null }
      }
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-xl shadow-lg">
                <SparklesIcon className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Book Service</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          
          <div className="mb-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-100">
            <h3 className="font-bold text-xl text-gray-900 mb-3">{service.title}</h3>
            <p className="text-gray-600 mb-4 leading-relaxed">{service.description}</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CurrencyRupeeIcon className="h-8 w-8 text-green-600 mr-2" />
                <p className="text-3xl font-bold text-gray-900">{service.price}</p>
                <span className="text-gray-500 ml-3">{service.priceType}</span>
              </div>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <ClockIcon className="h-5 w-5 mr-2 text-blue-500" />
                  {service.duration.value} {service.duration.unit}
                </div>
                <div className="flex items-center">
                  <MapPinIcon className="h-5 w-5 mr-2 text-blue-500" />
                  {service.serviceArea}
                </div>
              </div>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <MapPinIcon className="h-4 w-4 mr-2 text-blue-600" />
                Service Location *
              </label>
              
              {/* Location Selection */}
              <div className="space-y-4">
                {/* Location Options */}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleGetCurrentLocation}
                    disabled={locationLoading}
                    className={`flex-1 px-4 py-3 rounded-xl border-2 transition-all duration-200 font-medium flex items-center justify-center ${
                      bookingData.useCurrentLocation
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    } ${locationLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {locationLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                        Detecting Location...
                      </>
                    ) : (
                      <>
                        <MapPinIcon className="h-4 w-4 mr-2" />
                        Use Current Location
                      </>
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={handleManualAddress}
                    className={`flex-1 px-4 py-3 rounded-xl border-2 transition-all duration-200 font-medium flex items-center justify-center ${
                      !bookingData.useCurrentLocation
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <HomeIcon className="h-4 w-4 mr-2" />
                    Enter Address Manually
                  </button>
                </div>
                
                {locationError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{locationError}</p>
                  </div>
                )}
                
                {/* Manual Address Fields */}
                {!bookingData.useCurrentLocation && (
                  <div className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <input
                      type="text"
                      placeholder="Street Address"
                      value={bookingData.address.street}
                      onChange={(e) => setBookingData({
                        ...bookingData,
                        address: { ...bookingData.address, street: e.target.value }
                      })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      required
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="City"
                        value={bookingData.address.city}
                        onChange={(e) => setBookingData({
                          ...bookingData,
                          address: { ...bookingData.address, city: e.target.value }
                        })}
                        className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        required
                      />
                      <input
                        type="text"
                        placeholder="State"
                        value={bookingData.address.state}
                        onChange={(e) => setBookingData({
                          ...bookingData,
                          address: { ...bookingData.address, state: e.target.value }
                        })}
                        className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        required
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Pincode"
                      value={bookingData.address.pincode}
                      onChange={(e) => setBookingData({
                        ...bookingData,
                        address: { ...bookingData.address, pincode: e.target.value }
                      })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      required
                    />
                  </div>
                )}
                
                {/* Current Location Display */}
                {bookingData.useCurrentLocation && bookingData.address.coordinates.lat && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                    <div className="flex items-center mb-2">
                      <MapPinIcon className="h-4 w-4 text-green-600 mr-2" />
                      <p className="text-sm font-semibold text-green-800">Location Detected</p>
                    </div>
                    <p className="text-sm text-green-700">
                      {bookingData.address.street && `${bookingData.address.street}, `}
                      {bookingData.address.city && `${bookingData.address.city}, `}
                      {bookingData.address.state && `${bookingData.address.state} `}
                      {bookingData.address.pincode && `- ${bookingData.address.pincode}`}
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      Coordinates: {bookingData.address.coordinates.lat?.toFixed(6)}, {bookingData.address.coordinates.lng?.toFixed(6)}
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <WalletIcon className="h-4 w-4 mr-2 text-blue-600" />
                Payment Method *
              </label>
              
              <div className="space-y-3">
                {/* Wallet Payment Option */}
                <label className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                  bookingData.paymentMethod === 'wallet' 
                    ? 'border-purple-500 bg-purple-50' 
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="wallet"
                    checked={bookingData.paymentMethod === 'wallet'}
                    onChange={(e) => setBookingData({ ...bookingData, paymentMethod: e.target.value })}
                    className="mr-3"
                  />
                  <div className="flex items-center flex-1">
                    <WalletIcon className="h-5 w-5 mr-3 text-purple-600" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Wallet Payment</p>
                      <p className="text-sm text-gray-600">
                        {walletLoading ? 'Loading balance...' : `Available balance: Rs. ${walletBalance}`}
                      </p>
                    </div>
                    {walletBalance >= service.price && (
                      <CheckCircleIcon className="h-5 w-5 text-green-600" />
                    )}
                  </div>
                </label>

                {/* Card/Other Payment Option */}
                <label className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                  bookingData.paymentMethod === 'card' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="card"
                    checked={bookingData.paymentMethod === 'card'}
                    onChange={(e) => setBookingData({ ...bookingData, paymentMethod: e.target.value })}
                    className="mr-3"
                  />
                  <div className="flex items-center flex-1">
                    <CreditCardIcon className="h-5 w-5 mr-3 text-blue-600" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Card/UPI/Net Banking</p>
                      <p className="text-sm text-gray-600">Pay online after service completion</p>
                    </div>
                  </div>
                </label>

                {/* Insufficient Balance Warning */}
                {bookingData.paymentMethod === 'wallet' && walletBalance < service.price && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      <strong>Insufficient balance:</strong> You need Rs. {service.price - walletBalance} more to complete this booking.
                      <button
                        type="button"
                        onClick={() => window.open('/wallet', '_blank')}
                        className="ml-2 text-purple-600 hover:text-purple-700 font-medium underline"
                      >
                        Recharge Wallet
                      </button>
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <UserIcon className="h-4 w-4 mr-2 text-blue-600" />
                Additional Notes (Optional)
              </label>
              <textarea
                placeholder="Any specific requirements or details about the service..."
                value={bookingData.notes}
                onChange={(e) => setBookingData({ ...bookingData, notes: e.target.value })}
                rows={4}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
              />
            </div>
            
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6">
              <div className="flex items-start space-x-3">
                <div className="bg-blue-600 p-2 rounded-lg">
                  <SparklesIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-blue-900 mb-2">📢 Instant Booking (7km Range)</p>
                  <p className="text-sm text-blue-800 leading-relaxed">
                    Your request will be sent immediately to verified providers within 7km of your location. The first provider to accept will be assigned to your booking.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm Booking</span>
                    <ArrowRightIcon className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Services;
