# Citation Heat Map Features

## Overview
Interactive heat map showing 2025 parking citation hotspots in San Francisco.

## Features Implemented

### ✅ Core Functionality
- **Street-level aggregation**: Citations grouped by `citation_location` 
- **Automatic geocoding**: Google Maps API geocodes addresses on-the-fly
- **Top 1000 locations**: Performance optimized for fast loading
- **Real-time data**: All citations from 2025 (907,527 citations total)

### ✅ Visualization
- **Heat map layer**: Gradient visualization showing citation density
- **Color-coded markers**: 5-tier color system (red = most citations)
- **Smart marker display**: Only locations with 10+ citations show markers
- **Weighted heat map**: Citation count determines heat intensity

### ✅ Interactivity
- **Clickable markers**: Show detailed info windows
- **Violation breakdown**: Top 5 violation types per location
- **Citation statistics**: Total count and fines per location
- **Pan and zoom**: Full Google Maps controls

### ✅ Performance Optimizations
- **Geocoding cache**: Prevents redundant API calls
- **Rate limiting**: 50 requests/second max to avoid quota issues
- **Top 500 limit**: Only geocodes top 500 hotspots for speed
- **Progress indicator**: Shows geocoding progress to user

### ✅ Data Display
- **Top 20 table**: Sortable list of worst citation hotspots
- **Location details**: Street address, citation count, total fines
- **Violation types**: Most common violation per location

## Data Files Generated

1. **street_heatmap.json** (259KB)
   - Top 1000 citation locations
   - Citation counts and violation breakdowns
   - Ready for frontend geocoding

2. **violation_summary.json** (437B)
   - Overview of all violation types
   - City-wide statistics

## How It Works

1. **Backend** (`process_data.py`):
   - Fetches 2025 data from SF Open Data Portal
   - Groups citations by `citation_location` (street address)
   - Calculates statistics per location
   - Saves top 1000 locations to JSON

2. **Frontend** (`CitationHeatMap.tsx`):
   - Loads street location data
   - Uses Google Maps Geocoding API to convert addresses to coordinates
   - Displays markers and heat map layer
   - Provides interactive exploration

## Future Enhancements (Optional)

### Filtering
- Filter by violation type
- Filter by citation count threshold
- Date range selector

### Advanced Features
- Clustering for dense areas
- Time-based animation
- Export to CSV
- Share specific locations

## Usage

```bash
# Regenerate data
python process_data.py --start-date 2025-01-01

# Run development server
npm run dev
```

Visit http://localhost:3000 to see the heat map!

## API Requirements

Set in `.env.local`:
```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
```

Enable these APIs in Google Cloud Console:
- Maps JavaScript API
- Geocoding API
- Maps Visualization Library (for heat maps)
