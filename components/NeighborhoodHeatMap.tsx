'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

/**
 * Type definitions for neighborhood heat map data
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

// Dynamically import map component to avoid SSR issues
const MapView = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[600px] bg-gray-100 rounded-lg flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading map...</p>
      </div>
    </div>
  )
});

/**
 * NeighborhoodHeatMap Component
 * 
 * Displays an interactive Google Maps visualization showing the most fined
 * neighborhoods in San Francisco. Users can zoom in to see street-level details.
 * 
 * Features:
 * - Google Maps integration with superior mapping data
 * - Interactive neighborhood markers
 * - Heat map visualization based on citation density
 * - Zoom functionality to show street-level details (zoom >= 15)
 * - Info windows with detailed statistics
 * - Responsive design
 */
export default function NeighborhoodHeatMap() {
  const [neighborhoods, setNeighborhoods] = useState<NeighborhoodData[]>([]);
  const [coordinates, setCoordinates] = useState<CoordinateData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load heat map data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [neighborhoodRes, coordRes] = await Promise.all([
          fetch('/data/neighborhood_heatmap.json'),
          fetch('/data/coordinate_heatmap.json')
        ]);

        if (neighborhoodRes.ok && coordRes.ok) {
          const neighborhoodData = await neighborhoodRes.json();
          const coordData = await coordRes.json();
          setNeighborhoods(neighborhoodData);
          setCoordinates(coordData);
        }
      } catch (error) {
        console.error('Error loading heat map data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="w-full h-[600px] bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading heat map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-3xl font-bold text-gray-800">
            Most Fined Neighborhoods
          </h2>
          <span className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-full flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            Google Maps
          </span>
        </div>
        <p className="text-gray-600">
          Powered by Google Maps. Explore parking citation hotspots across San Francisco. 
          <strong>Interactive zoom levels:</strong> Neighborhoods → Mixed view → Street details
        </p>
      </div>
      
      <MapView neighborhoods={neighborhoods} coordinates={coordinates} />

      {/* Enhanced Legend */}
      <div className="mt-4 grid md:grid-cols-2 gap-4">
        {/* Heat Map Legend */}
        <div className="p-4 bg-white rounded-lg shadow">
          <h3 className="font-semibold text-gray-800 mb-3">Neighborhood Heat Map</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-red-600"></div>
              <span className="text-sm text-gray-600">Highest Citations</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-orange-600"></div>
              <span className="text-sm text-gray-600">High Citations</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-amber-500"></div>
              <span className="text-sm text-gray-600">Moderate Citations</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
              <span className="text-sm text-gray-600">Low Citations</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-lime-500"></div>
              <span className="text-sm text-gray-600">Lowest Citations</span>
            </div>
          </div>
        </div>

        {/* Violation Type Legend - High Contrast Colors */}
        <div className="p-4 bg-white rounded-lg shadow border-2 border-gray-100">
          <h3 className="font-semibold text-gray-800 mb-3 text-center">🎨 Vibrant Violation Colors</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full shadow-lg" style={{backgroundColor: '#FF0040', boxShadow: '0 0 8px #FF004040'}}></div>
              <span className="text-gray-700 font-medium">Expired Meter</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full shadow-lg" style={{backgroundColor: '#0080FF', boxShadow: '0 0 8px #0080FF40'}}></div>
              <span className="text-gray-700 font-medium">Street Cleaning</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full shadow-lg" style={{backgroundColor: '#FF6600', boxShadow: '0 0 8px #FF660040'}}></div>
              <span className="text-gray-700 font-medium">No Parking</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full shadow-lg" style={{backgroundColor: '#8000FF', boxShadow: '0 0 8px #8000FF40'}}></div>
              <span className="text-gray-700 font-medium">Disabled Parking</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full shadow-lg" style={{backgroundColor: '#00FF40', boxShadow: '0 0 8px #00FF4040'}}></div>
              <span className="text-gray-700 font-medium">Time Limit</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full shadow-lg" style={{backgroundColor: '#FF0080', boxShadow: '0 0 8px #FF008040'}}></div>
              <span className="text-gray-700 font-medium">Double Parking</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full shadow-lg" style={{backgroundColor: '#FFFF00', boxShadow: '0 0 8px #FFFF0040'}}></div>
              <span className="text-gray-700 font-medium">Bus Zone</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full shadow-lg" style={{backgroundColor: '#FF00FF', boxShadow: '0 0 8px #FF00FF40'}}></div>
              <span className="text-gray-700 font-medium">Other Types</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t-2 border-gradient-to-r from-blue-400 to-purple-500 text-center">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent font-bold text-sm">
              ✨ WOW! Electric colors at street level ✨
            </div>
            <div className="text-xs text-gray-500 mt-1">
              🔍 Zoom to 13+ to see 5+ citations per neighborhood
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


