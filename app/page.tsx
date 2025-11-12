'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import ParkingSearch from '@/components/ParkingSearch'

// Dynamically import map component (requires browser APIs)
const GoodParkingSpotsMap = dynamic(() => import('@/components/CitationHotspotsMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[700px] bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-900 rounded-xl flex items-center justify-center border-2 border-green-200 dark:border-gray-700">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-600 border-t-transparent mx-auto mb-4"></div>
        <p className="text-green-700 dark:text-green-400 text-lg font-medium">Loading good parking spots...</p>
        <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">Analyzing citation data from 2020-2025</p>
      </div>
    </div>
  )
})

export default function Home() {
  const [searchLocation, setSearchLocation] = useState<{ lat: number; lng: number; address: string } | null>(null)
  const [isGeocoding, setIsGeocoding] = useState(false)

  const handleSearch = async (address: string) => {
    setIsGeocoding(true)
    try {
      // Use Nominatim for geocoding (free)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
        {
          headers: {
            'User-Agent': 'SF-Good-Parking-App'
          }
        }
      )
      const data = await response.json()
      
      if (data && data.length > 0) {
        setSearchLocation({
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          address: data[0].display_name
        })
      } else {
        alert('Address not found. Please try a different search.')
      }
    } catch (error) {
      console.error('Geocoding error:', error)
      alert('Error searching for address. Please try again.')
    } finally {
      setIsGeocoding(false)
    }
  }
  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8 md:py-12 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-8 md:mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 md:w-24 md:h-24 bg-green-100 dark:bg-green-900 rounded-full mb-6">
            <svg className="w-10 h-10 md:w-12 md:h-12 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-4">
            Good Parking Spots in SF
          </h1>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-6">
            Find the safest parking spots in San Francisco based on citation data from 2020-2025. 
            <span className="block mt-2 text-base text-gray-500 dark:text-gray-400">
              Green areas = safer parking (fewer citations), Yellow/Orange = moderate risk
            </span>
          </p>
          <div className="flex items-center justify-center gap-3 text-sm">
            <span className="px-4 py-2 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full font-medium">
              🗺️ 955+ locations mapped
            </span>
            <span className="px-4 py-2 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full font-medium">
              📊 257K+ citations analyzed
            </span>
            <span className="px-4 py-2 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full font-medium">
              📅 2020-2025 data
            </span>
          </div>
        </div>

        {/* Search */}
        <ParkingSearch onSearch={handleSearch} />

        {/* Results Summary */}
        {searchLocation && (
          <div className="max-w-4xl mx-auto mb-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border-2 border-green-200 dark:border-green-800">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <h3 className="font-bold text-green-900 dark:text-green-100 mb-1">
                  Found parking spots near your destination!
                </h3>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Scroll down to see the safest parking locations nearby. Green markers are the safest spots.
                </p>
                <button
                  onClick={() => setSearchLocation(null)}
                  className="mt-2 text-sm text-green-600 dark:text-green-400 hover:underline font-medium"
                >
                  Clear search and show all locations
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Map - Good Parking Spots */}
        <div className="mb-8">
          <GoodParkingSpotsMap searchLocation={searchLocation} />
        </div>

        {/* Info Section */}
        <div className="max-w-4xl mx-auto mt-12 p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            How to Use This Map
          </h2>
          <div className="space-y-3 text-gray-600 dark:text-gray-400">
            <div className="flex items-start gap-3">
              <span className="text-green-600 font-bold text-lg">🟢</span>
              <div>
                <strong className="text-gray-800 dark:text-white">Green markers</strong> indicate the safest parking spots with 0-2 citations over the entire time period.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-yellow-500 font-bold text-lg">🟡</span>
              <div>
                <strong className="text-gray-800 dark:text-white">Yellow/Orange markers</strong> show moderate-risk areas (3-15 citations).
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-gray-600 font-bold text-lg">🔄</span>
              <div>
                <strong className="text-gray-800 dark:text-white">Toggle the view</strong> to see high-risk areas (red) if you want to know where to avoid.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-blue-600 font-bold text-lg">📍</span>
              <div>
                <strong className="text-gray-800 dark:text-white">Click any marker</strong> to see detailed citation information for that location.
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-500 dark:text-gray-400 text-sm mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
          <p className="mb-2">
            Data sourced from <a href="https://data.sfgov.org/Transportation/SFMTA-Parking-Citations/ab4h-6ztd" target="_blank" rel="noopener noreferrer" className="text-green-600 dark:text-green-400 hover:underline">SFMTA Parking Citations dataset</a>
          </p>
          <p className="text-xs">
            Map powered by OpenStreetMap • Updated with all available citation data from 2020-2025
          </p>
        </div>
      </div>
    </main>
  );
}

