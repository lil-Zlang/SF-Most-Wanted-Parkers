# SF Most Wanted Parkers

A Next.js app that tracks San Francisco's worst parking offenders using SFMTA citation data stored in Neon/Vercel Postgres.

## Tech Stack

- **Frontend:** Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Database:** Neon Postgres (Vercel Postgres compatible)
- **Deployment:** Vercel
- **Data Source:** SF Open Data Portal (SFMTA Parking Citations)

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Database Setup

**Create Neon Database:**
- Sign up at [neon.tech](https://neon.tech)
- Create a new project and database
- Copy the connection string

**Add Environment Variables:**

```bash
# Local development
echo "DATABASE_URL=postgresql://user:pass@host/db?sslmode=require" >> .env.local
echo "POSTGRES_URL=postgresql://user:pass@host/db?sslmode=require" >> .env.local

# Vercel production
vercel env add DATABASE_URL      # paste connection string
vercel env add POSTGRES_URL      # paste same connection string
```

**Initialize Schema:**

```bash
psql "$DATABASE_URL" -f scripts/schema.sql
```

**Seed Database:**

```bash
npx tsx scripts/seed.ts
```

This will import data from `public/data/leaderboard.json` into the database.

### 3. Development

```bash
npm run dev
# Open http://localhost:3000
```

### 4. Deploy

```bash
vercel --prod
```

## Database Schema

- **leaderboard** - Top 100 parking offenders (rank, plate, total_fines, citation_count)
- **plate_details** - Individual plate details with all citations (JSONB)

## Why Database Instead of JSON Files?

✅ **Scalability** - Handles millions of records efficiently  
✅ **Concurrent Access** - Multiple users without file locking  
✅ **Query Performance** - Indexed lookups vs full file scans  
✅ **Data Integrity** - ACID transactions, type validation  
✅ **Smaller Repo** - No massive JSON files in git history  
✅ **Free Tier** - Neon provides generous free hosting  

## Architecture

- **Pages load from Postgres first**, fall back to JSON files if DB unavailable
- **Serverless functions** query database on-demand
- **Static generation** for leaderboard at build time
- **Dynamic routes** for individual plate details
