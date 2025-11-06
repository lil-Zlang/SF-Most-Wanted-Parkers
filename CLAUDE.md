# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SF Most Wanted Parkers is a Next.js application that displays San Francisco's worst parking offenders using SFMTA parking citation data. The application uses a hybrid data architecture with Neon Postgres as the primary data source and JSON files as fallback.

## Development Commands

**Start Development Server**
```bash
npm run dev
# Opens at http://localhost:3000
```

**Build for Production**
```bash
npm run build
```

**Run Tests**
```bash
npm test              # Run all tests
npm run test:watch    # Watch mode for single test development
```

**Linting**
```bash
npm run lint
```

## Database Setup

The application requires a Neon Postgres database. Connection strings must be set in `.env.local`:
- `DATABASE_URL` - Primary connection string
- `POSTGRES_URL` - Vercel-compatible connection string (same value)

**Initialize Schema**
```bash
psql "$DATABASE_URL" -f scripts/schema.sql
```

**Seed Database from JSON Files**
```bash
npx tsx scripts/seed.ts
```

This imports data from `public/data/leaderboard.json` and individual plate files in `public/data/plates/*.json` into the database.

## Architecture Overview

**Data Flow Pattern**: The application follows a database-first approach with graceful degradation. All data queries attempt database access first, then fall back to static JSON files if the database is unavailable. This ensures resilience during development and deployment.

**Database Schema**: Three main tables exist in Postgres:
- `leaderboard` - Top parking offenders ranked by total fines
- `plate_details` - Individual plate information with citations stored as JSONB
- `citation_hotspots` - Geographic aggregation of citation locations

**Page Architecture**: The app uses Next.js 14 App Router with server components for data fetching. The main page (`app/page.tsx`) displays the leaderboard and heatmap using static generation at build time. Dynamic routes (`app/plate/[plateNumber]/page.tsx`) handle individual plate detail pages with on-demand server rendering.

**Data Filtering**: All pages filter to show only citations from January 1, 2025 onwards. The date filtering is implemented at multiple layers for consistency and performance:
  - **Database Layer** (`lib/db.ts`): SQL queries use `WHERE (citation->>'date')::timestamp >= '2025-01-01'::timestamp` to filter JSONB citation arrays
  - **API Layer** (`app/api/citations/route.ts`): REST endpoints enforce date filtering with JavaScript Date comparison
  - **Page Layer** (`app/plate/[plateNumber]/page.tsx`): Additional safety filters ensure no pre-2025 data is displayed
  - **Fallback JSON**: When database is unavailable, JSON files are filtered using the same date logic

**Client-Side Maps**: All map components (`TicketMap`, `MapView`, `AllCitationsMap`, `CitationHeatMap`) use Leaflet + React-Leaflet with OpenStreetMap tiles (100% free!). Maps are dynamically imported with `ssr: false` because Leaflet requires browser APIs. Geocoding is handled by Nominatim (OpenStreetMap's free geocoding service, no API key required). Any new map features must use this pattern.

**Database Utilities**: The `lib/db.ts` module provides typed database query functions using `@vercel/postgres`. All database queries should go through this module to maintain consistency.

## Type System

TypeScript definitions live in `types/index.ts`:
- `LeaderboardEntry` - Leaderboard row structure
- `PlateDetails` - Individual plate with citations array
- `Citation` - Single parking violation with location data

Import types using the `@/types` path alias configured in `tsconfig.json`.

## Path Aliases

The project uses `@/*` to reference root-level imports. Examples:
- `@/components/SearchBar` → `components/SearchBar.tsx`
- `@/lib/db` → `lib/db.ts`
- `@/types` → `types/index.ts`

## Data Processing

The Python script `process_data.py` fetches citation data from SF Open Data Portal's Socrata API and generates the JSON files. This is run periodically to update the dataset but is not part of the regular development workflow. The script aggregates citations by plate number and creates individual plate files for optimized loading.

## Deployment

The application is designed for Vercel deployment with environment variables configured in the Vercel dashboard:
```bash
vercel env add DATABASE_URL
vercel env add POSTGRES_URL
vercel --prod
```
