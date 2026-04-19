export interface Location {
  lat: number;
  lng: number;
  timestamp: number;
}

export interface LocationUpdate {
  bookingId: string;
  userId: string;
  location: Location;
  status: 'moving' | 'arrived' | 'service_started' | 'completed';
}

export interface GoogleMapsDistanceResult {
  distance: {
    text: string;
    value: number; // in meters
  };
  duration: {
    text: string;
    value: number; // in seconds
  };
  status: string;
}

class LocationService {
  private static instance: LocationService;
  private watchId: number | null = null;
  private currentLocation: Location | null = null;
  private locationCallbacks: ((location: Location) => void)[] = [];
  private readonly GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
  private readonly LAST_LOCATION_KEY = 'provider_last_location';

  static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  // Store last known location to localStorage
  private storeLastLocation(location: Location): void {
    try {
      localStorage.setItem(this.LAST_LOCATION_KEY, JSON.stringify(location));
    } catch (error) {
      console.error('Failed to store last location:', error);
    }
  }

  // Get last known location from localStorage
  getLastKnownLocation(): Location | null {
    try {
      const stored = localStorage.getItem(this.LAST_LOCATION_KEY);
      if (stored) {
        const location = JSON.parse(stored) as Location;
        // Check if location is not too old (24 hours)
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours in ms
        if (Date.now() - location.timestamp < maxAge) {
          return location;
        } else {
          // Remove old location
          localStorage.removeItem(this.LAST_LOCATION_KEY);
        }
      }
    } catch (error) {
      console.error('Failed to retrieve last location:', error);
    }
    return null;
  }

