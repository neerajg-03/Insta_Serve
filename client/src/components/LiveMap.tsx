// Live Map Component with Real-time Tracking
import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Location {
  lat: number;
  lng: number;
}

interface LiveMapProps {
  providerLocation?: Location | null;
  customerLocation?: Location | null;
  isProvider?: boolean;
}

const LiveMap: React.FC<LiveMapProps> = ({ 
  providerLocation, 
  customerLocation, 
  isProvider = false 
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const providerMarkerRef = useRef<L.Marker | null>(null);
  const customerMarkerRef = useRef<L.Marker | null>(null);
  const [mapReady, setMapReady] = useState(false);

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

    // Custom icons
    const providerIcon = L.divIcon({
      html: `
        <div style="
          background: linear-gradient(135deg, #10b981, #059669);
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
        <div style="
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
        providerMarkerRef.current.setLatLng([providerLocation.lat, providerLocation.lng]);
      } else {
        providerMarkerRef.current = L.marker([providerLocation.lat, providerLocation.lng], {
          icon: providerIcon,
        }).addTo(mapInstanceRef.current);
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

    // Fit map to show both markers
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

  return (
    <div className="relative">
      <div 
        ref={mapRef} 
        className="w-full h-64 md:h-96 rounded-xl overflow-hidden shadow-lg"
        style={{ zIndex: 10 }}
      />
      {!mapReady && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center rounded-xl">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-600 text-sm">Loading map...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveMap;
