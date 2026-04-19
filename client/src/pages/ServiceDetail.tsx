import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { servicesAPI, bookingsAPI } from '../services/api';
import toast from 'react-hot-toast';

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
  images: string[];
  provider: {
    _id: string;
    name: string;
    email: string;
    phone: string;
    address: {
      city: string;
      state: string;
      pincode: string;
    };
    ratings: {
      average: number;
      count: number;
    };
    kycStatus: string;
    isAvailable: boolean;
  };
  ratings: {
    average: number;
    count: number;
  };
  reviews: Array<{
    _id: string;
    user?: {
      name: string;
    };
    rating: number;
    comment: string;
    createdAt: string;
  }>;
}

interface NearbyProvider {
  _id: string;
  name: string;
    email: string;
    phone: string;
    address: {
      city: string;
      state: string;
      pincode: string;
    };
    ratings: {
      average: number;
      count: number;
    };
    distance: number;
    isAvailable: boolean;
    responseTime: string;
}

const ServiceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [service, setService] = useState<Service | null>(null);
  const [nearbyProviders, setNearbyProviders] = useState<NearbyProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<NearbyProvider | null>(null);
  const [bookingData, setBookingData] = useState({
    scheduledDate: '',
    scheduledTime: '',
    address: '',
    notes: ''
  });

  useEffect(() => {
    fetchServiceDetails();
    fetchNearbyProviders();
  }, [id]);

  const fetchServiceDetails = async () => {
    try {
      setLoading(true);
      const response = await servicesAPI.getService(id!);
      setService(response.service);
    } catch (error: any) {
      toast.error('Failed to fetch service details');
      console.error('Error fetching service:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNearbyProviders = async () => {
    try {
      // Mock nearby providers - in real app, this would use geolocation
      const mockProviders: NearbyProvider[] = [
        {
          _id: '1',
          name: 'John Smith',
          email: 'john@example.com',
          phone: '+91 9876543210',
          address: {
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400001'
          },
          ratings: {
            average: 4.5,
            count: 23
          },
          distance: 2.5,
          isAvailable: true,
          responseTime: '15 mins'
        },
        {
          _id: '2',
          name: 'Sarah Johnson',
          email: 'sarah@example.com',
          phone: '+91 9876543211',
          address: {
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400002'
          },
          ratings: {
            average: 4.8,
            count: 45
          },
          distance: 3.2,
          isAvailable: true,
          responseTime: '10 mins'
        },
        {
          _id: '3',
          name: 'Mike Wilson',
          email: 'mike@example.com',
          phone: '+91 9876543212',
          address: {
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400003'
          },
          ratings: {
            average: 4.2,
            count: 18
          },
          distance: 5.1,
          isAvailable: false,
          responseTime: '30 mins'
        }
      ];
      setNearbyProviders(mockProviders);
    } catch (error: any) {
      console.error('Error fetching nearby providers:', error);
    }
  };

  const handleBookNow = (provider: NearbyProvider) => {
    if (!user) {
      toast.error('Please login to book a service');
      navigate('/login');
      return;
    }
    
    setSelectedProvider(provider);
    setShowBookingModal(true);
    
    // Set default address from user profile
    setBookingData({
      ...bookingData,
      address: typeof user?.address === 'string' ? user.address : user?.address?.city || ''
    });
  };

  const handleConfirmBooking = async () => {
    if (!selectedProvider || !service || !user) return;

    try {
      setBookingLoading(true);
      
      const bookingPayload = {
        service: service._id,
        provider: selectedProvider._id,
        customer: user._id,
        scheduledDate: bookingData.scheduledDate,
        scheduledTime: bookingData.scheduledTime,
        address: bookingData.address,
        notes: bookingData.notes,
        totalAmount: service.price
      };

      await bookingsAPI.createBooking(bookingPayload);
      
      toast.success('Booking request sent successfully! Provider will be notified.');
      setShowBookingModal(false);
      setBookingData({
        scheduledDate: '',
        scheduledTime: '',
        address: '',
        notes: ''
      });
      
      // Navigate to booking tracking
      navigate('/dashboard?tab=bookings');
      
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create booking');
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Service not found</h2>
          <p className="text-gray-600 mb-4">The service you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/services')}
            className="btn btn-primary"
          >
            Browse Services
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <nav className="flex items-center space-x-2 text-sm text-gray-500">
            <button onClick={() => navigate('/services')} className="hover:text-gray-700">
              Services
            </button>
            <span>/</span>
            <span className="text-gray-900">{service.title}</span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Service Images */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="h-96 bg-gray-200">
                {service.images && service.images.length > 0 ? (
                  <img
                    src={service.images[0]}
                    alt={service.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-gray-400 text-6xl">📷</span>
                  </div>
                )}
              </div>
            </div>

            {/* Service Details */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <h1 className="text-2xl font-bold text-gray-900">{service.title}</h1>
                <div className="flex items-center">
                  <span className="text-yellow-400">★</span>
                  <span className="text-lg font-semibold ml-1">{service.ratings.average}</span>
                  <span className="text-gray-500 ml-1">({service.ratings.count} reviews)</span>
                </div>
              </div>

              <div className="mb-6">
                <span className="badge badge-primary">
                  {service.category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
              </div>

              <p className="text-gray-700 mb-6">{service.description}</p>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="flex items-center">
                  <span className="text-2xl mr-2">💰</span>
                  <div>
                    <p className="text-sm text-gray-600">Price</p>
                    <p className="text-lg font-semibold">₹{service.price}/{service.priceType}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <span className="text-2xl mr-2">⏱️</span>
                  <div>
                    <p className="text-sm text-gray-600">Duration</p>
                    <p className="text-lg font-semibold">{service.duration.value} {service.duration.unit}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center">
                <span className="text-2xl mr-2">📍</span>
                <div>
                  <p className="text-sm text-gray-600">Service Area</p>
                  <p className="text-lg font-semibold">{service.serviceArea}</p>
                </div>
              </div>
            </div>

            {/* Reviews */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Reviews ({service.reviews.length})</h2>
              {service.reviews.length === 0 ? (
                <p className="text-gray-500">No reviews yet.</p>
              ) : (
                <div className="space-y-4">
                  {service.reviews.map((review) => (
                    <div key={review._id} className="border-b border-gray-200 pb-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-gray-900">{review.user?.name || 'Anonymous'}</h4>
                        <div className="flex items-center">
                          <span className="text-yellow-400">★</span>
                          <span className="text-sm ml-1">{review.rating}</span>
                        </div>
                      </div>
                      <p className="text-gray-700">{review.comment}</p>
                      <p className="text-sm text-gray-500 mt-2">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Provider Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Provider</h3>
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gray-300 rounded-full mr-3"></div>
                <div>
                  <h4 className="font-semibold text-gray-900">{service.provider?.name || 'Service Provider'}</h4>
                  <div className="flex items-center">
                    <span className="text-yellow-400">★</span>
                    <span className="text-sm ml-1">{service.provider?.ratings?.average || 0}</span>
                    <span className="text-gray-500 ml-1">({service.provider?.ratings?.count || 0})</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>KYC Verified</span>
                </div>
                <div className="flex items-center">
                  <span className={`mr-2 ${service.provider?.isAvailable ? 'text-green-500' : 'text-red-500'}`}>
                    {service.provider?.isAvailable ? '●' : '○'}
                  </span>
                  <span>{service.provider?.isAvailable ? 'Available' : 'Unavailable'}</span>
                </div>
              </div>
              <button
                onClick={() => handleBookNow({
                  _id: service.provider?._id || '',
                  name: service.provider?.name || 'Service Provider',
                  email: service.provider?.email || '',
                  phone: service.provider?.phone || '',
                  address: service.provider?.address || { city: '', state: '', pincode: '' },
                  ratings: service.provider?.ratings || { average: 0, count: 0 },
                  distance: 0,
                  isAvailable: service.provider?.isAvailable || false,
                  responseTime: '5 mins'
                })}
                className="w-full btn btn-primary mt-4"
                disabled={!service.provider?.isAvailable}
              >
                {service.provider?.isAvailable ? 'Book Now' : 'Currently Unavailable'}
              </button>
            </div>

            {/* Nearby Providers */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Nearby Providers</h3>
              <div className="space-y-4">
                {nearbyProviders.map((provider) => (
                  <div key={provider._id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold text-gray-900">{provider?.name || 'Provider'}</h4>
                        <div className="flex items-center text-sm">
                          <span className="text-yellow-400">★</span>
                          <span className="ml-1">{provider?.ratings?.average || 0}</span>
                          <span className="text-gray-500 ml-1">({provider?.ratings?.count || 0})</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-blue-600">{provider.distance} km</p>
                        <p className="text-xs text-gray-500">{provider.responseTime}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`text-sm ${provider?.isAvailable ? 'text-green-600' : 'text-red-600'}`}>
                        {provider?.isAvailable ? 'Available' : 'Busy'}
                      </span>
                      <button
                        onClick={() => handleBookNow(provider)}
                        className="btn btn-outline text-sm"
                        disabled={!provider?.isAvailable}
                      >
                        Book
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      {showBookingModal && selectedProvider && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Book Service</h3>
            
            <div className="mb-4">
              <h4 className="font-semibold text-gray-900">{service?.title || 'Service'}</h4>
              <p className="text-gray-600">Provider: {selectedProvider?.name || 'Provider'}</p>
              <p className="text-lg font-semibold text-blue-600 mt-2">₹{service?.price || 0}/{service?.priceType || 'service'}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  className="input"
                  value={bookingData.scheduledDate}
                  onChange={(e) => setBookingData({...bookingData, scheduledDate: e.target.value})}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time
                </label>
                <input
                  type="time"
                  className="input"
                  value={bookingData.scheduledTime}
                  onChange={(e) => setBookingData({...bookingData, scheduledTime: e.target.value})}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="Enter your address"
                  value={bookingData.address}
                  onChange={(e) => setBookingData({...bookingData, address: e.target.value})}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  className="input"
                  rows={2}
                  placeholder="Any special requirements..."
                  value={bookingData.notes}
                  onChange={(e) => setBookingData({...bookingData, notes: e.target.value})}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowBookingModal(false)}
                className="btn btn-outline"
                disabled={bookingLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBooking}
                className="btn btn-primary"
                disabled={bookingLoading || !bookingData.scheduledDate || !bookingData.scheduledTime || !bookingData.address}
              >
                {bookingLoading ? 'Creating Booking...' : 'Confirm Booking'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceDetail;
