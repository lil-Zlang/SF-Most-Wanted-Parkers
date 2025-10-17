## Environment Setup

1. Pull env vars from Vercel (recommended):

```bash
vercel env pull .env.local
```

2. Or create `.env.local` manually:

```bash
DATABASE_URL=postgresql://neondb_owner:password@host/neondb?sslmode=require
```

3. Initialize DB schema and seed (one-time):

```bash
psql "$DATABASE_URL" -f scripts/schema.sql
node scripts/seed.ts   # or ts-node
```

4. Dev server

```bash
npm run dev
```
