// Geographic Utilities for Distance and ETA Calculations

export interface Location {
  lat: number;
  lng: number;
}

export interface DistanceResult {
  distance: number; // in kilometers
  duration: number; // in minutes
  unit: string;
}

// Haversine formula to calculate distance between two points
export function calculateDistance(loc1: Location, loc2: Location): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(loc2.lat - loc1.lat);
  const dLng = toRadians(loc2.lng - loc1.lng);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(loc1.lat)) * Math.cos(toRadians(loc2.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Convert degrees to radians
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// Calculate ETA based on distance and average speed
export function calculateETA(distance: number, speed: number = 40): number {
  // Default speed: 40 km/h (average city driving speed)
  const duration = (distance / speed) * 60; // Convert to minutes
  return Math.round(duration);
}

// Format distance for display
export function formatDistance(distance: number): string {
  if (distance < 1) {
    return `${Math.round(distance * 1000)}m`;
  } else if (distance < 10) {
    return `${distance.toFixed(1)}km`;
  } else {
    return `${Math.round(distance)}km`;
  }
}

// Format duration for display
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} mins`;
  } else {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }
}

// Calculate distance and ETA with real-time updates
export function calculateTrackingInfo(
  providerLocation: Location | null,
  customerLocation: Location | null,
  isProvider: boolean = false
): DistanceResult {
  if (!providerLocation || !customerLocation) {
    return {
      distance: 0,
      duration: 0,
      unit: 'km'
    };
  }

  const distance = calculateDistance(providerLocation, customerLocation);
  const duration = calculateETA(distance);
  
  return {
    distance,
    duration,
    unit: 'km'
  };
}

// Get current user location (with permission)
export function getCurrentLocation(): Promise<Location> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000 // 1 minute
      }
    );
  });
}

// Watch user location for real-time updates
export function watchLocation(
  callback: (location: Location) => void,
  errorCallback?: (error: any) => void
): number | null {
  if (!navigator.geolocation) {
    if (errorCallback) {
      errorCallback(new Error('Geolocation is not supported by this browser'));
    }
    return null;
  }

  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      callback({
        lat: position.coords.latitude,
        lng: position.coords.longitude
      });
    },
    errorCallback,
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 5000 // 5 seconds
    }
  );

  return watchId;
}

// Stop watching location
export function stopWatchingLocation(watchId: number | null): void {
  if (watchId !== null && navigator.geolocation) {
    navigator.geolocation.clearWatch(watchId);
  }
}

// Generate a route description based on distance
export function generateRouteDescription(distance: number): string {
  if (distance < 0.5) {
    return 'Very close - walking distance';
  } else if (distance < 2) {
    return 'Short distance - quick drive';
  } else if (distance < 5) {
    return 'Moderate distance - 10-15 min drive';
  } else if (distance < 10) {
    return 'Long distance - 20-30 min drive';
  } else {
    return 'Very far - extended drive time';
  }
}
