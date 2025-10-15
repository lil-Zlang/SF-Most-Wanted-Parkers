'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';

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
 * Displays an interactive map visualization showing the most fined
 * neighborhoods in San Francisco. Users can zoom in to see street-level details.
 * 
 * Features:
 * - Interactive map with neighborhood markers
 * - Heat map visualization based on citation density
 * - Zoom functionality to show street-level details
 * - Popup tooltips with violation statistics
 * - Apple Maps-style UI and interactions
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
        <h2 className="text-3xl font-bold text-gray-800 mb-2">
          Most Fined Neighborhoods
        </h2>
        <p className="text-gray-600">
          Interactive map showing parking citation hotspots across San Francisco. 
          Zoom in to see street-level details.
        </p>
      </div>
      
      <MapView neighborhoods={neighborhoods} coordinates={coordinates} />

      {/* Legend */}
      <div className="mt-4 p-4 bg-white rounded-lg shadow">
        <h3 className="font-semibold text-gray-800 mb-3">Heat Map Legend</h3>
        <div className="flex items-center gap-6 flex-wrap">
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
    </div>
  );
}

