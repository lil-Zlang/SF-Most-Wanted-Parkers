'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
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
 * Citation hotspot data
 */
interface Hotspot {
  location: string;
  citation_count: number;
  total_fines: number;
  top_violation: string;
  violation_breakdown: any;
  latitude?: number;
  longitude?: number;
}

/**
 * Component to fit map bounds to markers
 */
function FitBounds({ hotspots }: { hotspots: Hotspot[] }) {
  const map = useMap();

  useEffect(() => {
    if (hotspots.length > 0) {
      const bounds = L.latLngBounds(
        hotspots.map(h => [h.latitude!, h.longitude!] as [number, number])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [hotspots, map]);

  return null;
}

/**
 * CitationHotspotsMap Component
 *
 * Displays top citation hotspots (locations with most citations) on an interactive map.
 * Uses Leaflet + OpenStreetMap (100% free!)
 */
export default function CitationHotspotsMap() {
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Only render map on client side
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Load hotspots on mount
  useEffect(() => {
    if (isMounted) {
      loadHotspots();
    }
  }, [isMounted]);

  const loadHotspots = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/hotspots');
      if (response.ok) {
        const data = await response.json();

        // Filter to only hotspots with coordinates
        const withCoords = data.filter(
          (h: Hotspot) => h.latitude && h.longitude &&
          !isNaN(h.latitude) && !isNaN(h.longitude)
        );

        setHotspots(withCoords);

        if (withCoords.length === 0) {
          setError(`Found ${data.length} hotspots, but none have GPS coordinates yet. Geocoding is in progress...`);
        }
      } else {
        setError('Failed to load hotspots from database');
      }
    } catch (err) {
      console.error('Error loading hotspots:', err);
      setError('Error loading hotspots');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Get marker color based on citation count
   */
  const getMarkerColor = (citationCount: number): string => {
    if (citationCount >= 20) return '#dc2626'; // red-600
    if (citationCount >= 15) return '#ea580c'; // orange-600
    if (citationCount >= 10) return '#f59e0b'; // amber-500
    if (citationCount >= 5) return '#eab308'; // yellow-500
    return '#84cc16'; // lime-500
  };

  /**
   * Get marker size based on citation count
   */
  const getMarkerSize = (citationCount: number): number => {
    return Math.min(6 + Math.log(citationCount + 1) * 2, 16);
  };

  if (isLoading && !isMounted) {
    return (
      <div className="w-full h-[600px] bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading citation hotspots...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Map Info */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Citation Hotspots Map</h2>
          <button
            onClick={loadHotspots}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          {hotspots.length > 0 ? (
            <>
              Displaying <strong>{hotspots.length} hotspot locations</strong> with the most parking citations.
              Larger markers = more citations.
            </>
          ) : error ? (
            <span className="text-amber-600 dark:text-amber-400">{error}</span>
          ) : (
            'No hotspots available. Click Refresh to reload.'
          )}
        </p>
      </div>

      {isMounted && hotspots.length > 0 ? (
        <div className="w-full h-[600px] rounded-lg shadow-lg overflow-hidden border border-gray-300">
          <MapContainer
            center={[37.7749, -122.4194]}
            zoom={12}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <FitBounds hotspots={hotspots} />

            {hotspots.map((hotspot, index) => {
              const color = getMarkerColor(hotspot.citation_count);
              const size = getMarkerSize(hotspot.citation_count);

              return (
                <CircleMarker
                  key={`hotspot-${index}-${hotspot.location}`}
                  center={[hotspot.latitude!, hotspot.longitude!]}
                  radius={size}
                  pathOptions={{
                    fillColor: color,
                    fillOpacity: 0.7,
                    color: '#ffffff',
                    weight: 2,
                  }}
                >
                  <Popup>
                    <div style={{ padding: '12px', minWidth: '280px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                      <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 'bold', color: '#1f2937' }}>
                        {hotspot.location}
                      </h3>
                      <div style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', padding: '12px', borderRadius: '8px', marginBottom: '10px' }}>
                        <div style={{ display: 'grid', gap: '8px', fontSize: '14px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', paddingBottom: '6px', borderBottom: '1px solid #cbd5e1' }}>
                            <span style={{ color: '#475569', fontWeight: 600 }}>🎯 Total Citations:</span>
                            <span style={{ color: '#dc2626', fontWeight: 800, fontSize: '16px' }}>{hotspot.citation_count.toLocaleString()}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', paddingBottom: '6px', borderBottom: '1px solid #cbd5e1' }}>
                            <span style={{ color: '#475569', fontWeight: 600 }}>💰 Total Fines:</span>
                            <span style={{ color: '#dc2626', fontWeight: 800, fontSize: '16px' }}>${hotspot.total_fines.toLocaleString()}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                            <span style={{ color: '#475569', fontWeight: 600 }}>🚨 Top Violation:</span>
                            <span style={{ color: color, fontWeight: 700 }}>{hotspot.top_violation}</span>
                          </div>
                        </div>
                      </div>
                      {hotspot.violation_breakdown && (
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                          <strong>Violations:</strong>
                          <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px' }}>
                            {Object.entries(hotspot.violation_breakdown).map(([violation, count]) => (
                              <li key={violation}>{violation}: {count as number}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </div>
      ) : isMounted && hotspots.length === 0 && !isLoading ? (
        <div className="w-full h-[600px] bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center border-2 border-gray-300 dark:border-gray-600">
          <div className="text-center p-6">
            <p className="text-gray-700 dark:text-gray-300 font-semibold text-lg mb-2">Geocoding in Progress</p>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {error || 'Citation hotspots are being geocoded. This takes about 19 minutes.'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Click the Refresh button in a few minutes to see newly geocoded locations appear!
            </p>
          </div>
        </div>
      ) : null}

      {/* Legend */}
      <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
        <h3 className="font-semibold text-gray-800 dark:text-white mb-3">Citation Count Legend</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-600"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">20+ citations</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-orange-600"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">15-19 citations</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-amber-500"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">10-14 citations</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">5-9 citations</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-lime-500"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Under 5</span>
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
          💡 Marker size also indicates citation count. Larger markers = more citations.
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          🌍 Powered by OpenStreetMap & Nominatim (100% free!)
        </p>
      </div>
    </div>
  );
}
