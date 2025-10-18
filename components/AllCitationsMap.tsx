'use client';

import { useEffect, useState, useRef } from 'react';

/**
 * Individual citation data from database
 */
interface Citation {
  location: string;
  violation: string;
  fine_amount: number;
  citation_number: string;
  date: string;
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
 * AllCitationsMap Component
 * 
 * Displays filtered individual citations from the database on an interactive map.
 * Users can filter by fine amount ranges and months.
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
  
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const geocodeCacheRef = useRef<Map<string, {lat: number, lng: number}>>(new Map());
  const streetViewServiceRef = useRef<any>(null);

  // Load default citations (October data) on mount
  useEffect(() => {
    loadCitations();
  }, []);

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
        setCitations(data.citations);
        console.log(`Loaded ${data.total} citations with filters:`, data.filters);
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

  // Initialize Google Maps
  useEffect(() => {
    if (isLoading || !mapRef.current) return;

    const initMap = async () => {
      try {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        
        if (!apiKey) {
          setError('Google Maps API key not found');
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

        // Initialize Street View service
        streetViewServiceRef.current = new window.google.maps.StreetViewService();

        // Create map
        const map = new window.google.maps.Map(mapRef.current, {
          center: { lat: 37.7749, lng: -122.4194 }, // San Francisco
          zoom: 12,
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: true,
        });

        googleMapRef.current = map;

      } catch (err) {
        console.error('Error initializing map:', err);
        setError('Failed to initialize Google Maps');
      }
    };

    initMap();

    return () => {
      // Cleanup markers
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
    };
  }, [isLoading]);

  // Display citations on map when citations change
  useEffect(() => {
    if (citations.length === 0 || !googleMapRef.current) return;

    displayCitationsOnMap(citations);
  }, [citations]);

  /**
   * Display all citations on the map with instant geocoding
   */
  const displayCitationsOnMap = async (citationData: Citation[]) => {
    if (!googleMapRef.current) return;

    setIsGeocoding(true);
    
    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    const map = googleMapRef.current;
    const geocoder = new window.google.maps.Geocoder();
    const bounds = new window.google.maps.LatLngBounds();

    console.log(`Displaying ${citationData.length} citations on map...`);

    // Process citations in parallel batches
    const batchSize = 50;
    const batches = [];
    
    for (let i = 0; i < citationData.length; i += batchSize) {
      const batch = citationData.slice(i, i + batchSize);
      batches.push(batch);
    }

    // Process all batches in parallel
    const allPromises = batches.map(async (batch) => {
      const batchPromises = batch.map(async (citation) => {
        try {
          let coords: {lat: number, lng: number} | null = null;
          
          // Check cache first
          const cacheKey = citation.location;
          if (geocodeCacheRef.current.has(cacheKey)) {
            coords = geocodeCacheRef.current.get(cacheKey)!;
          } else {
            // Geocode the address
            const address = `${citation.location}, San Francisco, CA`;
            coords = await geocodeAddress(geocoder, address);
            if (coords) {
              geocodeCacheRef.current.set(cacheKey, coords);
            }
          }
          
          if (coords) {
            addCitationMarker(map, coords, citation, bounds);
          }
        } catch (err) {
          console.warn(`Failed to process citation: ${citation.location}`, err);
        }
      });

      await Promise.all(batchPromises);
    });

    await Promise.all(allPromises);

    // Fit map to show all markers
    if (!bounds.isEmpty()) {
      map.fitBounds(bounds);
    }

    setIsGeocoding(false);
    console.log(`Successfully displayed ${citationData.length} citations on map`);
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
   * Add a citation marker to the map
   */
  const addCitationMarker = (
    map: any,
    coords: {lat: number, lng: number},
    citation: Citation,
    bounds: any
  ) => {
    const position = new window.google.maps.LatLng(coords.lat, coords.lng);
    bounds.extend(position);

    // Create marker with color based on fine amount
    const color = getMarkerColor(citation.fine_amount);
    const size = Math.min(6 + Math.log(citation.fine_amount + 1), 12);

    const marker = new window.google.maps.Marker({
      position: position,
      map: map,
      title: `${citation.location} - ${citation.violation}`,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        fillColor: color,
        fillOpacity: 0.8,
        strokeColor: '#ffffff',
        strokeWeight: 1,
        scale: size,
      },
    });

    // Create info window with Street View
    const infoWindow = new window.google.maps.InfoWindow({
      content: `
        <div style="padding: 8px; min-width: 300px;">
          <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold;">${citation.location}</h3>
          <div style="margin-bottom: 8px;">
            <div><strong>Violation:</strong> ${citation.violation}</div>
            <div><strong>Fine:</strong> $${citation.fine_amount.toFixed(2)}</div>
            <div><strong>Citation #:</strong> ${citation.citation_number}</div>
            <div><strong>Date:</strong> ${new Date(citation.date).toLocaleDateString()}</div>
          </div>
          <div id="streetview-${citation.citation_number}" style="width: 280px; height: 150px; margin: 8px 0; border-radius: 8px; overflow: hidden; border: 2px solid #e5e7eb;">
            <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #f3f4f6; color: #6b7280;">
              <div style="text-align: center;">
                <div style="margin-bottom: 4px;">🔍</div>
                <div style="font-size: 12px;">Loading Street View...</div>
              </div>
            </div>
          </div>
          <div style="text-align: center; margin-top: 8px;">
            <a href="https://www.google.com/maps/@${coords.lat},${coords.lng},3a,75y,0h,90t/data=!3m6!1e1!3m4!1s${coords.lat},${coords.lng}!2e0!7i16384!8i8192" 
               target="_blank" 
               style="display: inline-block; padding: 6px 12px; background: #3b82f6; color: white; text-decoration: none; border-radius: 4px; font-size: 12px; font-weight: 500;">
              Open in Google Maps
            </a>
          </div>
        </div>
      `
    });

    marker.addListener('click', () => {
      infoWindow.open(map, marker);
      
      // Load Street View after info window opens
      setTimeout(() => {
        loadStreetView(citation.citation_number, coords);
      }, 100);
    });

    markersRef.current.push(marker);
  };

  /**
   * Load Street View for a specific location
   */
  const loadStreetView = (citationNumber: string, coords: {lat: number, lng: number}) => {
    if (!streetViewServiceRef.current) return;

    const streetViewElement = document.getElementById(`streetview-${citationNumber}`);
    if (!streetViewElement) return;

    // Check if Street View is available at this location
    streetViewServiceRef.current.getPanorama({
      location: coords,
      radius: 50
    }, (data: any, status: string) => {
      if (status === 'OK') {
        // Create Street View panorama
        const panorama = new window.google.maps.StreetViewPanorama(streetViewElement, {
          position: coords,
          pov: {
            heading: 0,
            pitch: 0
          },
          zoom: 1,
          disableDefaultUI: true,
          clickToGo: false,
          scrollwheel: false,
          panControl: false,
          linksControl: false,
          addressControl: false,
          fullscreenControl: false
        });

        // Add click handler to open in Google Maps
        panorama.addListener('click', () => {
          window.open(`https://www.google.com/maps/@${coords.lat},${coords.lng},3a,75y,0h,90t/data=!3m6!1e1!3m4!1s${coords.lat},${coords.lng}!2e0!7i16384!8i8192`, '_blank');
        });

        // Add a subtle overlay to indicate it's clickable
        const overlay = document.createElement('div');
        overlay.style.cssText = `
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 12px;
          font-weight: 500;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.3s;
        `;
        overlay.textContent = 'Click to open in Google Maps';
        streetViewElement.style.position = 'relative';
        streetViewElement.appendChild(overlay);

        // Show overlay on hover
        streetViewElement.addEventListener('mouseenter', () => {
          overlay.style.opacity = '1';
        });
        streetViewElement.addEventListener('mouseleave', () => {
          overlay.style.opacity = '0';
        });

      } else {
        // No Street View available
        streetViewElement.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #f3f4f6; color: #6b7280;">
            <div style="text-align: center;">
              <div style="margin-bottom: 4px;">🚫</div>
              <div style="font-size: 12px;">No Street View available</div>
            </div>
          </div>
        `;
      }
    });
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

  if (isLoading) {
    return (
      <div className="w-full h-[600px] bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading citations from database...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-[600px] bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center justify-center border-2 border-red-200 dark:border-red-800">
        <div className="text-center p-6">
          <h3 className="text-xl font-bold text-red-800 dark:text-red-400 mb-2">Error Loading Map</h3>
          <p className="text-red-600 dark:text-red-400">{error}</p>
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
                  Loading...
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
          </div>

          {/* Results Count */}
          <div className="text-right">
            <div className="text-lg font-bold text-gray-800 dark:text-white">{citations.length}</div>
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
              <span className="text-sm text-gray-600 dark:text-gray-400">Geocoding addresses...</span>
            </div>
          )}
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          {citations.length > 0 
            ? `Displaying ${citations.length} citations on the map. Click markers for details.`
            : 'No citations match the current filters. Try adjusting your selection.'
          }
        </p>
      </div>
      
      <div ref={mapRef} className="w-full h-[600px] rounded-lg shadow-lg"></div>

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
      </div>
    </div>
  );
}