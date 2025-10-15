'use client';

import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useEffect } from 'react';

/**
 * Type definitions for map data
 */
interface NeighborhoodData {
  neighborhood: string;
  latitude: number;
  longitude: number;
  total_fines: number;
  citation_count: number;
  top_violation: string;
  intensity: number;
}

interface CoordinateData {
  lat: number;
  lon: number;
  fine: number;
  violation: string;
}

interface MapViewProps {
  neighborhoods: NeighborhoodData[];
  coordinates: CoordinateData[];
}

/**
 * Custom hook to adjust map view based on zoom level
 */
function MapController() {
  const map = useMap();
  
  useEffect(() => {
    // Set initial view to San Francisco
    map.setView([37.7749, -122.4194], 12);
  }, [map]);
  
  return null;
}

/**
 * Get heat map color based on intensity
 */
const getHeatColor = (intensity: number, maxIntensity: number): string => {
  const ratio = intensity / maxIntensity;
  
  if (ratio > 0.8) return '#DC2626'; // red-600
  if (ratio > 0.6) return '#EA580C'; // orange-600
  if (ratio > 0.4) return '#F59E0B'; // amber-500
  if (ratio > 0.2) return '#EAB308'; // yellow-500
  return '#84CC16'; // lime-500
};

/**
 * Get marker size based on citation count
 */
const getMarkerSize = (citationCount: number, maxCitations: number): number => {
  const ratio = citationCount / maxCitations;
  
  // Scale from 10 to 40 pixels
  return 10 + (ratio * 30);
};

/**
 * MapView Component
 * 
 * Renders the interactive map using Leaflet with Apple Maps-style UI.
 * Shows neighborhood markers with color-coded intensity and zoom functionality.
 */
export default function MapView({ neighborhoods, coordinates }: MapViewProps) {
  const maxIntensity = Math.max(...neighborhoods.map(n => n.intensity), 1);
  const maxCitations = Math.max(...neighborhoods.map(n => n.citation_count), 1);

  return (
    <div className="w-full h-[600px] rounded-lg shadow-lg overflow-hidden border border-gray-300">
      <MapContainer
        center={[37.7749, -122.4194]}
        zoom={12}
        scrollWheelZoom={true}
        className="w-full h-full"
        style={{ background: '#f5f5f5' }}
      >
        <MapController />
        
        {/* Use Apple-like tile layer with custom style */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          className="map-tiles"
        />

        {/* Render neighborhood markers */}
        {neighborhoods.map((neighborhood, index) => {
          const color = getHeatColor(neighborhood.intensity, maxIntensity);
          const size = getMarkerSize(neighborhood.citation_count, maxCitations);
          
          return (
            <CircleMarker
              key={`${neighborhood.neighborhood}-${index}`}
              center={[neighborhood.latitude, neighborhood.longitude]}
              radius={size}
              pathOptions={{
                fillColor: color,
                fillOpacity: 0.7,
                color: '#ffffff',
                weight: 2,
              }}
            >
              <Popup className="custom-popup">
                <div className="p-2">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {neighborhood.neighborhood}
                  </h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-600 font-medium">Citations:</span>
                      <span className="text-gray-900 font-semibold">
                        {neighborhood.citation_count.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-600 font-medium">Total Fines:</span>
                      <span className="text-gray-900 font-semibold">
                        ${neighborhood.total_fines.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-600 font-medium">Top Violation:</span>
                      <span className="text-gray-900 font-semibold">
                        {neighborhood.top_violation}
                      </span>
                    </div>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {/* Render individual coordinate points for street-level view (visible when zoomed in) */}
        {coordinates.slice(0, 100).map((coord, index) => (
          <CircleMarker
            key={`coord-${index}`}
            center={[coord.lat, coord.lon]}
            radius={3}
            pathOptions={{
              fillColor: '#3B82F6',
              fillOpacity: 0.6,
              color: '#ffffff',
              weight: 1,
            }}
          >
            <Popup className="custom-popup">
              <div className="p-2">
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-600 font-medium">Violation:</span>
                    <span className="text-gray-900 font-semibold">
                      {coord.violation}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-600 font-medium">Fine:</span>
                    <span className="text-gray-900 font-semibold">
                      ${coord.fine.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>

      <style jsx global>{`
        /* Apple Maps-style UI customizations */
        .leaflet-container {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
        }
        
        .leaflet-popup-content-wrapper {
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        
        .leaflet-popup-content {
          margin: 0;
          font-size: 14px;
        }
        
        .leaflet-popup-tip {
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .leaflet-control-zoom {
          border: none !important;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }
        
        .leaflet-control-zoom a {
          border: none !important;
          width: 36px;
          height: 36px;
          line-height: 36px;
          font-size: 20px;
          color: #007AFF;
          background-color: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }
        
        .leaflet-control-zoom a:hover {
          background-color: rgba(255, 255, 255, 1);
          color: #0051D5;
        }
        
        .leaflet-bar {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          border-radius: 8px;
          overflow: hidden;
        }
        
        /* Smooth transitions for markers */
        .leaflet-marker-icon,
        .leaflet-marker-shadow {
          transition: all 0.2s ease;
        }
      `}</style>
    </div>
  );
}