  // Get current location
  getCurrentLocation(): Promise<Location> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location: Location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            timestamp: Date.now()
          };
          this.currentLocation = location;
          this.storeLastLocation(location); // Store the location
          resolve(location);
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  }

  // Start watching location changes
  startLocationTracking(callback: (location: Location) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      this.locationCallbacks.push(callback);

      if (this.watchId) {
        resolve(); // Already tracking
        return;
      }

      this.watchId = navigator.geolocation.watchPosition(
        (position) => {
          const location: Location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            timestamp: Date.now()
          };
          this.currentLocation = location;
          this.storeLastLocation(location); // Store the location
          
          // Notify all callbacks
          this.locationCallbacks.forEach(cb => cb(location));
        },
        (error) => {
          console.error('Location tracking error:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );

      resolve();
    });
  }

  // Stop location tracking
  stopLocationTracking(): void {
    if (this.watchId) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.locationCallbacks = [];
  }

  // Calculate distance using Google Maps Distance Matrix API
  async calculateDistanceWithGoogleMaps(origin: Location, destination: Location): Promise<GoogleMapsDistanceResult> {
    if (!this.GOOGLE_MAPS_API_KEY) {
      console.warn('Google Maps API key not found, falling back to Haversine calculation');
      const distance = this.calculateDistance(origin, destination);
      const duration = this.calculateETA(distance);
      return {
        distance: {
          text: `${distance.toFixed(1)} km`,
          value: distance * 1000 // convert to meters
        },
        duration: {
          text: `${Math.round(duration)} mins`,
          value: duration * 60 // convert to seconds
        },
        status: 'OK'
      };
    }

    try {
      const originStr = `${origin.lat},${origin.lng}`;
      const destStr = `${destination.lat},${destination.lng}`;
      
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/distancematrix/json?` +
        `origins=${originStr}&` +
        `destinations=${destStr}&` +
        `key=${this.GOOGLE_MAPS_API_KEY}&` +
        `units=metric`
      );

      const data = await response.json();
      
      if (data.status === 'OK' && data.rows[0]?.elements[0]) {
        const element = data.rows[0].elements[0];
        return {
          distance: element.distance,
          duration: element.duration,
          status: element.status
        };
      } else {
        throw new Error(`Google Maps API error: ${data.status}`);
      }
    } catch (error) {
      console.error('Error calculating distance with Google Maps:', error);
      // Fallback to Haversine calculation
      const distance = this.calculateDistance(origin, destination);
      const duration = this.calculateETA(distance);
      return {
        distance: {
          text: `${distance.toFixed(1)} km`,
          value: distance * 1000
        },
        duration: {
          text: `${Math.round(duration)} mins`,
          value: duration * 60
        },
        status: 'FALLBACK'
      };
    }
  }

  // Calculate distance between two points (Haversine formula) - fallback method
  calculateDistance(loc1: Location, loc2: Location): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(loc2.lat - loc1.lat);
    const dLng = this.toRadians(loc2.lng - loc1.lng);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(loc1.lat)) * Math.cos(this.toRadians(loc2.lat)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
  }

  // Calculate ETA based on distance and average speed
  calculateETA(distance: number, speedKmh: number = 40): number {
    return distance / speedKmh * 60; // Return minutes
  }

  // Get Google Maps URL for navigation
  getGoogleMapsUrl(origin: Location, destination: Location | string): string {
    if (typeof destination === 'string') {
      return `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${encodeURIComponent(destination)}&travelmode=driving`;
    } else {
      return `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&travelmode=driving`;
    }
  }

  // Get static map URL for embedding
  getStaticMapUrl(center: Location, zoom: number = 15, markers?: Array<{location: Location, color?: string, label?: string}>): string {
    if (!this.GOOGLE_MAPS_API_KEY) {
      return 'https://via.placeholder.com/600x400?text=Map+Preview';
    }

    let url = `https://maps.googleapis.com/maps/api/staticmap?` +
      `center=${center.lat},${center.lng}&` +
      `zoom=${zoom}&` +
      `size=600x400&` +
      `key=${this.GOOGLE_MAPS_API_KEY}`;

    if (markers && markers.length > 0) {
      const markerParams = markers.map(marker => {
        const color = marker.color || 'red';
        const label = marker.label || '';
        return `${label ? `${label}%7C` : ''}${marker.location.lat},${marker.location.lng}`;
      }).join('&markers=');
      
      url += `&markers=${markerParams}`;
    }

    return url;
  }

  // Geocode address to coordinates
  async geocodeAddress(address: string): Promise<Location | null> {
    if (!this.GOOGLE_MAPS_API_KEY) {
      console.warn('Google Maps API key not found, geocoding not available');
      return null;
    }

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?` +
        `address=${encodeURIComponent(address)}&` +
        `key=${this.GOOGLE_MAPS_API_KEY}`
      );

      const data = await response.json();
      
      if (data.status === 'OK' && data.results[0]) {
        const location = data.results[0].geometry.location;
        return {
          lat: location.lat,
          lng: location.lng,
          timestamp: Date.now()
        };
      } else {
        throw new Error(`Geocoding error: ${data.status}`);
      }
    } catch (error) {
      console.error('Error geocoding address:', error);
      return null;
    }
  }

  // Reverse geocode coordinates to address
  async reverseGeocode(location: Location): Promise<string | null> {
    if (!this.GOOGLE_MAPS_API_KEY) {
      return `${location.lat}, ${location.lng}`;
    }

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?` +
        `latlng=${location.lat},${location.lng}&` +
        `key=${this.GOOGLE_MAPS_API_KEY}`
      );

      const data = await response.json();
      
      if (data.status === 'OK' && data.results[0]) {
        return data.results[0].formatted_address;
      } else {
        throw new Error(`Reverse geocoding error: ${data.status}`);
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return `${location.lat}, ${location.lng}`;
    }
  }

  // Convert degrees to radians
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Get current location
  getCurrentLocationSync(): Location | null {
    return this.currentLocation;
  }

  // Check if location is within service area
  isWithinServiceArea(location: Location, serviceArea: string, maxRadiusKm: number = 10): boolean {
    // This is a simplified check - in real app, you'd geocode the service area
    // and check if the location is within the specified radius
    return true; // Placeholder
  }
}

export default LocationService.getInstance();
