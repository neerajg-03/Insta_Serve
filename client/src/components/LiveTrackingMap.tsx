// Live Tracking Map Component with Real-time Updates
import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocationData } from '../services/socketService';

interface LiveTrackingMapProps {
  providerLocation?: LocationData | null;
  customerLocation?: LocationData | null;
  isProvider?: boolean;
  bookingId?: string;
}

const LiveTrackingMap: React.FC<LiveTrackingMapProps> = ({ 
  providerLocation, 
  customerLocation, 
  isProvider = false,
  bookingId
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const providerMarkerRef = useRef<L.Marker | null>(null);
  const customerMarkerRef = useRef<L.Marker | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [isTracking, setIsTracking] = useState(false);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Initialize map
    const map = L.map(mapRef.current).setView([28.6139, 77.2090], 13);
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;
    setMapReady(true);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;

    // Custom animated icons
    const providerIcon = L.divIcon({
      html: `
        <div class="provider-marker" style="
          background: linear-gradient(135deg, #10b981, #059669);
          border-radius: 50%;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          animation: pulse 2s infinite;
        ">
          <svg width="20" height="20" fill="white" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l4.05-4.95a7 7 0 11-9.9-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/>
          </svg>
        </div>
      `,
      className: 'provider-marker',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    const customerIcon = L.divIcon({
      html: `
        <div class="customer-marker" style="
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          border-radius: 50%;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        ">
          <svg width="20" height="20" fill="white" viewBox="0 0 20 20">
            <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"/>
          </svg>
        </div>
      `,
      className: 'customer-marker',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    // Update provider marker
    if (providerLocation) {
      if (providerMarkerRef.current) {
        // Animate marker movement
        providerMarkerRef.current.setLatLng([providerLocation.lat, providerLocation.lng]);
        setIsTracking(true);
      } else {
        providerMarkerRef.current = L.marker([providerLocation.lat, providerLocation.lng], {
          icon: providerIcon,
        }).addTo(mapInstanceRef.current);
        setIsTracking(true);
      }
    }

    // Update customer marker
    if (customerLocation) {
      if (customerMarkerRef.current) {
        customerMarkerRef.current.setLatLng([customerLocation.lat, customerLocation.lng]);
      } else {
        customerMarkerRef.current = L.marker([customerLocation.lat, customerLocation.lng], {
          icon: customerIcon,
        }).addTo(mapInstanceRef.current);
      }
    }

    // Draw route between provider and customer
    if (providerLocation && customerLocation) {
      if (routeLineRef.current) {
        routeLineRef.current.setLatLngs([
          [providerLocation.lat, providerLocation.lng],
          [customerLocation.lat, customerLocation.lng]
        ]);
      } else {
        routeLineRef.current = L.polyline([
          [providerLocation.lat, providerLocation.lng],
          [customerLocation.lat, customerLocation.lng]
        ], {
          color: '#3b82f6',
          weight: 4,
          opacity: 0.7,
          dashArray: '10, 10',
          className: 'route-line'
        }).addTo(mapInstanceRef.current);
      }
    }

    // Fit map to show both markers with route
    if (providerLocation && customerLocation) {
      const bounds = L.latLngBounds([
        [providerLocation.lat, providerLocation.lng],
        [customerLocation.lat, customerLocation.lng]
      ]);
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
    } else if (isProvider && customerLocation) {
      mapInstanceRef.current.setView([customerLocation.lat, customerLocation.lng], 15);
    } else if (!isProvider && providerLocation) {
      mapInstanceRef.current.setView([providerLocation.lat, providerLocation.lng], 15);
    }

  }, [providerLocation, customerLocation, mapReady, isProvider]);

  // Add CSS for animations
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.1); opacity: 0.8; }
        100% { transform: scale(1); opacity: 1; }
      }
      .provider-marker {
        animation: pulse 2s infinite;
      }
      .route-line {
        animation: dash 20s linear infinite;
      }
      @keyframes dash {
        to { stroke-dashoffset: -100; }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className="relative">
      <div 
        ref={mapRef} 
        className="w-full h-64 md:h-96 rounded-xl overflow-hidden shadow-lg border-2 border-gray-200"
        style={{ zIndex: 10 }}
      />
      
      {/* Tracking Status Overlay */}
      {isTracking && (
        <div className="absolute top-4 left-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center">
          <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></div>
          LIVE TRACKING
        </div>
      )}

      {/* Booking ID Overlay */}
      {bookingId && (
        <div className="absolute top-4 right-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-lg text-xs">
          #{bookingId.slice(-8)}
        </div>
      )}

      {/* Loading State */}
      {!mapReady && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center rounded-xl">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-600 text-sm">Loading live map...</p>
          </div>
        </div>
      )}

      {/* No Tracking State */}
      {mapReady && !isTracking && !providerLocation && !customerLocation && (
        <div className="absolute inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center rounded-xl">
          <div className="text-center text-white">
            <div className="mb-4">
              <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-lg font-semibold mb-2">Waiting for location data</p>
            <p className="text-sm text-gray-300">Tracking will start when provider is on the way</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveTrackingMap;
