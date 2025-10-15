# Neighborhood Heat Map Feature

## Overview

The Neighborhood Heat Map is an interactive visualization that displays parking citation hotspots across San Francisco's neighborhoods. Built with Apple Maps-style UI, it provides an intuitive way to explore which areas have the most parking violations.

## Features

### 🗺️ Interactive Map
- **Apple Maps-style UI**: Familiar, polished interface with custom styling
- **43 SF Neighborhoods**: Comprehensive coverage of all major San Francisco neighborhoods
- **Color-Coded Markers**: Visual intensity indicators based on citation density
- **Dynamic Sizing**: Marker sizes scale with citation counts
- **Zoom Functionality**: Zoom in to see street-level details
- **Popup Tooltips**: Click markers to see detailed statistics

### 🎨 Visual Design
**5-Tier Color System:**
- 🔴 Red: Highest citations (top 20%)
- 🟠 Orange: High citations (60-80%)
- 🟡 Amber: Moderate citations (40-60%)
- 🟢 Yellow: Low citations (20-40%)
- 🌿 Lime: Lowest citations (bottom 20%)

### 📍 Neighborhoods Covered

**Downtown / Central Areas:**
- Chinatown
- Financial District
- Nob Hill
- North Beach
- Russian Hill
- Telegraph Hill
- Tenderloin
- Union Square

**The Mission and Southeast:**
- Bernal Heights
- The Castro / Eureka Valley
- Dogpatch
- Excelsior
- Glen Park
- Mission District
- Mission Bay
- Noe Valley
- Portola
- Potrero Hill
- South of Market (SoMa)
- Visitacion Valley

**West Side / Richmond and Sunset Districts:**
- Haight-Ashbury
- Inner Richmond
- Inner Sunset
- Outer Richmond
- Outer Sunset
- Presidio
- Richmond District
- Sunset District
- Twin Peaks
- West Portal

**Northwest / Marina and Pacific Heights:**
- Cow Hollow
- Marina District
- Pacific Heights

**Other Notable Neighborhoods:**
- Alamo Square
- Embarcadero
- Fisherman's Wharf
- Hayes Valley
- Lower Haight
- Lower Pacific Heights
- Western Addition

## Technical Implementation

### Components

**NeighborhoodHeatMap.tsx** (Parent Component)
- Manages data loading and state
- Fetches neighborhood and coordinate data
- Provides loading states
- Passes data to MapView
- Renders legend

**MapView.tsx** (Map Rendering Component)
- Renders Leaflet map with OpenStreetMap tiles
- Creates circular markers for neighborhoods
- Handles marker colors and sizing
- Implements popups with statistics
- Adds street-level coordinate markers
- Custom Apple Maps-style CSS

### Data Files

**neighborhood_heatmap.json**
```json
[
  {
    "neighborhood": "Financial District",
    "latitude": 37.7946,
    "longitude": -122.3999,
    "total_fines": 125000.00,
    "citation_count": 1250,
    "top_violation": "Expired Meter",
    "intensity": 1250
  }
]
```

**coordinate_heatmap.json**
```json
[
  {
    "lat": 37.7946,
    "lon": -122.3999,
    "fine": 100.00,
    "violation": "Expired Meter"
  }
]
```

### Data Processing

The `process_data.py` script includes:

1. **Neighborhood Mapping**: 43 SF neighborhoods with approximate center coordinates
2. **Geodesic Distance**: Assigns each citation to nearest neighborhood
3. **Aggregation**: Calculates total fines, citation counts, top violations
4. **Coordinate Sampling**: Samples up to 10,000 points for street-level view
5. **Output Generation**: Creates heat map JSON files

### Key Functions

**get_nearest_neighborhood(lat, lon)**
- Uses Euclidean distance for performance
- Assigns citations to closest neighborhood
- Handles edge cases gracefully

