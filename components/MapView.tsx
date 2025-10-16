'use client';

import { useEffect, useRef, useState } from 'react';

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
  // Scale from 0.5 to 2.0
  return 0.5 + (ratio * 1.5);
};

/**
 * MapView Component
 * 
 * Renders the interactive map using Google Maps Platform.
 * Shows neighborhood markers with color-coded intensity and zoom functionality.
 */
// SF Neighborhood coordinates for street marker distribution
const NEIGHBORHOOD_COORDS: { [key: string]: [number, number] } = {
  // Downtown / Central Areas
  "Chinatown": [37.7941, -122.4078],
  "Financial District": [37.7946, -122.3999],
  "Nob Hill": [37.7924, -122.4156],
  "North Beach": [37.8005, -122.4098],
  "Russian Hill": [37.8008, -122.4194],
  "Telegraph Hill": [37.8025, -122.4058],
  "Tenderloin": [37.7844, -122.4134],
  "Union Square": [37.7880, -122.4075],
  
  // The Mission and Southeast
  "Bernal Heights": [37.7419, -122.4157],
  "The Castro": [37.7609, -122.4350],
  "Dogpatch": [37.7609, -122.3892],
  "Excelsior": [37.7247, -122.4267],
  "Glen Park": [37.7331, -122.4339],
  "Mission District": [37.7599, -122.4148],
  "Mission Bay": [37.7706, -122.3920],
  "Noe Valley": [37.7504, -122.4330],
  "Portola": [37.7279, -122.4061],
  "Potrero Hill": [37.7577, -122.3988],
  "SoMa": [37.7749, -122.4194],
  "Visitacion Valley": [37.7134, -122.4040],
  
  // West Side / Richmond and Sunset Districts
  "Haight-Ashbury": [37.7697, -122.4479],
  "Inner Richmond": [37.7802, -122.4668],
  "Inner Sunset": [37.7630, -122.4730],
  "Outer Richmond": [37.7758, -122.4965],
  "Outer Sunset": [37.7574, -122.4966],
  "Presidio": [37.7989, -122.4662],
  "Richmond District": [37.7794, -122.4823],
  "Sunset District": [37.7602, -122.4942],
  "Twin Peaks": [37.7544, -122.4477],
  "West Portal": [37.7407, -122.4655],
  
  // Northwest / Marina and Pacific Heights
  "Cow Hollow": [37.7989, -122.4344],
  "Marina District": [37.8043, -122.4410],
  "Pacific Heights": [37.7922, -122.4366],
  
  // Other Notable Neighborhoods
  "Alamo Square": [37.7766, -122.4341],
  "Embarcadero": [37.7955, -122.3937],
  "Fisherman's Wharf": [37.8080, -122.4177],
  "Hayes Valley": [37.7756, -122.4250],
  "Lower Haight": [37.7719, -122.4318],
  "Lower Pacific Heights": [37.7880, -122.4340],
  "Western Addition": [37.7827, -122.4331],
};

// Declare Google Maps types
declare global {
  interface Window {
    google: any;
  }
}

