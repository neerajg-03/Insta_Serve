import React, { useState, useEffect } from 'react';
import { providerAPI } from '../services/api';
import toast from 'react-hot-toast';
import { 
  MapPinIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { 
  MapPinIcon as MapPinSolidIcon
} from '@heroicons/react/24/solid';

interface ProviderStatus {
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
      
      // Auto-enable availability and location sharing when provider visits the site
      if (!response.locationSharingEnabled) {
        await enableAvailability();
      }
    } catch (error: any) {
      console.error('Failed to fetch provider status:', error);
      toast.error('Failed to fetch availability status');
    } finally {
      setLoading(false);
    }
  };

  const enableAvailability = async () => {
    try {
      setLoading(true);
      
      // Always set provider as available and enable location sharing
      const updateData = {
        isAvailable: true,
        locationSharingEnabled: true
      };

      await providerAPI.updateAvailability(updateData);
      
      setStatus(prev => ({
        ...prev,
        locationSharingEnabled: true
      }));

      toast.success('You are now available for bookings! Location sharing is enabled.');
      
      // Start location tracking
      startLocationTracking();
    } catch (error: any) {
      console.error('Failed to enable availability:', error);
      toast.error(error.response?.data?.message || 'Failed to enable availability');
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
    // Start location tracking if location sharing is enabled
    if (status.locationSharingEnabled) {
      startLocationTracking();
    }

    // Cleanup on unmount
    return () => {
      stopLocationTracking();
    };
  }, [status.locationSharingEnabled]);

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Availability Status</h3>
        <div className="w-3 h-3 rounded-full bg-green-500"></div>
      </div>

      <div className="space-y-4">
        {/* Availability Status */}
        <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircleIcon className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Available for Bookings</p>
              <p className="text-sm text-gray-500">
                You will receive booking requests automatically
              </p>
            </div>
          </div>
        </div>

        
        {/* Status Information */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <p className="text-sm font-medium text-blue-900">Status: Available & Location Sharing Active</p>
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
            <li>You are automatically available for bookings when visiting the site</li>
            <li>Location sharing is automatically enabled for booking requests</li>
            <li>Your location is only shared with customers who have booked your services</li>
            <li>Location updates automatically every 30 seconds</li>
            <li>Leave the dashboard to stop receiving new booking requests</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ProviderAvailabilityToggle;