**_generate_location_heatmap()**
- Aggregates violation data by neighborhood
- Calculates intensity scores
- Identifies top violations per area
- Samples coordinates for detail view
- Exports JSON files

## Usage

### For Users

1. **View the Map**: Open the main page and scroll to the heat map
2. **Explore Neighborhoods**: Click markers to see statistics
3. **Zoom In**: Use zoom controls to see street-level details
4. **Pan Around**: Drag to explore different areas

### For Developers

**Generate Heat Map Data:**
```bash
# Process data with API download
python process_data.py --api --start-date 2020-01-01 --limit 500000

# Heat map files will be generated in public/data/
```

**Add New Neighborhoods:**
```python
# In process_data.py, add to NEIGHBORHOOD_COORDS:
NEIGHBORHOOD_COORDS = {
    "New Neighborhood": (latitude, longitude),
    # ... other neighborhoods
}
```

**Customize Colors:**
```typescript
// In MapView.tsx, modify getHeatColor function:
const getHeatColor = (intensity: number, maxIntensity: number): string => {
  const ratio = intensity / maxIntensity;
  // Adjust thresholds and colors here
}
```

**Adjust Marker Sizes:**
```typescript
// In MapView.tsx, modify getMarkerSize function:
const getMarkerSize = (citationCount: number, maxCitations: number): number => {
  const ratio = citationCount / maxCitations;
  return 10 + (ratio * 30); // Adjust min/max size
}
```

## Performance

### Optimizations

- ✅ **Dynamic Imports**: Map component lazy-loaded, not SSR
- ✅ **Coordinate Sampling**: Maximum 10,000 points to limit rendering
- ✅ **Efficient Distance Calculation**: Simple Euclidean distance
- ✅ **Client-Side Only**: No server-side rendering overhead
- ✅ **Code Splitting**: Leaflet loaded only when needed

### File Sizes

- `neighborhood_heatmap.json`: ~10-50 KB (43 neighborhoods)
- `coordinate_heatmap.json`: ~500 KB - 2 MB (sampled to 10k points)
- Total bundle increase: ~150 KB (Leaflet + components)

## Browser Compatibility

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## Accessibility

- ✅ Keyboard navigation support (Leaflet default)
- ✅ Screen reader friendly markers
- ✅ High contrast colors for visibility
- ✅ Responsive design for all screen sizes
- ✅ Touch-friendly on mobile devices

## Future Enhancements

### Planned Features
- [ ] Time-based heat map animation
- [ ] Filter by violation type
- [ ] Filter by date range
- [ ] Advanced clustering for better street-level view
- [ ] 3D heat map visualization
- [ ] Export heat map as image
- [ ] Share specific neighborhood views

### Possible Improvements
- [ ] Real-time data updates
- [ ] Predictive analytics for parking patterns
- [ ] Integration with SFMTA enforcement schedules
- [ ] User-reported violation hotspots
- [ ] Comparative neighborhood analysis

## Troubleshooting

**Map not loading?**
- Check browser console for errors
- Ensure JavaScript is enabled
- Verify Leaflet CSS is loaded
- Check network tab for failed requests

**Markers not showing?**
- Verify data files exist in `public/data/`
- Check browser console for JSON parsing errors
- Ensure coordinates are valid (lat/lon ranges)

**Performance issues?**
- Reduce coordinate sample size in `process_data.py`
- Disable street-level markers when zoomed out
- Check browser performance profiler

**Styling looks off?**
- Clear browser cache
- Check that Leaflet CSS loads before custom styles
- Verify Tailwind classes are compiled

## Credits

- **Maps**: OpenStreetMap contributors
- **Library**: React Leaflet
- **Design**: Apple Maps-inspired UI
- **Data**: SF Open Data (SFMTA Parking Citations)

## License

This feature is part of SF's Most Wanted Parkers application.
Data sourced from SFMTA Parking Citations dataset (public domain).

---

**Last Updated**: October 15, 2025
**Version**: 1.2.0

