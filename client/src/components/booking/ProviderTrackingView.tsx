import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import LocationService, { Location, GoogleMapsDistanceResult } from '../../services/locationService';
import toast from 'react-hot-toast';

interface ProviderTrackingViewProps {
  booking: any;
  currentLocation: Location | null;
  customerLocation: Location | null;
  distance: number | null;
  estimatedArrival: string;
  connectionStatus: string;
  isTracking: boolean;
  onContactCustomer: () => void;
  onNavigateToLocation: () => void;
  onStartService: () => void;
  onCompleteService: () => void;
  onManualLocationUpdate: () => void;
  trackingUpdates: any[];
  getStatusIcon: (status: string) => string;
  googleMapsData: GoogleMapsDistanceResult | null;
}

const ProviderTrackingView: React.FC<ProviderTrackingViewProps> = ({
  booking,
  currentLocation,
  customerLocation,
  distance,
  estimatedArrival,
  connectionStatus,
  isTracking,
  onContactCustomer,
  onNavigateToLocation,
  onStartService,
  onCompleteService,
  onManualLocationUpdate,
  trackingUpdates,
  getStatusIcon,
  googleMapsData
}) => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [showMap, setShowMap] = useState(false);
  const [mapUrl, setMapUrl] = useState('');

  useEffect(() => {
    if (currentLocation && booking.address) {
      const addressString = typeof booking.address === 'string' 
        ? booking.address 
        : `${booking.address?.street || ''}, ${booking.address?.city || ''}, ${booking.address?.state || ''} - ${booking.address?.pincode || ''}`;
      
      const url = `https://www.google.com/maps/dir/?api=1&origin=${currentLocation.lat},${currentLocation.lng}&destination=${encodeURIComponent(addressString)}&travelmode=driving`;
      setMapUrl(url);
    }
  }, [currentLocation, booking.address]);

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
      case 'broadcast':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleAcceptBooking = async () => {
    try {
      // This would call API to accept the booking
      toast.success('Booking accepted successfully!');
      // In real implementation, this would update booking status
    } catch (error) {
      toast.error('Failed to accept booking');
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
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Service Dashboard</h1>
              <p className="text-green-100">Booking ID: #{booking._id.slice(-8)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-green-100">Current Status</p>
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(booking.status)}`}>
                {getStatusIcon(booking.status)} {booking.status.replace('_', ' ').toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Dashboard Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Service Status Card */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-green-500 to-teal-600 text-white p-6">
                <h2 className="text-xl font-bold mb-2">Service Status</h2>
                
                {booking.status === 'broadcast' && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="text-3xl mr-3">📢</span>
                      <div>
                        <p className="font-semibold">New Service Request!</p>
                        <p className="text-green-100">Customer needs {booking.service.title}</p>
                      </div>
                    </div>
                    <button
                      onClick={handleAcceptBooking}
                      className="bg-white text-green-600 px-4 py-2 rounded-lg font-semibold hover:bg-green-50 transition-colors"
                    >
                      Accept Booking
                    </button>
                  </div>
                )}
                
                {booking.status === 'confirmed' && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="text-3xl mr-3">✅</span>
                      <div>
                        <p className="font-semibold">Booking Confirmed</p>
                        <p className="text-green-100">Ready to start service</p>
                      </div>
                    </div>
                    <button
                      onClick={onStartService}
                      className="bg-white text-green-600 px-4 py-2 rounded-lg font-semibold hover:bg-green-50 transition-colors"
                    >
                      Start Service
                    </button>
                  </div>
                )}
                
                {booking.status === 'in_progress' && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="animate-pulse">
                        <span className="text-3xl mr-3">🔧</span>
                      </div>
                      <div>
                        <p className="font-semibold">Service In Progress</p>
                        <p className="text-green-100">
                          {distance ? `${distance.toFixed(1)} km from customer` : 'Tracking location...'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={onCompleteService}
                      className="bg-white text-green-600 px-4 py-2 rounded-lg font-semibold hover:bg-green-50 transition-colors"
                    >
                      Complete Service
                    </button>
                  </div>
                )}
                
                {booking.status === 'completed' && (
                  <div className="flex items-center">
                    <span className="text-3xl mr-3">🎉</span>
                    <div>
                      <p className="font-semibold">Service Completed!</p>
                      <p className="text-green-100">Payment will be processed shortly</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Service Information */}
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Service Type</p>
                    <p className="font-semibold text-gray-900">{booking.service.title}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Scheduled Date</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(booking.scheduledDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Customer Address</p>
                    <p className="font-semibold text-gray-900 text-sm">
                      {formatAddress(booking.address)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Earnings</p>
                    <p className="font-semibold text-green-600">₹{booking.totalAmount || booking.price?.totalPrice || 0}</p>
                  </div>
                </div>

                {/* Customer Notes */}
                {booking.notes && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-semibold text-blue-900 mb-1">📝 Customer Notes:</p>
                    <p className="text-sm text-blue-700">{booking.notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Navigation & Tracking */}
            {(booking.status === 'confirmed' || booking.status === 'in_progress') && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-900">🗺️ Navigation & Tracking</h2>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <div className={`w-2 h-2 rounded-full mr-2 ${
                        connectionStatus === 'CONNECTED' ? 'bg-green-500' : 'bg-red-500'
                      }`}></div>
                      <span className="text-sm text-gray-600">
                        {connectionStatus === 'CONNECTED' ? 'Live Tracking' : 'Offline'}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <div className={`w-2 h-2 rounded-full mr-2 ${
                        isTracking ? 'bg-green-500' : 'bg-red-500'
                      }`}></div>
                      <span className="text-sm text-gray-600">
                        {isTracking ? 'Location Sharing' : 'Not Sharing'}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Location Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-semibold text-green-900 mb-2">🚗 Your Location</h4>
                    {currentLocation ? (
                      <div className="text-sm text-green-700">
                        <p>Lat: {currentLocation.lat.toFixed(6)}</p>
                        <p>Lng: {currentLocation.lng.toFixed(6)}</p>
                        <p>Updated: {new Date(currentLocation.timestamp).toLocaleTimeString()}</p>
                      </div>
                    ) : (
                      <p className="text-green-600">Getting your location...</p>
                    )}
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">📍 Customer Location</h4>
                    {customerLocation ? (
                      <div className="text-sm text-blue-700">
                        <p>Lat: {customerLocation.lat.toFixed(6)}</p>
                        <p>Lng: {customerLocation.lng.toFixed(6)}</p>
                        <p>Updated: {new Date(customerLocation.timestamp).toLocaleTimeString()}</p>
                      </div>
                    ) : (
                      <p className="text-blue-600">Waiting for customer location...</p>
                    )}
                  </div>
                </div>

                {/* Distance & Travel Time */}
                {googleMapsData && (
                  <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg p-4 mb-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold text-gray-900">Travel Information</h4>
                        <p className="text-sm text-gray-600">
                          🚗 Customer is {googleMapsData.distance.text} away
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-orange-600">
                          🕐 {googleMapsData.duration.text}
                        </p>
                        <p className="text-sm text-gray-600">Travel time</p>
                      </div>
                    </div>
                    {googleMapsData.status === 'FALLBACK' && (
                      <p className="text-xs text-orange-600 mt-2">⚠️ Using approximate distance calculation</p>
                    )}
                  </div>
                )}

                {/* Navigation Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={onNavigateToLocation}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    🗺️ Navigate with Maps
                  </button>
                  <button
                    onClick={onContactCustomer}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    📞 Call Customer
                  </button>
                </div>

                {/* Map Placeholder */}
                <div className="mt-4 bg-gray-100 rounded-lg h-64 flex items-center justify-center relative overflow-hidden">
                  <div className="absolute top-4 left-4 bg-white rounded shadow p-2 z-10">
                    <p className="text-xs font-medium">Navigation View</p>
                    <p className="text-xs text-gray-600">Route to customer</p>
                  </div>
                  
                  {currentLocation && customerLocation ? (
                    <img 
                      src={LocationService.getStaticMapUrl(
                        currentLocation, 
                        14, 
                        [
                          { location: currentLocation, color: 'green', label: 'Y' }, // Your location
                          { location: customerLocation, color: 'blue', label: 'C' } // Customer
                        ]
                      )}
                      alt="Navigation map"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to placeholder if map fails to load
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.parentElement!.innerHTML = `
                          <div class="text-center">
                            <span class="text-4xl mb-2 block">🗺️</span>
                            <p class="text-gray-600">Navigation unavailable</p>
                            <p class="text-sm text-gray-500 mt-2">
                              🚗 Customer is ${googleMapsData?.distance.text || `${distance?.toFixed(1)} km`} away
                            </p>
                          </div>
                        `;
                      }}
                    />
                  ) : (
                    <div className="text-center">
                      <span className="text-4xl mb-2 block">🗺️</span>
                      <p className="text-gray-600">Waiting for location data...</p>
                      {googleMapsData && (
                        <p className="text-sm text-gray-500 mt-2">
                          📏 {googleMapsData.distance.text} away
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Service Timeline */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">📅 Service Timeline</h2>
              <div className="space-y-4">
                {trackingUpdates.map((update, index) => (
                  <div key={update._id} className="flex items-start">
                    <div className="flex-shrink-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        index === trackingUpdates.length - 1 ? 'bg-green-600 text-white' : 'bg-gray-300'
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
                        <p className="text-sm text-gray-600 mt-1">📍 {update.location}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Customer Information */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">👤 Customer Information</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Name</p>
                  <p className="font-medium text-gray-900">{booking.customer.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-medium text-gray-900">{booking.customer.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium text-gray-900 text-sm">{booking.customer.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Service Address</p>
                  <p className="font-medium text-gray-900 text-sm">
                    {formatAddress(booking.address)}
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <button
                  onClick={onContactCustomer}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  📞 Call Customer
                </button>
                <button
                  onClick={onNavigateToLocation}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  📍 Get Directions
                </button>
              </div>
            </div>

            {/* Service Details */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">🔧 Service Details</h3>
              <div className="space-y-3">
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
                  <p className="text-sm text-gray-600">Your Earnings</p>
                  <p className="font-medium text-green-600 text-lg">₹{booking.totalAmount || booking.price?.totalPrice || 0}</p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">⚡ Quick Actions</h3>
              <div className="space-y-2">
                {booking.status === 'broadcast' && (
                  <button
                    onClick={handleAcceptBooking}
                    className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    ✅ Accept Booking
                  </button>
                )}
                
                {booking.status === 'confirmed' && (
                  <button
                    onClick={onStartService}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    🔧 Start Service
                  </button>
                )}
                
                {booking.status === 'in_progress' && (
                  <button
                    onClick={onCompleteService}
                    className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    ✅ Complete Service
                  </button>
                )}
                
                <button
                  onClick={onContactCustomer}
                  className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  📞 Contact Customer
                </button>
                
                <button
                  onClick={onNavigateToLocation}
                  className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  🗺️ Get Directions
                </button>
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

            {/* Earnings Summary */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-green-900 mb-4">ð Earnings Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Service Amount:</span>
                  <span className="font-medium">â¹{booking.totalAmount || booking.price?.totalPrice || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Platform Fee:</span>
                  <span className="font-medium">-â¹{Math.floor((booking.totalAmount || booking.price?.totalPrice || 0) * 0.1)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between">
                  <span className="font-semibold text-green-900">Your Earnings:</span>
                  <span className="font-bold text-green-900 text-lg">
                    â¹{Math.floor((booking.totalAmount || booking.price?.totalPrice || 0) * 0.9)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProviderTrackingView;
