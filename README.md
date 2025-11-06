# SF Most Wanted Parkers

A Next.js application that tracks San Francisco's worst parking offenders using SFMTA citation data stored in Neon/Vercel Postgres. Features an interactive leaderboard, heat maps, and detailed citation analytics - all powered by 100% free and open-source mapping solutions.

## Features

- **📊 Leaderboard** - Top parking offenders ranked by total fines
- **🗺️ Interactive Heat Map** - Geographic visualization of citation hotspots using OpenStreetMap
- **🔍 Plate Search** - Look up detailed citation history for any license plate
- **📍 Free Geocoding** - Address-to-coordinates conversion using Nominatim (no API key required!)
- **🌙 Dark Mode** - Toggle between light and dark themes
- **📱 Responsive Design** - Works seamlessly on desktop, tablet, and mobile
- **🎯 Citation Filtering** - Filter citations by fine amount and month
- **📈 Real-time Statistics** - Dynamic data visualization and analytics
- **💰 Zero Map Costs** - 100% free mapping with Leaflet + OpenStreetMap

## Tech Stack

- **Frontend:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS
- **Database:** Neon Postgres (Vercel Postgres SDK)
- **Maps:** Leaflet + React-Leaflet + OpenStreetMap (100% free!)
- **Geocoding:** Nominatim (OpenStreetMap's free geocoding service)
- **Deployment:** Vercel
- **Data Source:** SF Open Data Portal (SFMTA Parking Citations)
- **Testing:** Jest + React Testing Library

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (Neon recommended)
- No API keys required! (Using free OpenStreetMap + Nominatim)

## Setup Instructions

### 1. Clone and Install

```bash
git clone <repository-url>
cd SF-Most-Wanted-Parkers
npm install
```

### 2. Database Setup

**Create a Neon Database:**

1. Sign up at [neon.tech](https://neon.tech)
2. Create a new project and database
3. Copy the connection string from the dashboard

**Configure Environment Variables:**

Create a `.env.local` file in the project root:

```bash
# Database Connection (only required env variables!)
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
POSTGRES_URL=postgresql://user:pass@host/db?sslmode=require

# No API keys needed for maps - using free OpenStreetMap + Nominatim!
```

**Initialize Database Schema:**

```bash
psql "$DATABASE_URL" -f scripts/schema.sql
```

This creates the following tables:
- `leaderboard` - Top 100 parking offenders
- `plate_details` - Individual plate details with citations (JSONB)
- `citation_hotspots` - Geographic aggregation of citation locations

**Seed Database with Data:**

```bash
npx tsx scripts/seed.ts
```

This imports data from `public/data/leaderboard.json` and individual plate files into the database.

### 3. Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### 4. Build and Deploy

**Build for production:**

```bash
npm run build
npm start
```

**Deploy to Vercel:**

```bash
vercel env add DATABASE_URL
vercel env add POSTGRES_URL
vercel --prod
```

No API keys needed! The app uses free OpenStreetMap and Nominatim services.

## Project Structure

```
SF-Most-Wanted-Parkers/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # Root layout with metadata
│   ├── page.tsx                 # Main leaderboard page
│   ├── plate/[plateNumber]/     # Dynamic plate detail routes
│   └── api/                     # API routes
│       ├── citations/           # Citations API endpoint
│       └── hotspots/            # Hotspots API endpoint
├── components/                   # React components
│   ├── AllCitationsMap.tsx      # Filterable citations map (Leaflet + Nominatim)
│   ├── LeaderboardTable.tsx     # Top offenders table
│   ├── SearchBar.tsx            # License plate search
│   ├── TicketMap.tsx            # Individual citation map (Leaflet)
│   ├── NeighborhoodHeatMap.tsx  # Citation density heat map (Leaflet)
│   ├── ThemeToggle.tsx          # Dark mode toggle
│   └── MapView.tsx              # Leaflet/OpenStreetMap wrapper
├── contexts/
│   └── ThemeContext.tsx         # Theme state management
├── lib/
│   └── db.ts                    # Database utilities
├── types/
│   └── index.ts                 # TypeScript definitions
├── public/
│   └── data/                    # Fallback JSON data
│       ├── leaderboard.json     # Top offenders
│       ├── plate_index.json     # All plates index
│       └── street_heatmap.json  # Heat map data
├── scripts/
│   ├── schema.sql               # Database schema
│   └── seed.ts                  # Database seeding script
└── __tests__/                   # Jest test files
```

## Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm start            # Start production server
npm run lint         # Run ESLint
npm test             # Run Jest tests
npm run test:watch   # Run tests in watch mode
```

## Data Processing

The application uses Python scripts to fetch and process citation data from the SF Open Data Portal:

- `process_data.py` - Main data aggregation script
- `fetch_2025_data.py` - Fetch current year citations
- `fetch_historical_data.py` - Fetch historical citation data

To update the dataset:

```bash
python process_data.py --start-date 2025-01-01
```

## Architecture Highlights

### Database-First with Graceful Degradation

The application follows a database-first approach with fallback to static JSON files:

1. **Primary**: Queries Neon Postgres for data
2. **Fallback**: Falls back to static JSON files if database unavailable
3. **Resilience**: Ensures functionality during development and deployment

### Date Filtering

All pages filter to show only citations from **January 1, 2025 onwards**:

- **Database Layer** (`lib/db.ts`): SQL filtering on JSONB citation arrays
- **API Layer**: REST endpoints enforce date filtering
- **Page Layer**: Additional safety filters
- **Fallback JSON**: Same date logic applied to static files

### Client-Side Maps

All map components use Leaflet + React-Leaflet with OpenStreetMap tiles (100% free!). Maps are dynamically imported with `ssr: false` because Leaflet requires browser APIs. Geocoding is handled by Nominatim (OpenStreetMap's free geocoding service) with no API key required.

## Why Database Instead of JSON Files?

✅ **Scalability** - Handles millions of records efficiently
✅ **Concurrent Access** - Multiple users without file locking issues
✅ **Query Performance** - Indexed lookups vs full file scans
✅ **Data Integrity** - ACID transactions and type validation
✅ **Smaller Repo** - No massive JSON files in git history
✅ **Free Tier** - Neon provides generous free hosting
✅ **Real-time Updates** - Easy to refresh data without redeployment

## Troubleshooting

### Database Connection Issues

```bash
# Test database connection
psql "$DATABASE_URL" -c "SELECT version();"

# Verify tables exist
psql "$DATABASE_URL" -c "\dt"
```

### Map Not Loading

- Clear browser cache and reload
- Check that Leaflet CSS is loading properly
- Check browser console for errors
- Verify internet connection (required for OpenStreetMap tiles)
- Note: No API keys required!

### Build Errors

```bash
# Clear Next.js cache and rebuild
rm -rf .next
npm run build
```

### Missing Data

```bash
# Re-seed the database
npx tsx scripts/seed.ts
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Acknowledgments

- Data provided by [SF Open Data Portal](https://datasf.org/)
- SFMTA Parking Citations dataset
- Built with [Next.js](https://nextjs.org/) and [Vercel](https://vercel.com/)
- Maps powered by [Leaflet](https://leafletjs.com/) and [OpenStreetMap](https://www.openstreetmap.org/)
- Geocoding by [Nominatim](https://nominatim.org/) (OpenStreetMap)
- 100% free and open-source mapping stack!
