'use client';

import { useEffect, useState, useRef } from 'react';
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
 * Citation hotspot data from database
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
 * Filter state
 */
interface FilterState {
  fineRanges: string[];
  months: string[];
}

/**
 * Component to fit map bounds to markers
 */
function FitBounds({ hotspots }: { hotspots: Hotspot[] }) {
  const map = useMap();

  useEffect(() => {
    const validHotspots = hotspots.filter(
      h => h.latitude !== undefined && h.longitude !== undefined &&
      !isNaN(h.latitude) && !isNaN(h.longitude)
    );

    if (validHotspots.length > 0) {
      const bounds = L.latLngBounds(
        validHotspots.map(h => [h.latitude!, h.longitude!] as [number, number])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [hotspots, map]);

  return null;
}

/**
 * AllCitationsMap Component
 *
 * Displays filtered individual citations from the database on an interactive map.
 * Uses Leaflet + OpenStreetMap (100% free!) with Nominatim geocoding.
 */
export default function AllCitationsMap() {
  const [citations, setCitations] = useState<Citation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    fineRanges: [],
    months: ['10'] // Default to October
  });
  const [isMounted, setIsMounted] = useState(false);
  const [citationsWithoutCoords, setCitationsWithoutCoords] = useState<Citation[]>([]);

  const geocodeCacheRef = useRef<Map<string, {lat: number, lng: number}>>(new Map());

  // Only render map on client side
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Load default citations (October data) on mount
  useEffect(() => {
    if (isMounted) {
      loadCitations();
    }
  }, [isMounted]);

  // Load citations based on current filters
  const loadCitations = async (customFilters?: FilterState) => {
    const currentFilters = customFilters || filters;
    setIsLoading(true);
    setError(null);

    try {
      // Build query parameters
      const params = new URLSearchParams();
      currentFilters.fineRanges.forEach(range => params.append('fineRanges[]', range));
      currentFilters.months.forEach(month => params.append('months[]', month));
      params.set('limit', '1000'); // Max limit for performance

      const response = await fetch(`/api/citations?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        const citationsData = data.citations;

        // Separate citations with and without coordinates
        const withCoords = citationsData.filter(
          (c: Citation) => c.latitude && c.longitude &&
          !isNaN(c.latitude) && !isNaN(c.longitude)
        );
        const withoutCoords = citationsData.filter(
          (c: Citation) => !c.latitude || !c.longitude ||
          isNaN(c.latitude) || isNaN(c.longitude)
        );

        setCitations(withCoords);
        setCitationsWithoutCoords(withoutCoords);

        if (withCoords.length === 0 && withoutCoords.length > 0) {
          console.log(`Found ${withoutCoords.length} citations without coordinates. You can geocode a sample using the button below.`);
        }
      } else {
        setError('Failed to load citations from database');
      }
    } catch (err) {
      console.error('Error loading citations:', err);
      setError('Error loading citations');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Geocode a sample of citations using Nominatim
   * (Limited to 50 to avoid long wait times - takes ~50 seconds)
   */
  const geocodeSample = async () => {
    if (citationsWithoutCoords.length === 0) {
      alert('All citations already have coordinates!');
      return;
    }

    const sampleSize = Math.min(50, citationsWithoutCoords.length);
    const confirmed = confirm(
      `This will geocode ${sampleSize} citations using Nominatim (1 req/sec).\n\n` +
      `Estimated time: ~${sampleSize} seconds.\n\n` +
      `Continue?`
    );

    if (!confirmed) return;

    setIsGeocoding(true);
    const sample = citationsWithoutCoords.slice(0, sampleSize);
    const geocodedCitations: Citation[] = [...citations]; // Keep existing

    let successCount = 0;

    for (let i = 0; i < sample.length; i++) {
      const citation = sample[i];
      try {
        // Check cache first
        const cacheKey = citation.location;
        let coords: {lat: number, lng: number} | null = null;

        if (geocodeCacheRef.current.has(cacheKey)) {
          coords = geocodeCacheRef.current.get(cacheKey)!;
        } else {
          // Geocode using Nominatim
          const address = `${citation.location}, San Francisco, CA`;
          coords = await geocodeWithNominatim(address);

          if (coords) {
            geocodeCacheRef.current.set(cacheKey, coords);
          }

          // Respect Nominatim rate limit (1 request per second)
          await new Promise(resolve => setTimeout(resolve, 1100));
        }

        if (coords) {
          geocodedCitations.push({
            ...citation,
            latitude: coords.lat,
            longitude: coords.lng
          });
          successCount++;
        }
      } catch (err) {
        console.error(`Failed to geocode ${citation.location}:`, err);
      }
    }

    setCitations(geocodedCitations);
    setCitationsWithoutCoords(citationsWithoutCoords.slice(sampleSize));
    setIsGeocoding(false);

    alert(`Geocoded ${successCount} out of ${sampleSize} citations!`);
  };

  /**
   * Geocode address using Nominatim (free, no API key required)
   */
  const geocodeWithNominatim = async (address: string): Promise<{lat: number, lng: number} | null> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(address)}` +
        `&format=json&limit=1`,
        {
          headers: {
            'User-Agent': 'SF-Most-Wanted-Parkers' // Nominatim requires User-Agent
          }
        }
      );

      if (response.ok) {
        const results = await response.json();
        if (results && results.length > 0) {
          return {
            lat: parseFloat(results[0].lat),
            lng: parseFloat(results[0].lon)
          };
        }
      }
    } catch (error) {
      console.error('Nominatim geocoding error:', error);
    }

    return null;
  };

  // Apply filters and reload citations
  const applyFilters = () => {
    loadCitations(filters);
  };

  // Handle fine range checkbox changes
  const handleFineRangeChange = (range: string, checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      fineRanges: checked
        ? [...prev.fineRanges, range]
        : prev.fineRanges.filter(r => r !== range)
    }));
  };

  // Handle month button clicks
  const handleMonthClick = (month: string) => {
    setFilters(prev => ({
      ...prev,
      months: prev.months.includes(month)
        ? prev.months.filter(m => m !== month)
        : [...prev.months, month]
    }));
  };

  /**
   * Get marker color based on fine amount
   */
  const getMarkerColor = (fineAmount: number): string => {
    if (fineAmount >= 500) return '#dc2626'; // red-600
    if (fineAmount >= 300) return '#ea580c'; // orange-600
    if (fineAmount >= 200) return '#f59e0b'; // amber-500
    if (fineAmount >= 100) return '#eab308'; // yellow-500
    return '#84cc16'; // lime-500
  };

  /**
   * Get marker size based on fine amount
   */
  const getMarkerSize = (fineAmount: number): number => {
    return Math.min(6 + Math.log(fineAmount + 1), 12);
  };

  // Filter citations with valid coordinates
  const validCitations = citations.filter(
    (citation) =>
      citation.latitude !== undefined &&
      citation.longitude !== undefined &&
      !isNaN(citation.latitude) &&
      !isNaN(citation.longitude)
  );

  if (isLoading && !isMounted) {
    return (
      <div className="w-full h-[600px] bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Filter Controls */}
      <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-xl shadow-lg border border-blue-100 dark:border-gray-600">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-600 rounded-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Filter Citations</h2>
        </div>

        {/* Fine Range Checkboxes */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            Fine Amount Ranges
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { value: '500+', label: '$500+ Fine', color: 'bg-red-100 border-red-300 text-red-800' },
              { value: '300-499', label: '$300-499 Fine', color: 'bg-orange-100 border-orange-300 text-orange-800' },
              { value: '200-299', label: '$200-299 Fine', color: 'bg-amber-100 border-amber-300 text-amber-800' },
              { value: '100-199', label: '$100-199 Fine', color: 'bg-yellow-100 border-yellow-300 text-yellow-800' },
              { value: 'under100', label: 'Under $100', color: 'bg-lime-100 border-lime-300 text-lime-800' }
            ].map(range => (
              <label key={range.value} className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${
                filters.fineRanges.includes(range.value)
                  ? `${range.color} border-opacity-100 shadow-md`
                  : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
              }`}>
                <input
                  type="checkbox"
                  checked={filters.fineRanges.includes(range.value)}
                  onChange={(e) => handleFineRangeChange(range.value, e.target.checked)}
                  className="mr-3 h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="font-medium text-gray-900 dark:text-white">{range.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Month Buttons */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            Months (2025)
          </h3>
          <div className="grid grid-cols-6 md:grid-cols-12 gap-2 mb-3">
            {[
              { value: '01', label: 'Jan', available: false },
              { value: '02', label: 'Feb', available: false },
              { value: '03', label: 'Mar', available: false },
              { value: '04', label: 'Apr', available: false },
              { value: '05', label: 'May', available: false },
              { value: '06', label: 'Jun', available: false },
              { value: '07', label: 'Jul', available: false },
              { value: '08', label: 'Aug', available: false },
              { value: '09', label: 'Sep', available: true },
              { value: '10', label: 'Oct', available: true },
              { value: '11', label: 'Nov', available: false },
              { value: '12', label: 'Dec', available: false }
            ].map(month => (
              <button
                key={month.value}
                onClick={() => month.available && handleMonthClick(month.value)}
                disabled={!month.available}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  !month.available
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-50'
                    : filters.months.includes(month.value)
                    ? 'bg-blue-600 text-white shadow-md transform scale-105'
                    : 'bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-sm'
                }`}
                title={month.available ? `View ${month.label} 2025 citations` : 'No data available'}
              >
                {month.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Available data (Sep, Oct 2025)</span>
            <div className="w-3 h-3 bg-gray-300 dark:bg-gray-600 rounded-full ml-4"></div>
            <span>No data available</span>
          </div>
        </div>

        {/* Action Section */}
        <div className="flex items-center justify-between pt-4 border-t border-blue-200 dark:border-gray-600">
          <div className="flex items-center gap-4">
            <button
              onClick={applyFilters}
              disabled={isGeocoding}
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-lg flex items-center gap-2"
            >
              {isGeocoding ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Geocoding...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Apply Filters
                </>
              )}
            </button>

            <button
              onClick={() => {
                setFilters({ fineRanges: [], months: [] });
                loadCitations({ fineRanges: [], months: [] });
              }}
              className="px-4 py-3 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-all duration-200 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Clear All
            </button>

            {/* Geocode Sample Button - only show if there are citations without coords */}
            {citationsWithoutCoords.length > 0 && (
              <button
                onClick={geocodeSample}
                disabled={isGeocoding}
                className="px-4 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2"
                title={`Geocode ${Math.min(50, citationsWithoutCoords.length)} citations`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Geocode Sample ({Math.min(50, citationsWithoutCoords.length)})
              </button>
            )}
          </div>

          {/* Results Count */}
          <div className="text-right">
            <div className="text-lg font-bold text-gray-800 dark:text-white">{validCitations.length}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {filters.fineRanges.length > 0 || filters.months.length > 0 ? 'Filtered citations' : 'Total citations'}
            </div>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Citations Map</h2>
          {isGeocoding && (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Geocoding addresses with Nominatim...</span>
            </div>
          )}
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          {validCitations.length > 0 ? (
            <>
              Displaying <strong>{validCitations.length} citations</strong> on the map. Click markers for details.
              {citationsWithoutCoords.length > 0 && (
                <span className="ml-2 text-amber-600 dark:text-amber-400">
                  ({citationsWithoutCoords.length} more without GPS coordinates - click "Geocode Sample" to add them)
                </span>
              )}
            </>
          ) : citationsWithoutCoords.length > 0 ? (
            <span className="text-amber-600 dark:text-amber-400">
              No citations with GPS coordinates found. Click "Geocode Sample" to geocode {Math.min(50, citationsWithoutCoords.length)} addresses using Nominatim (free!).
            </span>
          ) : (
            'No citations match the current filters. Try adjusting your selection.'
          )}
        </p>
      </div>

      {isMounted && validCitations.length > 0 ? (
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

            <FitBounds citations={validCitations} />

            {validCitations.map((citation, index) => {
              const color = getMarkerColor(citation.fine_amount);
              const size = getMarkerSize(citation.fine_amount);

              return (
                <CircleMarker
                  key={`citation-${index}-${citation.citation_number}`}
                  center={[citation.latitude!, citation.longitude!]}
                  radius={size}
                  pathOptions={{
                    fillColor: color,
                    fillOpacity: 0.8,
                    color: '#ffffff',
                    weight: 1,
                  }}
                >
                  <Popup>
                    <div style={{ padding: '10px', minWidth: '240px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                      <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 'bold', color: '#1f2937' }}>
                        {citation.location}
                      </h3>
                      <div style={{ fontSize: '13px', color: '#4b5563', lineHeight: '1.6' }}>
                        <div style={{ marginBottom: '6px' }}>
                          <strong>Violation:</strong> {citation.violation}
                        </div>
                        <div style={{ marginBottom: '6px' }}>
                          <strong>Fine:</strong> <span style={{ color: '#dc2626', fontWeight: 'bold' }}>${citation.fine_amount.toFixed(2)}</span>
                        </div>
                        <div style={{ marginBottom: '6px' }}>
                          <strong>Citation #:</strong> {citation.citation_number}
                        </div>
                        <div>
                          <strong>Date:</strong> {new Date(citation.date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </div>
      ) : isMounted && validCitations.length === 0 && !isGeocoding ? (
        <div className="w-full h-[600px] bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center border-2 border-gray-300 dark:border-gray-600">
          <div className="text-center p-6">
            <p className="text-gray-700 dark:text-gray-300 font-semibold text-lg mb-2">No citations to display</p>
            <p className="text-gray-600 dark:text-gray-400">
              {citations.length > 0
                ? 'Citations are being geocoded. This may take a few moments...'
                : 'Try adjusting your filters or loading data.'}
            </p>
          </div>
        </div>
      ) : null}

      {/* Legend */}
      <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
        <h3 className="font-semibold text-gray-800 dark:text-white mb-3">Citation Fine Amount Legend</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-600"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">$500+</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-orange-600"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">$300-499</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-amber-500"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">$200-299</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">$100-199</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-lime-500"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Under $100</span>
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
          💡 Marker size also indicates fine amount. Larger markers = higher fines.
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          🌍 Powered by OpenStreetMap & Nominatim (100% free!)
        </p>
      </div>
    </div>
  );
}
