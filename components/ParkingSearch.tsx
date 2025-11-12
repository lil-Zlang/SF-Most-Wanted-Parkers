'use client'

import { useState } from 'react'

interface ParkingSearchProps {
  onSearch: (address: string) => void
}

export default function ParkingSearch({ onSearch }: ParkingSearchProps) {
  const [query, setQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setIsSearching(true)
    
    // Add "San Francisco" if not included
    const searchQuery = query.includes('San Francisco') || query.includes('SF') 
      ? query 
      : `${query}, San Francisco, CA`
    
    onSearch(searchQuery)
    setIsSearching(false)
  }

  const quickSearches = [
    { label: '🏢 Financial District', query: 'Financial District, San Francisco' },
    { label: '🌉 Marina', query: 'Marina District, San Francisco' },
    { label: '🎨 Mission', query: 'Mission District, San Francisco' },
    { label: '🏛️ Civic Center', query: 'Civic Center, San Francisco' },
  ]

  return (
    <div className="w-full max-w-4xl mx-auto mb-8">
      {/* Main Search */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
            <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Where are you going? (e.g., 1234 Market St, Union Square)"
            className="w-full pl-16 pr-32 py-5 text-lg border-2 border-gray-300 dark:border-gray-600 rounded-2xl shadow-lg focus:ring-4 focus:ring-green-200 focus:border-green-500 dark:bg-gray-800 dark:text-white transition-all"
          />
          <button
            type="submit"
            disabled={isSearching || !query.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all font-medium shadow-md hover:shadow-lg"
          >
            {isSearching ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Searching
              </span>
            ) : (
              'Find Parking'
            )}
          </button>
        </div>
      </form>

      {/* Quick Searches */}
      <div className="mt-4 flex flex-wrap gap-2 justify-center">
        <span className="text-sm text-gray-600 dark:text-gray-400 mr-2 self-center">Popular:</span>
        {quickSearches.map((item) => (
          <button
            key={item.label}
            onClick={() => {
              setQuery(item.query)
              onSearch(item.query)
            }}
            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:border-green-500 hover:bg-green-50 dark:hover:bg-gray-700 transition-all text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Search Tips */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-blue-900 dark:text-blue-200">
            <strong className="font-semibold">Pro tip:</strong> Search for your destination and we'll show the safest parking spots nearby. 
            <span className="block mt-1 text-blue-700 dark:text-blue-300">Try: "Ferry Building", "Oracle Park", "Dolores Park"</span>
          </div>
        </div>
      </div>
    </div>
  )
}

