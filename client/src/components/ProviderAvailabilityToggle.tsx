import React, { useState, useEffect } from 'react';
import { providerAPI } from '../services/api';
import toast from 'react-hot-toast';
import { 
  MapPinIcon,
  PowerIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { 
  PowerIcon as PowerSolidIcon,
  MapPinIcon as MapPinSolidIcon
} from '@heroicons/react/24/solid';

interface ProviderStatus {
  isAvailable: boolean;
  locationSharingEnabled: boolean;
  currentLocation: {
    lat: number;
    lng: number;
    lastUpdated: string;
  } | null;
  lastLocationUpdate: string | null;
}

const ProviderAvailabilityToggle: React.FC = () => {
  const [status, setStatus] = useState<ProviderStatus>({
    isAvailable: false,
    locationSharingEnabled: false,
    currentLocation: null,
    lastLocationUpdate: null
  });
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  useEffect(() => {
    fetchProviderStatus();
  }, []);

  const fetchProviderStatus = async () => {
    try {
      setLoading(true);
      const response = await providerAPI.getStatus();
      setStatus(response);
    } catch (error: any) {
      console.error('Failed to fetch provider status:', error);
      toast.error('Failed to fetch availability status');
    } finally {
      setLoading(false);
    }
  };

  const toggleAvailability = async () => {
    try {
      setLoading(true);
      const newAvailability = !status.isAvailable;
      
      // Location sharing is automatically enabled when provider comes online
      const updateData = {
        isAvailable: newAvailability,
        locationSharingEnabled: newAvailability ? true : false
      };

      await providerAPI.updateAvailability(updateData);
      
      setStatus(prev => ({
        ...prev,
        isAvailable: newAvailability,
        locationSharingEnabled: newAvailability ? true : false
      }));

      toast.success(newAvailability ? 
        'You are now available for bookings! Location sharing is automatically enabled.' : 
        'You are no longer available for bookings. Location sharing disabled.'
      );

      // If turning on availability, start location tracking
      if (newAvailability) {
        startLocationTracking();
      } else {
        stopLocationTracking();
      }
    } catch (error: any) {
      console.error('Failed to update availability:', error);
      toast.error(error.response?.data?.message || 'Failed to update availability');
    } finally {
      setLoading(false);
    }
  };

  
  const startLocationTracking = async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setLocationLoading(true);

    try {
      console.log('Starting real-time location tracking with watchPosition...');
      
      // Use watchPosition for real-time updates
      const watchId = navigator.geolocation.watchPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const timestamp = new Date().toISOString();
          
          console.log('Real-time location update:', { latitude, longitude, timestamp });
          
          try {
            await providerAPI.updateLocation({
              lat: latitude,
              lng: longitude
            });

            setStatus(prev => ({
              ...prev,
              currentLocation: {
                lat: latitude,
                lng: longitude,
                lastUpdated: timestamp
              },
              lastLocationUpdate: timestamp
            }));

            setLocationLoading(false);
            console.log('Real-time location updated successfully to:', { latitude, longitude });
          } catch (apiError) {
            console.error('Failed to update location to backend:', apiError);
          }
        },
        (error) => {
          console.error('Location access denied or error:', error);
          toast.error('Location access denied. Please enable location permissions.');
          setLocationLoading(false);
          
          // Disable location sharing if access denied
          providerAPI.updateAvailability({ locationSharingEnabled: false });
          setStatus(prev => ({ ...prev, locationSharingEnabled: false }));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 5000 // Only accept positions less than 5 seconds old
        }
      );

      // Store watchId for cleanup
      (window as any).locationWatchId = watchId;
      console.log('Real-time location tracking started with watchId:', watchId);
      
    } catch (error: any) {
      console.error('Failed to start location tracking:', error);
      toast.error('Failed to start location tracking');
      setLocationLoading(false);
    }
  };

  const stopLocationTracking = () => {
    if ((window as any).locationWatchId) {
      navigator.geolocation.clearWatch((window as any).locationWatchId);
      delete (window as any).locationWatchId;
      console.log('Real-time location tracking stopped');
    }
    if ((window as any).locationInterval) {
      clearInterval((window as any).locationInterval);
      delete (window as any).locationInterval;
      console.log('Legacy location tracking stopped');
    }
  };

  useEffect(() => {
    // Start location tracking if availability is enabled
    if (status.isAvailable && status.locationSharingEnabled) {
      startLocationTracking();
    }

    // Cleanup on unmount
    return () => {
      stopLocationTracking();
    };
  }, [status.isAvailable, status.locationSharingEnabled]);

  const getStatusColor = () => {
    if (status.isAvailable) {
      return 'bg-green-500';
    } else {
      return 'bg-gray-400';
    }
  };

  const getStatusText = () => {
    if (status.isAvailable) {
      return 'Available & Location Sharing Active';
    } else {
      return 'Unavailable';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Availability Status</h3>
        <div className={`w-3 h-3 rounded-full ${getStatusColor()}`}></div>
      </div>

      <div className="space-y-4">
        {/* Main Availability Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              {status.isAvailable ? (
                <PowerSolidIcon className="w-6 h-6 text-blue-600" />
              ) : (
                <PowerIcon className="w-6 h-6 text-gray-600" />
              )}
            </div>
            <div>
              <p className="font-medium text-gray-900">Available for Bookings</p>
              <p className="text-sm text-gray-500">
                {status.isAvailable ? 
                  'You will receive booking requests' : 
                  'You will not receive booking requests'
                }
              </p>
            </div>
          </div>
          <button
            onClick={toggleAvailability}
            disabled={loading}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              status.isAvailable ? 'bg-blue-600' : 'bg-gray-300'
            } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                status.isAvailable ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        
        {/* Status Information */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <p className="text-sm font-medium text-blue-900">Current Status: {getStatusText()}</p>
          </div>
          
          {status.lastLocationUpdate && (
            <p className="text-xs text-blue-700 mt-1">
              Last location update: {new Date(status.lastLocationUpdate).toLocaleTimeString()}
            </p>
          )}
        </div>

        {/* Location Loading Indicator */}
        {locationLoading && (
          <div className="flex items-center space-x-2 p-3 bg-yellow-50 rounded-lg">
            <ExclamationTriangleIcon className="w-4 h-4 text-yellow-600" />
            <p className="text-sm text-yellow-800">Updating location...</p>
          </div>
        )}

        {/* Important Notes */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>** Important Notes:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Location sharing is automatically enabled when you become available</li>
            <li>Your location is only shared with customers who have booked your services</li>
            <li>Location updates automatically every 30 seconds when available</li>
            <li>Turning off availability will stop all location tracking</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ProviderAvailabilityToggle;
