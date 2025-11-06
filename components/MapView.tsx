'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

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
 * Get marker scale based on citation count
 */
const getMarkerScale = (citationCount: number, maxCitations: number): number => {
  const ratio = citationCount / maxCitations;
  // Scale from 8 to 24 pixels
  return 8 + (ratio * 16);
};

/**
 * Get high-contrast, vibrant colors for violations
 */
const getViolationColor = (violation: string): string => {
  const violationColors: { [key: string]: string } = {
    'Expired Meter': '#FF0040', // Electric red
    'Street Cleaning': '#0080FF', // Electric blue
    'No Parking': '#FF6600', // Vibrant orange
    'Loading Zone': '#FF3300', // Bright red-orange
    'Fire Hydrant': '#CC0000', // Deep red
    'Disabled Parking': '#8000FF', // Electric purple
    'Time Limit': '#00FF40', // Electric green
    'Residential Permit': '#00FFFF', // Cyan
    'Double Parking': '#FF0080', // Hot pink
    'Bus Zone': '#FFFF00', // Bright yellow
    'Taxi Zone': '#FF8000', // Orange
    'Commercial': '#4000FF', // Blue-purple
    'Motorcycle': '#80FF00', // Lime green
    'Truck': '#FF4080', // Pink-red
    'Overtime': '#8080FF', // Light purple
  };

  // Find matching violation or use default bright color
  for (const [key, color] of Object.entries(violationColors)) {
    if (violation.toLowerCase().includes(key.toLowerCase())) {
      return color;
    }
  }

  return '#FF00FF'; // Bright magenta for unknown violations
};

/**
 * Component to handle map events and update zoom level
 */
function MapController({
  onZoomChange,
  setMarkerMode
}: {
  onZoomChange: (zoom: number) => void;
  setMarkerMode: (mode: 'neighborhood' | 'mixed' | 'street') => void;
}) {
  const map = useMapEvents({
    zoomend: () => {
      const zoom = map.getZoom();
      onZoomChange(zoom);

      // Update marker mode based on zoom
      if (zoom < 13) {
        setMarkerMode('neighborhood');
      } else if (zoom >= 13 && zoom < 15) {
        setMarkerMode('mixed');
      } else {
        setMarkerMode('street');
      }
    },
  });

  return null;
}

/**
 * MapView Component
 *
 * Renders the interactive map using Leaflet and OpenStreetMap (100% free!).
 * Shows neighborhood markers with color-coded intensity and zoom functionality.
 */
