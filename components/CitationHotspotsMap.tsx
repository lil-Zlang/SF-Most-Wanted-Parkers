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

interface CitationHotspotsMapProps {
  searchLocation?: { lat: number; lng: number; address: string } | null
}

/**
 * CitationHotspotsMap Component
 *
 * Displays parking safety map showing safe zones (low citations) and risky areas (high citations).
 * Uses Leaflet + OpenStreetMap (100% free!)
 */
export default function CitationHotspotsMap({ searchLocation }: CitationHotspotsMapProps) {
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [showSafeZones, setShowSafeZones] = useState(true); // Toggle between safe zones and hotspots
  const [filteredHotspots, setFilteredHotspots] = useState<Hotspot[]>([])
  const [mapCenter, setMapCenter] = useState<[number, number]>([37.7749, -122.4194])

  // Only render map on client side
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Load hotspots on mount
  useEffect(() => {
    if (isMounted) {
      loadHotspots();
    }
  }, [isMounted, showSafeZones]);

  // Filter hotspots by search location
  useEffect(() => {
    if (searchLocation && hotspots.length > 0) {
      // Filter hotspots within 0.5 miles (roughly 0.007 degrees) of search location
      const nearby = hotspots.filter(h => {
        if (!h.latitude || !h.longitude) return false
        const latDiff = Math.abs(h.latitude - searchLocation.lat)
        const lngDiff = Math.abs(h.longitude - searchLocation.lng)
        const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff)
        return distance < 0.01 // Roughly 0.7 miles
      })
      
      // Sort by distance
      const sorted = nearby.sort((a, b) => {
        const distA = Math.sqrt(
          Math.pow(a.latitude! - searchLocation.lat, 2) + 
          Math.pow(a.longitude! - searchLocation.lng, 2)
        )
        const distB = Math.sqrt(
          Math.pow(b.latitude! - searchLocation.lat, 2) + 
          Math.pow(b.longitude! - searchLocation.lng, 2)
        )
        return distA - distB
      })
      
      setFilteredHotspots(sorted)
      setMapCenter([searchLocation.lat, searchLocation.lng])
    } else {
      setFilteredHotspots(hotspots)
      setMapCenter([37.7749, -122.4194])
    }
  }, [searchLocation, hotspots])

  const loadHotspots = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const url = showSafeZones ? '/api/hotspots?type=safe' : '/api/hotspots?type=hotspots';
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();

        // Filter to only hotspots with coordinates
        const withCoords = data.filter(
          (h: Hotspot) => h.latitude && h.longitude &&
          !isNaN(h.latitude) && !isNaN(h.longitude)
        );

        setHotspots(withCoords);

        if (withCoords.length === 0) {
          setError(`Found ${data.length} locations, but none have GPS coordinates yet. Geocoding is in progress...`);
        }
      } else {
        setError('Failed to load data from database');
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Error loading data');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Get marker color based on citation count (inverted for safe zones)
   * Green = safe (low citations), Red = risky (high citations)
   */
  const getMarkerColor = (citationCount: number): string => {
    if (showSafeZones) {
      // Safe zones: green for low citations
      if (citationCount <= 2) return '#22c55e'; // green-500
      if (citationCount <= 5) return '#84cc16'; // lime-500
      if (citationCount <= 10) return '#eab308'; // yellow-500
      if (citationCount <= 15) return '#f59e0b'; // amber-500
      return '#ea580c'; // orange-600
    } else {
      // Hotspots: red for high citations
      if (citationCount >= 20) return '#dc2626'; // red-600
      if (citationCount >= 15) return '#ea580c'; // orange-600
      if (citationCount >= 10) return '#f59e0b'; // amber-500
      if (citationCount >= 5) return '#eab308'; // yellow-500
      return '#84cc16'; // lime-500
    }
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
          <p className="text-gray-600 dark:text-gray-400">Loading parking safety map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Map Controls */}
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
        <div className="flex-1">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white mb-2">
            {showSafeZones ? (
              <span className="flex items-center gap-2">
                <span className="text-green-600">🟢</span>
                Good Parking Spots
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span className="text-red-600">🔴</span>
                High-Risk Areas
              </span>
            )}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {hotspots.length > 0 ? (
              <>
                {searchLocation && (
                  <span className="block text-sm text-blue-600 dark:text-blue-400 mb-1">
                    📍 Near: {searchLocation.address}
                  </span>
                )}
                {showSafeZones ? (
                  <>
                    Showing <strong className="text-green-700 dark:text-green-400">{filteredHotspots.length} safe parking locations</strong> {searchLocation ? 'nearby' : 'citywide'} (2020-2025 data)
                  </>
                ) : (
                  <>
                    Showing <strong className="text-red-700 dark:text-red-400">{filteredHotspots.length} high-risk areas</strong> {searchLocation ? 'nearby' : 'citywide'}
                  </>
                )}
              </>
            ) : error ? (
              <span className="text-amber-600 dark:text-amber-400">{error}</span>
            ) : (
              'Loading parking data...'
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setShowSafeZones(!showSafeZones);
            }}
            className={`px-5 py-2.5 rounded-lg transition-all duration-200 flex items-center gap-2 font-medium shadow-sm ${
              showSafeZones
                ? 'bg-green-600 text-white hover:bg-green-700 shadow-green-200'
                : 'bg-red-600 text-white hover:bg-red-700 shadow-red-200'
            }`}
          >
            {showSafeZones ? (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Safe Zones
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                High-Risk
              </>
            )}
          </button>
          <button
            onClick={loadHotspots}
            className="px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 flex items-center gap-2"
            title="Refresh data"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {isMounted && filteredHotspots.length > 0 ? (
        <div className="w-full h-[700px] md:h-[800px] rounded-xl shadow-xl overflow-hidden border-2 border-gray-200 dark:border-gray-700">
          <MapContainer
            center={mapCenter}
            zoom={searchLocation ? 15 : 12}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%' }}
            key={`${mapCenter[0]}-${mapCenter[1]}`}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {!searchLocation && <FitBounds hotspots={filteredHotspots} />}
            
            {/* Search location marker */}
            {searchLocation && (
              <CircleMarker
                center={[searchLocation.lat, searchLocation.lng]}
                radius={10}
                pathOptions={{
                  fillColor: '#3b82f6',
                  fillOpacity: 0.8,
                  color: '#ffffff',
                  weight: 3,
                }}
              >
                <Popup>
                  <div style={{ padding: '10px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                    <strong style={{ color: '#1f2937', fontSize: '14px' }}>📍 Your Destination</strong>
                    <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#6b7280' }}>{searchLocation.address}</p>
                  </div>
                </Popup>
              </CircleMarker>
            )}

            {filteredHotspots.map((hotspot, index) => {
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
                            <span style={{ color: '#475569', fontWeight: 600 }}>{showSafeZones ? '✅' : '🎯'} Citations:</span>
                            <span style={{ color: showSafeZones ? '#22c55e' : '#dc2626', fontWeight: 800, fontSize: '16px' }}>{hotspot.citation_count.toLocaleString()}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', paddingBottom: '6px', borderBottom: '1px solid #cbd5e1' }}>
                            <span style={{ color: '#475569', fontWeight: 600 }}>💰 Total Fines:</span>
                            <span style={{ color: '#dc2626', fontWeight: 800, fontSize: '16px' }}>${hotspot.total_fines.toLocaleString()}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                            <span style={{ color: '#475569', fontWeight: 600 }}>{showSafeZones ? '🛡️' : '🚨'} Risk Level:</span>
                            <span style={{ color: color, fontWeight: 700 }}>
                              {showSafeZones 
                                ? (hotspot.citation_count <= 2 ? 'Very Safe' : hotspot.citation_count <= 5 ? 'Safe' : hotspot.citation_count <= 10 ? 'Moderate' : 'Risky')
                                : (hotspot.citation_count >= 20 ? 'Very Risky' : hotspot.citation_count >= 15 ? 'Risky' : hotspot.citation_count >= 10 ? 'Moderate' : 'Low Risk')
                              }
                            </span>
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
      <div className="mt-6 p-5 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
        <h3 className="font-bold text-lg text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          {showSafeZones ? 'Parking Safety Guide' : 'Citation Risk Guide'}
        </h3>
        {showSafeZones ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-green-500"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">0-2 citations (Very Safe)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-lime-500"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">3-5 citations (Safe)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">6-10 citations (Moderate)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-amber-500"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">11-15 citations (Risky)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-orange-600"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">16+ citations (Very Risky)</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-red-600"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">20+ citations (Very Risky)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-orange-600"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">15-19 citations (Risky)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-amber-500"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">10-14 citations (Moderate)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">5-9 citations (Low Risk)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-lime-500"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Under 5 (Safe)</span>
            </div>
          </div>
        )}
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
          💡 {showSafeZones 
            ? 'Green areas have fewer citations = safer parking. Toggle to see high-risk areas.'
            : 'Red areas have more citations = riskier parking. Toggle to see safe zones.'}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          🌍 Powered by OpenStreetMap & Nominatim (100% free!)
        </p>
      </div>
    </div>
  );
}