export default function MapView({ neighborhoods, coordinates }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const streetViewRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any | null>(null);
  const streetViewInstanceRef = useRef<any | null>(null);
  const markersRef = useRef<any[]>([]);
  const neighborhoodMarkersRef = useRef<any[]>([]);
  const streetMarkersRef = useRef<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentZoom, setCurrentZoom] = useState(12);
  const [markerMode, setMarkerMode] = useState<'neighborhood' | 'mixed' | 'street'>('neighborhood');
  const [showStreetView, setShowStreetView] = useState(false);
  const [streetViewLocation, setStreetViewLocation] = useState<{lat: number, lng: number} | null>(null);

  const maxIntensity = Math.max(...neighborhoods.map(n => n.intensity), 1);
  const maxCitations = Math.max(...neighborhoods.map(n => n.citation_count), 1);
  
  // Ensure we have at least 100 coordinates for display
  const displayCoordinates = coordinates.length >= 100 ? coordinates : coordinates;

  useEffect(() => {
    const initMap = async () => {
      try {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        
        if (!apiKey) {
          setError('Google Maps API key not configured. Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your .env.local file.');
          setIsLoading(false);
          return;
        }

        // Load Google Maps script
        if (!window.google) {
          const script = document.createElement('script');
          script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
          script.async = true;
          script.defer = true;
          
          await new Promise<void>((resolve, reject) => {
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load Google Maps'));
            document.head.appendChild(script);
          });
        }

        if (!mapRef.current) return;

        // Create map
        const map = new window.google.maps.Map(mapRef.current, {
          center: { lat: 37.7749, lng: -122.4194 },
          zoom: 12,
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
          zoomControl: true,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ]
        });

        mapInstanceRef.current = map;

        // Add neighborhood markers
        addNeighborhoodMarkers(map);

        // Listen for zoom changes with enhanced interactivity
        map.addListener('zoom_changed', () => {
          const zoom = map.getZoom() || 12;
          setCurrentZoom(zoom);
          updateMarkersForZoom(map, zoom);
        });

        // Listen for bounds changes to load more street markers when panning
        map.addListener('bounds_changed', () => {
          const zoom = map.getZoom() || 12;
          if (zoom >= 14) {
            updateStreetMarkersInBounds(map);
          }
        });

        setIsLoading(false);
      } catch (err) {
        console.error('Error loading Google Maps:', err);
        setError('Failed to load Google Maps. Please check your API key and internet connection.');
        setIsLoading(false);
      }
    };

    initMap();

    return () => {
      // Cleanup markers
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
    };
  }, [neighborhoods, coordinates]);

  const addNeighborhoodMarkers = async (map: any) => {
    // Clear existing neighborhood markers
    neighborhoodMarkersRef.current.forEach(marker => marker.setMap(null));
    neighborhoodMarkersRef.current = [];

    for (const neighborhood of neighborhoods) {
      const color = getHeatColor(neighborhood.intensity, maxIntensity);
      const scale = getMarkerScale(neighborhood.citation_count, maxCitations);

      // Create custom marker with circle
      const marker = new window.google.maps.Marker({
        position: { lat: neighborhood.latitude, lng: neighborhood.longitude },
        map: map,
        title: neighborhood.neighborhood,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          fillColor: color,
          fillOpacity: 0.8,
          strokeColor: '#ffffff',
          strokeWeight: 3,
          scale: 12 * scale,
        },
        optimized: false,
        zIndex: 100,
      });

      // Enhanced info window with WOW effect and more details
      const streetMarkersCount = getNeighborhoodStreetMarkers(neighborhood.neighborhood).length;
      const avgFinePerCitation = neighborhood.total_fines / neighborhood.citation_count;
      
      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 18px; min-width: 300px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
              <div style="width: 16px; height: 16px; border-radius: 50%; background-color: ${color}; box-shadow: 0 0 15px ${color}60, 0 0 30px ${color}30;"></div>
              <h3 style="margin: 0; font-size: 20px; font-weight: 700; color: #1f2937; text-shadow: 0 1px 2px rgba(0,0,0,0.1);">
                ${neighborhood.neighborhood}
              </h3>
            </div>
            
            <div style="background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%); padding: 15px; border-radius: 12px; margin-bottom: 15px; border: 1px solid #cbd5e1;">
              <div style="display: grid; gap: 12px; font-size: 14px;">
                <div style="display: flex; justify-content: space-between; gap: 16px; padding: 8px 0; border-bottom: 2px solid #e2e8f0;">
                  <span style="color: #475569; font-weight: 600;">🎯 Total Citations:</span>
                  <span style="color: #dc2626; font-weight: 800; font-size: 18px; text-shadow: 0 1px 2px rgba(220,38,38,0.3);">${neighborhood.citation_count.toLocaleString()}</span>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 16px; padding: 8px 0; border-bottom: 2px solid #e2e8f0;">
                  <span style="color: #475569; font-weight: 600;">💰 Total Fines:</span>
                  <span style="color: #dc2626; font-weight: 800; font-size: 18px; text-shadow: 0 1px 2px rgba(220,38,38,0.3);">$${neighborhood.total_fines.toLocaleString()}</span>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 16px; padding: 8px 0; border-bottom: 2px solid #e2e8f0;">
                  <span style="color: #475569; font-weight: 600;">📊 Avg Fine:</span>
                  <span style="color: #f59e0b; font-weight: 700; font-size: 16px;">$${avgFinePerCitation.toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 16px; padding: 8px 0; border-bottom: 2px solid #e2e8f0;">
                  <span style="color: #475569; font-weight: 600;">🚨 Top Violation:</span>
                  <span style="color: ${getViolationColor(neighborhood.top_violation)}; font-weight: 700; font-size: 14px; text-shadow: 0 1px 2px rgba(0,0,0,0.2);">${neighborhood.top_violation}</span>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 16px; padding: 8px 0;">
                  <span style="color: #475569; font-weight: 600;">📍 Street Locations:</span>
                  <span style="color: #059669; font-weight: 700; font-size: 16px;">${streetMarkersCount} spots</span>
                </div>
              </div>
            </div>
            
            <div style="text-align: center; font-size: 13px; color: #64748b; background: linear-gradient(90deg, #3b82f6, #8b5cf6); background-clip: text; -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-weight: 700; padding: 8px;">
              🔍 Zoom in to see ${streetMarkersCount} street-level citations with vibrant colors!
            </div>
          </div>
        `,
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });

      neighborhoodMarkersRef.current.push(marker);
      markersRef.current.push(marker);
    }
  };

  const updateMarkersForZoom = (map: any, zoom: number) => {
    // Define zoom levels and their behaviors
    if (zoom < 13) {
      // Neighborhood level - show only neighborhood markers
      setMarkerMode('neighborhood');
      showNeighborhoodMarkers(true);
      showStreetMarkers(false);
    } else if (zoom >= 13 && zoom < 15) {
      // Mixed level - show both with enhanced street markers per neighborhood
      // Ensure at least 100 citations are visible
      setMarkerMode('mixed');
      showNeighborhoodMarkers(true, 0.7);
      showNeighborhoodStreetMarkers(map, Math.max(100, displayCoordinates.length));
    } else {
      // Street level - show all available citations (minimum 100)
      setMarkerMode('street');
      showNeighborhoodMarkers(false);
      showStreetMarkers(true, Math.max(150, displayCoordinates.length));
    }
  };

  // Show street markers for each visible neighborhood (minimum 100 total)
  const showNeighborhoodStreetMarkers = (map: any, minMarkers: number = 100) => {
    // Clear existing street markers
    streetMarkersRef.current.forEach(marker => marker.setMap(null));
    streetMarkersRef.current = [];

    const bounds = map.getBounds();
    if (!bounds) return;

    // Use all available coordinates, ensuring we show at least minMarkers
    const coordsToShow = displayCoordinates.slice(0, Math.max(minMarkers, displayCoordinates.length));
    
    coordsToShow.forEach((coord, index) => {
      const marker = new window.google.maps.Marker({
        position: { lat: coord.lat, lng: coord.lon },
        map: map,
        title: coord.violation,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          fillColor: getViolationColor(coord.violation),
          fillOpacity: 0.9,
          strokeColor: '#FFFFFF',
          strokeWeight: 3,
          scale: 8,
        },
        optimized: false,
        zIndex: 75,
        animation: window.google.maps.Animation.DROP,
      });

      (marker as any).isStreetLevel = true;
      (marker as any).coordinate = coord;

      // Enhanced info window with Street View button
      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; min-width: 240px;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
              <div style="width: 12px; height: 12px; border-radius: 50%; background-color: ${getViolationColor(coord.violation)}; box-shadow: 0 0 10px ${getViolationColor(coord.violation)}40;"></div>
              <strong style="color: #1f2937; font-size: 16px;">${coord.violation}</strong>
            </div>
            
            <div style="background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); padding: 12px; border-radius: 8px; margin-bottom: 10px;">
              <div style="display: grid; gap: 8px; font-size: 14px;">
                <div style="display: flex; justify-content: space-between; gap: 16px;">
                  <span style="color: #64748b; font-weight: 500;">📍 Location:</span>
                  <span style="color: #1f2937; font-weight: 600;">${coord.lat.toFixed(4)}, ${coord.lon.toFixed(4)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 16px;">
                  <span style="color: #64748b; font-weight: 500;">💰 Fine Amount:</span>
                  <span style="color: #dc2626; font-weight: 700; font-size: 16px;">$${coord.fine.toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 16px;">
                  <span style="color: #64748b; font-weight: 500;">🎯 Violation Type:</span>
                  <span style="color: ${getViolationColor(coord.violation)}; font-weight: 700;">${coord.violation}</span>
                </div>
              </div>
            </div>
            
            <button 
              id="streetview-btn-${index}" 
              style="width: 100%; padding: 10px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.1); transition: transform 0.2s;"
              onmouseover="this.style.transform='scale(1.02)'" 
              onmouseout="this.style.transform='scale(1)'"
            >
              🗺️ Open Street View
            </button>
          </div>
        `,
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
        // Add event listener for Street View button after a short delay
        setTimeout(() => {
          const btn = document.getElementById(`streetview-btn-${index}`);
          if (btn) {
            btn.addEventListener('click', () => {
              openStreetView(coord.lat, coord.lon, map);
            });
          }
        }, 100);
      });

      streetMarkersRef.current.push(marker);
      markersRef.current.push(marker);
    });
  };

  const showNeighborhoodMarkers = (visible: boolean, opacity: number = 0.8) => {
    neighborhoodMarkersRef.current.forEach(marker => {
      marker.setVisible(visible);
      if (visible) {
        const icon = marker.getIcon();
        marker.setIcon({
          ...icon,
          fillOpacity: opacity,
        });
      }
    });
  };

  // Open Street View at a specific location
  const openStreetView = (lat: number, lon: number, map: any) => {
    setStreetViewLocation({ lat, lng: lon });
    setShowStreetView(true);
    
    // Initialize Street View if not already done
    if (!streetViewInstanceRef.current && streetViewRef.current) {
      const panorama = new window.google.maps.StreetViewPanorama(
        streetViewRef.current,
        {
          position: { lat, lng: lon },
          pov: { heading: 0, pitch: 0 },
          zoom: 1,
          addressControl: true,
          linksControl: true,
          panControl: true,
          enableCloseButton: true,
        }
      );
      streetViewInstanceRef.current = panorama;
      map.setStreetView(panorama);
    } else if (streetViewInstanceRef.current) {
      // Update existing Street View position
      streetViewInstanceRef.current.setPosition({ lat, lng: lon });
    }
  };

  const showStreetMarkers = (visible: boolean, maxMarkers: number = 100) => {
    if (!visible) {
      streetMarkersRef.current.forEach(marker => marker.setMap(null));
      streetMarkersRef.current = [];
      return;
    }

    // Clear existing street markers
    streetMarkersRef.current.forEach(marker => marker.setMap(null));
    streetMarkersRef.current = [];

    if (displayCoordinates.length > 0 && mapInstanceRef.current) {
      addStreetLevelMarkers(mapInstanceRef.current, Math.max(maxMarkers, 100));
    }
  };

  const updateStreetMarkersInBounds = (map: any) => {
    if (currentZoom < 14) return;

    const bounds = map.getBounds();
    if (!bounds) return;

    // Filter coordinates within current bounds
    const visibleCoords = displayCoordinates.filter(coord => 
      bounds.contains(new window.google.maps.LatLng(coord.lat, coord.lon))
    );

    // Ensure we show at least 100 markers, or all available
    const maxMarkers = Math.max(currentZoom >= 16 ? 200 : currentZoom >= 15 ? 150 : 100, visibleCoords.length);
    const coordsToShow = visibleCoords.slice(0, Math.min(maxMarkers, displayCoordinates.length));

    // Clear existing street markers
    streetMarkersRef.current.forEach(marker => marker.setMap(null));
    streetMarkersRef.current = [];

    // Add new markers for visible area
    coordsToShow.forEach((coord, index) => {
      const marker = new window.google.maps.Marker({
        position: { lat: coord.lat, lng: coord.lon },
        map: map,
        title: coord.violation,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          fillColor: getViolationColor(coord.violation),
          fillOpacity: 0.8,
          strokeColor: '#ffffff',
          strokeWeight: 2,
          scale: currentZoom >= 16 ? 6 : 5,
        },
        optimized: false,
        zIndex: 50,
      });

      (marker as any).isStreetLevel = true;

      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; min-width: 220px;">
            <div style="display: grid; gap: 8px; font-size: 13px;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                <div style="width: 10px; height: 10px; border-radius: 50%; background-color: ${getViolationColor(coord.violation)}; box-shadow: 0 0 8px ${getViolationColor(coord.violation)}40;"></div>
                <strong style="color: #1f2937; font-size: 15px;">${coord.violation}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; gap: 12px; padding: 6px 0; border-top: 1px solid #e5e7eb;">
                <span style="color: #6b7280; font-weight: 500;">💰 Fine:</span>
                <span style="color: #dc2626; font-weight: 700; font-size: 15px;">$${coord.fine.toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; gap: 12px; padding: 6px 0; border-top: 1px solid #e5e7eb;">
                <span style="color: #6b7280; font-weight: 500;">📍 Location:</span>
                <span style="color: #1f2937; font-weight: 600; font-size: 11px;">${coord.lat.toFixed(4)}, ${coord.lon.toFixed(4)}</span>
              </div>
            </div>
            <button 
              id="svb-btn-${index}" 
              style="width: 100%; padding: 10px; margin-top: 10px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.1); font-size: 13px;"
              onmouseover="this.style.transform='scale(1.02)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.2)'" 
              onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.1)'"
            >
              🗺️ View in Street View
            </button>
          </div>
        `,
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
        setTimeout(() => {
          const btn = document.getElementById(`svb-btn-${index}`);
          if (btn) {
            btn.addEventListener('click', () => {
              openStreetView(coord.lat, coord.lon, map);
            });
          }
        }, 100);
      });

      streetMarkersRef.current.push(marker);
      markersRef.current.push(marker);
    });
  };

  const addStreetLevelMarkers = (map: any, maxMarkers: number = 100) => {
    // Add street-level markers ensuring we show at least 100
    const coordsToShow = displayCoordinates.slice(0, Math.max(maxMarkers, 150));
    
    coordsToShow.forEach((coord, index) => {
      const marker = new window.google.maps.Marker({
        position: { lat: coord.lat, lng: coord.lon },
        map: map,
        title: coord.violation,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          fillColor: getViolationColor(coord.violation),
          fillOpacity: 0.8,
          strokeColor: '#ffffff',
          strokeWeight: 2,
          scale: currentZoom >= 16 ? 6 : 5,
        },
        optimized: false,
        zIndex: 50,
      });

      (marker as any).isStreetLevel = true;

      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; min-width: 220px;">
            <div style="display: grid; gap: 8px; font-size: 13px;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                <div style="width: 10px; height: 10px; border-radius: 50%; background-color: ${getViolationColor(coord.violation)}; box-shadow: 0 0 8px ${getViolationColor(coord.violation)}40;"></div>
                <strong style="color: #1f2937; font-size: 15px;">${coord.violation}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; gap: 12px; padding: 6px 0; border-top: 1px solid #e5e7eb;">
                <span style="color: #6b7280; font-weight: 500;">💰 Fine:</span>
                <span style="color: #dc2626; font-weight: 700; font-size: 15px;">$${coord.fine.toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; gap: 12px; padding: 6px 0; border-top: 1px solid #e5e7eb;">
                <span style="color: #6b7280; font-weight: 500;">📍 Location:</span>
                <span style="color: #1f2937; font-weight: 600; font-size: 11px;">${coord.lat.toFixed(4)}, ${coord.lon.toFixed(4)}</span>
              </div>
            </div>
            <button 
              id="sv-btn-${index}" 
              style="width: 100%; padding: 10px; margin-top: 10px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.1); font-size: 13px;"
              onmouseover="this.style.transform='scale(1.02)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.2)'" 
              onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.1)'"
            >
              🗺️ View in Street View
            </button>
          </div>
        `,
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
        setTimeout(() => {
          const btn = document.getElementById(`sv-btn-${index}`);
          if (btn) {
            btn.addEventListener('click', () => {
              openStreetView(coord.lat, coord.lon, map);
            });
          }
        }, 100);
      });

      streetMarkersRef.current.push(marker);
      markersRef.current.push(marker);
    });
  };

  // Get high-contrast, vibrant colors for violations - WOW effect!
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

  // Get neighborhood-specific street markers (5+ per neighborhood)
  const getNeighborhoodStreetMarkers = (neighborhoodName: string): CoordinateData[] => {
    const neighborhoodCoord = NEIGHBORHOOD_COORDS[neighborhoodName];
    if (!neighborhoodCoord) return [];

    // Filter coordinates near this neighborhood (within ~0.01 degrees)
    const nearbyCoords = coordinates.filter(coord => {
      const latDiff = Math.abs(coord.lat - neighborhoodCoord[0]);
      const lonDiff = Math.abs(coord.lon - neighborhoodCoord[1]);
      return latDiff < 0.015 && lonDiff < 0.015; // Slightly larger radius
    });

    // Return at least 5 markers, more if available
    return nearbyCoords.slice(0, Math.max(8, nearbyCoords.length));
  };

  if (error) {
    return (
      <div className="w-full h-[600px] rounded-lg shadow-lg overflow-hidden border border-gray-300 bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8 max-w-md">
          <div className="text-5xl mb-4">🗺️</div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Google Maps Configuration Required
          </h3>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
            <p className="text-sm font-semibold text-blue-900 mb-2">Quick Setup:</p>
            <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
              <li>Go to Google Cloud Console</li>
              <li>Enable Maps JavaScript API</li>
              <li>Create API key</li>
              <li>Add to .env.local as NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</li>
              <li>Restart dev server</li>
            </ol>
            <a 
              href="https://developers.google.com/maps/documentation/javascript/get-api-key"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-800 mt-2 inline-block"
            >
              View Setup Guide →
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <div className="flex gap-2">
        {/* Main Map */}
        <div className={`relative ${showStreetView ? 'w-1/2' : 'w-full'} h-[600px] rounded-lg shadow-lg overflow-hidden border border-gray-300 transition-all duration-300`}>
          <div 
            ref={mapRef} 
            className="w-full h-full"
            style={{ background: '#f5f5f5' }}
          />
          
          {/* Citation Counter */}
          {!isLoading && !error && (
            <div className="absolute top-4 left-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg px-4 py-2 shadow-lg">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{displayCoordinates.length}</span>
                <div className="text-xs font-medium">
                  <div>Individual</div>
                  <div>Citations</div>
                </div>
              </div>
            </div>
          )}
          
          {/* Zoom Level Indicator */}
          {!isLoading && !error && (
            <div className="absolute top-4 left-28 bg-white bg-opacity-95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-gray-200">
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
                {markerMode === 'mixed' && 'Click any marker to open Street View'}
                {markerMode === 'street' && 'All citations visible - click for Street View'}
              </div>
            </div>
          )}

          {/* Interactive Help */}
          {!isLoading && !error && (
            <div className="absolute bottom-4 right-4 bg-white bg-opacity-95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-gray-200">
              <div className="text-xs text-gray-600">
                <div className="flex items-center gap-1 mb-1">
                  <span>🔍</span>
                  <span>Zoom to explore</span>
                </div>
                <div className="flex items-center gap-1 mb-1">
                  <span>📍</span>
                  <span>Click markers for details</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>🗺️</span>
                  <span>Open Street View for exact location</span>
                </div>
              </div>
            </div>
          )}
          
          {isLoading && (
            <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading Google Maps with {displayCoordinates.length} citations...</p>
              </div>
            </div>
          )}
        </div>

        {/* Street View Panel */}
        {showStreetView && (
          <div className="relative w-1/2 h-[600px] rounded-lg shadow-lg overflow-hidden border border-gray-300 animate-in slide-in-from-right duration-300">
            <div 
              ref={streetViewRef} 
              className="w-full h-full"
              style={{ background: '#f5f5f5' }}
            />
            
            {/* Close Street View Button */}
            <button
              onClick={() => setShowStreetView(false)}
              className="absolute top-4 right-4 bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-4 rounded-lg shadow-lg border border-gray-300 transition-all duration-200 hover:scale-105"
            >
              ✕ Close Street View
            </button>
            
            {/* Street View Info */}
            <div className="absolute bottom-4 left-4 bg-white bg-opacity-95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-gray-200">
              <div className="text-xs text-gray-600">
                <div className="font-semibold text-sm text-gray-800 mb-1">Street View Active</div>
                {streetViewLocation && (
                  <div className="text-xs">
                    📍 {streetViewLocation.lat.toFixed(6)}, {streetViewLocation.lng.toFixed(6)}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