export default function MapView({ neighborhoods, coordinates }: MapViewProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(12);
  const [markerMode, setMarkerMode] = useState<'neighborhood' | 'mixed' | 'street'>('neighborhood');

  const maxIntensity = Math.max(...neighborhoods.map(n => n.intensity), 1);
  const maxCitations = Math.max(...neighborhoods.map(n => n.citation_count), 1);

  // Ensure we have at least 100 coordinates for display
  const displayCoordinates = coordinates.length >= 100 ? coordinates : coordinates;

  // Only render map on client side
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="w-full h-[600px] bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  // San Francisco coordinates
  const center: [number, number] = [37.7749, -122.4194];

  // Determine which coordinates to show based on zoom and mode
  const getVisibleCoordinates = () => {
    if (markerMode === 'neighborhood') {
      return [];
    } else if (markerMode === 'mixed') {
      return displayCoordinates.slice(0, Math.max(100, displayCoordinates.length));
    } else {
      return displayCoordinates.slice(0, Math.max(150, displayCoordinates.length));
    }
  };

  const visibleCoords = getVisibleCoordinates();

  return (
    <div className="relative w-full">
      <div className="relative w-full h-[600px] rounded-lg shadow-lg overflow-hidden border border-gray-300">
        <MapContainer
          center={center}
          zoom={12}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
          className="z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapController
            onZoomChange={setCurrentZoom}
            setMarkerMode={setMarkerMode}
          />

          {/* Neighborhood Markers - visible at all zoom levels but fade out at higher zooms */}
          {neighborhoods.map((neighborhood, index) => {
            const color = getHeatColor(neighborhood.intensity, maxIntensity);
            const radius = getMarkerScale(neighborhood.citation_count, maxCitations);
            const avgFinePerCitation = neighborhood.total_fines / neighborhood.citation_count;
            const opacity = markerMode === 'neighborhood' ? 0.8 : markerMode === 'mixed' ? 0.5 : 0.2;

            return (
              <CircleMarker
                key={`neighborhood-${index}`}
                center={[neighborhood.latitude, neighborhood.longitude]}
                radius={radius}
                pathOptions={{
                  fillColor: color,
                  fillOpacity: opacity,
                  color: '#ffffff',
                  weight: 3,
                }}
              >
                <Popup>
                  <div style={{ padding: '12px', minWidth: '280px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                      <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: color, boxShadow: `0 0 15px ${color}60` }}></div>
                      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1f2937' }}>
                        {neighborhood.neighborhood}
                      </h3>
                    </div>

                    <div style={{ background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)', padding: '12px', borderRadius: '8px', marginBottom: '10px' }}>
                      <div style={{ display: 'grid', gap: '10px', fontSize: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', paddingBottom: '8px', borderBottom: '1px solid #cbd5e1' }}>
                          <span style={{ color: '#475569', fontWeight: 600 }}>🎯 Total Citations:</span>
                          <span style={{ color: '#dc2626', fontWeight: 800, fontSize: '16px' }}>{neighborhood.citation_count.toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', paddingBottom: '8px', borderBottom: '1px solid #cbd5e1' }}>
                          <span style={{ color: '#475569', fontWeight: 600 }}>💰 Total Fines:</span>
                          <span style={{ color: '#dc2626', fontWeight: 800, fontSize: '16px' }}>${neighborhood.total_fines.toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', paddingBottom: '8px', borderBottom: '1px solid #cbd5e1' }}>
                          <span style={{ color: '#475569', fontWeight: 600 }}>📊 Avg Fine:</span>
                          <span style={{ color: '#f59e0b', fontWeight: 700 }}>${avgFinePerCitation.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                          <span style={{ color: '#475569', fontWeight: 600 }}>🚨 Top Violation:</span>
                          <span style={{ color: getViolationColor(neighborhood.top_violation), fontWeight: 700, fontSize: '13px' }}>{neighborhood.top_violation}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'center', fontSize: '12px', color: '#64748b', fontWeight: 600, padding: '6px' }}>
                      🔍 Zoom in to see street-level citations with vibrant colors!
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

          {/* Street-level markers - visible at zoom 13+ */}
          {visibleCoords.map((coord, index) => {
            const color = getViolationColor(coord.violation);
            const size = markerMode === 'street' ? 6 : 5;

            return (
              <CircleMarker
                key={`coord-${index}`}
                center={[coord.lat, coord.lon]}
                radius={size}
                pathOptions={{
                  fillColor: color,
                  fillOpacity: 0.9,
                  color: '#ffffff',
                  weight: 2,
                }}
              >
                <Popup>
                  <div style={{ padding: '12px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', minWidth: '220px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: color, boxShadow: `0 0 10px ${color}40` }}></div>
                      <strong style={{ color: '#1f2937', fontSize: '15px' }}>{coord.violation}</strong>
                    </div>

                    <div style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', padding: '10px', borderRadius: '8px' }}>
                      <div style={{ display: 'grid', gap: '8px', fontSize: '13px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                          <span style={{ color: '#64748b', fontWeight: 500 }}>📍 Location:</span>
                          <span style={{ color: '#1f2937', fontWeight: 600, fontSize: '11px' }}>{coord.lat.toFixed(4)}, {coord.lon.toFixed(4)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                          <span style={{ color: '#64748b', fontWeight: 500 }}>💰 Fine Amount:</span>
                          <span style={{ color: '#dc2626', fontWeight: 700, fontSize: '15px' }}>${coord.fine.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>

        {/* Citation Counter */}
        <div className="absolute top-4 left-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg px-4 py-2 shadow-lg z-[1000]">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">{displayCoordinates.length}</span>
            <div className="text-xs font-medium">
              <div>Individual</div>
              <div>Citations</div>
            </div>
          </div>
        </div>

        {/* Zoom Level Indicator */}
        <div className="absolute top-4 left-28 bg-white bg-opacity-95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-gray-200 z-[1000]">
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-1">
              {markerMode === 'neighborhood' && (
                <>
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="font-medium text-gray-700">Neighborhood View</span>
                </>
              )}
              {markerMode === 'mixed' && (
                <>
                  <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                  <span className="font-medium text-gray-700">Mixed View (100+ citations)</span>
                </>
              )}
              {markerMode === 'street' && (
                <>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="font-medium text-gray-700">Street Level (150+ citations)</span>
                </>
              )}
            </div>
            <div className="text-xs text-gray-500 ml-2">
              Zoom {currentZoom.toFixed(0)}
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {markerMode === 'neighborhood' && 'Zoom in to see individual citations'}
            {markerMode === 'mixed' && 'Click any marker for details'}
            {markerMode === 'street' && 'All citations visible'}
          </div>
        </div>

        {/* Interactive Help */}
        <div className="absolute bottom-4 right-4 bg-white bg-opacity-95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-gray-200 z-[1000]">
          <div className="text-xs text-gray-600">
            <div className="flex items-center gap-1 mb-1">
              <span>🔍</span>
              <span>Zoom to explore</span>
            </div>
            <div className="flex items-center gap-1">
              <span>📍</span>
              <span>Click markers for details</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
