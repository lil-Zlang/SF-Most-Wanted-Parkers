'use client';

import { useEffect, useState, useRef } from 'react';

/**
 * Street location data from aggregated citations
 */
interface StreetLocation {
  location: string;  // Street address
  citation_count: number;
  total_fines: number;
  top_violation: string;
  violation_breakdown: { [key: string]: number };
}

/**
 * Filter state for violation types
 */
interface FilterState {
  selectedViolations: Set<string>;
  minCitations: number;
}

/**
 * CitationHeatMap Component
 * 
 * Displays an interactive heat map of citation hotspots using Google Maps.
 * Geocodes street addresses on-the-fly to display them as markers.
 * 
 * Features:
 * - Automatic geocoding of citation_location addresses
 * - Heat map visualization with color-coded markers
 * - Interactive filtering by violation type
 * - Detailed info windows with violation breakdowns
 * - Performance-optimized with caching
 */
export default function CitationHeatMap() {
  const [locations, setLocations] = useState<StreetLocation[]>([]);
  const [violationTypes, setViolationTypes] = useState<string[]>([]);
  const [filter, setFilter] = useState<FilterState>({
    selectedViolations: new Set(),
    minCitations: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [geocodingProgress, setGeocodingProgress] = useState(0);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const heatmapRef = useRef<any>(null);
  const geocodeCacheRef = useRef<Map<string, {lat: number, lng: number}>>(new Map());

  // Load heat map data
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/data/street_heatmap.json');
        if (response.ok) {
          const data: StreetLocation[] = await response.json();
          setLocations(data);
          
          // Extract all unique violation types
          const allViolations = new Set<string>();
          data.forEach(loc => {
            Object.keys(loc.violation_breakdown).forEach(v => allViolations.add(v));
          });
          setViolationTypes(Array.from(allViolations).sort());
        } else {
          setError('Failed to load heat map data. Please regenerate data files.');
        }
      } catch (err) {
        console.error('Error loading heat map data:', err);
        setError('Error loading heat map data.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Initialize Google Maps
  useEffect(() => {
    if (isLoading || locations.length === 0 || !mapRef.current) return;

    const initMap = async () => {
      try {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        
        if (!apiKey) {
          setError('Google Maps API key not found. Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your .env.local file.');
          return;
        }

        // Load Google Maps
        if (!window.google) {
          const script = document.createElement('script');
          script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=visualization`;
          script.async = true;
          script.defer = true;
          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }

        // Create map
        const map = new window.google.maps.Map(mapRef.current, {
          center: { lat: 37.7749, lng: -122.4194 }, // San Francisco
          zoom: 12,
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: true,
        });

        googleMapRef.current = map;

        // Geocode and display locations
        await geocodeAndDisplayLocations(map, locations);

      } catch (err) {
        console.error('Error initializing map:', err);
        setError('Failed to initialize Google Maps.');
      }
    };

    initMap();

    return () => {
      // Cleanup markers
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
      if (heatmapRef.current) {
        heatmapRef.current.setMap(null);
      }
    };
  }, [isLoading, locations]);

  /**
   * Geocode street addresses and display on map
   */
  const geocodeAndDisplayLocations = async (map: any, locationData: StreetLocation[]) => {
    const geocoder = new window.google.maps.Geocoder();
    const bounds = new window.google.maps.LatLngBounds();
    const heatmapData: any[] = [];
    
    let processed = 0;
    const total = Math.min(locationData.length, 500); // Limit to top 500 to avoid API quota

    // Batch geocoding with rate limiting
    for (let i = 0; i < total; i++) {
      const location = locationData[i];
      
      // Check cache first
      if (geocodeCacheRef.current.has(location.location)) {
        const cached = geocodeCacheRef.current.get(location.location)!;
        addMarkerToMap(map, cached, location, bounds, heatmapData);
        processed++;
        setGeocodingProgress(Math.round((processed / total) * 100));
        continue;
      }

      // Geocode the address
      try {
        const address = `${location.location}, San Francisco, CA`;
        const result = await geocodeAddress(geocoder, address);
        
        if (result) {
          geocodeCacheRef.current.set(location.location, result);
          addMarkerToMap(map, result, location, bounds, heatmapData);
        }
      } catch (err) {
        console.warn(`Failed to geocode: ${location.location}`, err);
      }

      processed++;
      setGeocodingProgress(Math.round((processed / total) * 100));

      // Rate limiting: 50 requests per second max
      if (i % 10 === 0 && i > 0) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    // Fit map to bounds
    if (!bounds.isEmpty()) {
      map.fitBounds(bounds);
    }

    // Add heat map layer
    if (heatmapData.length > 0) {
      const heatmap = new window.google.maps.visualization.HeatmapLayer({
        data: heatmapData,
        radius: 20,
        opacity: 0.6,
      });
      heatmap.setMap(map);
      heatmapRef.current = heatmap;
    }

    setGeocodingProgress(100);
  };

  /**
   * Geocode a single address
   */
  const geocodeAddress = (geocoder: any, address: string): Promise<{lat: number, lng: number} | null> => {
    return new Promise((resolve) => {
      geocoder.geocode({ address }, (results: any[], status: string) => {
        if (status === 'OK' && results && results.length > 0) {
          const location = results[0].geometry.location;
          resolve({ lat: location.lat(), lng: location.lng() });
        } else {
          resolve(null);
        }
      });
    });
  };

  /**
   * Add marker to map
   */
  const addMarkerToMap = (
    map: any,
    coords: {lat: number, lng: number},
    location: StreetLocation,
    bounds: any,
    heatmapData: any[]
  ) => {
    const position = new window.google.maps.LatLng(coords.lat, coords.lng);
    
    // Add to bounds
    bounds.extend(position);

    // Add to heatmap data with weight
    const weight = Math.min(location.citation_count / 10, 50); // Normalize weight
    heatmapData.push({
      location: position,
      weight: weight
    });

    // Create marker (only for top locations to avoid clutter)
    if (location.citation_count >= 10) {
      const color = getMarkerColor(location.citation_count);
      
      const marker = new window.google.maps.Marker({
        position: position,
        map: map,
        title: location.location,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          fillColor: color,
          fillOpacity: 0.8,
          strokeColor: '#ffffff',
          strokeWeight: 2,
          scale: Math.min(8 + Math.log(location.citation_count), 15),
        },
      });

      // Info window
      const violationsHtml = Object.entries(location.violation_breakdown)
        .map(([v, count]) => `<li><strong>${v}:</strong> ${count}</li>`)
        .join('');

      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; min-width: 250px;">
            <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold;">${location.location}</h3>
            <div style="margin-bottom: 8px;">
              <div><strong>Total Citations:</strong> ${location.citation_count.toLocaleString()}</div>
              <div><strong>Total Fines:</strong> $${location.total_fines.toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
              <div><strong>Top Violation:</strong> ${location.top_violation}</div>
            </div>
            <div>
              <strong>Violation Breakdown:</strong>
              <ul style="margin: 4px 0; padding-left: 20px;">
                ${violationsHtml}
              </ul>
            </div>
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });

      markersRef.current.push(marker);
    }
  };

  /**
   * Get marker color based on citation count
   */
  const getMarkerColor = (count: number): string => {
    if (count >= 100) return '#dc2626'; // red-600
    if (count >= 50) return '#ea580c'; // orange-600
    if (count >= 25) return '#f59e0b'; // amber-500
    if (count >= 10) return '#eab308'; // yellow-500
    return '#84cc16'; // lime-500
  };

  if (isLoading) {
    return (
      <div className="w-full h-[600px] bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading citation data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-[600px] bg-red-50 rounded-lg flex items-center justify-center border-2 border-red-200">
        <div className="text-center p-6">
          <h3 className="text-xl font-bold text-red-800 mb-2">Error Loading Map</h3>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold text-gray-800">
              2025 Citation Heat Map
            </h2>
            <span className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-full flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              Google Maps
            </span>
          </div>
          {geocodingProgress > 0 && geocodingProgress < 100 && (
            <div className="flex items-center gap-2">
              <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${geocodingProgress}%` }}
                ></div>
              </div>
              <span className="text-sm text-gray-600">{geocodingProgress}%</span>
            </div>
          )}
        </div>
        <p className="text-gray-600">
          Showing top {Math.min(locations.length, 500)} citation hotspots in San Francisco for 2025.
          Click markers for detailed violation breakdowns.
        </p>
      </div>
      
      {/* Map Container */}
      <div ref={mapRef} className="w-full h-[600px] rounded-lg shadow-lg"></div>

      {/* Legend */}
      <div className="mt-4 p-4 bg-white rounded-lg shadow">
        <h3 className="font-semibold text-gray-800 mb-3">Heat Map Legend</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-600"></div>
            <span className="text-sm text-gray-600">100+ Citations</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-orange-600"></div>
            <span className="text-sm text-gray-600">50-99 Citations</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-amber-500"></div>
            <span className="text-sm text-gray-600">25-49 Citations</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
            <span className="text-sm text-gray-600">10-24 Citations</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-lime-500"></div>
            <span className="text-sm text-gray-600">1-9 Citations</span>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          💡 Markers show locations with 10+ citations. Heat map includes all locations.
        </p>
      </div>

      {/* Top Locations Table */}
      <div className="mt-6 bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-4 bg-gray-50 border-b">
          <h3 className="text-xl font-bold text-gray-800">Top Citation Hotspots</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Rank</th>
                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Location</th>
                <th className="py-3 px-4 text-right text-sm font-semibold text-gray-700">Citations</th>
                <th className="py-3 px-4 text-right text-sm font-semibold text-gray-700">Total Fines</th>
                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Top Violation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {locations.slice(0, 20).map((loc, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm text-gray-700">{idx + 1}</td>
                  <td className="py-3 px-4 text-sm font-medium text-gray-900">{loc.location}</td>
                  <td className="py-3 px-4 text-sm text-right text-gray-700">{loc.citation_count.toLocaleString()}</td>
                  <td className="py-3 px-4 text-sm text-right text-gray-700">
                    ${loc.total_fines.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700">{loc.top_violation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

