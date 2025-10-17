#!/usr/bin/env ts-node

/**
 * Seed Neon/Vercel Postgres with existing JSON files.
 *
 * 1. leaderboard.json  -> leaderboard table
 * 2. public/data/plates/*.json -> plate_details table
 *
 * Usage:
 *   DATABASE_URL=postgres://... ts-node scripts/seed.ts
 */

import { promises as fs } from 'fs';
import path from 'path';
import { config } from 'dotenv';
import { sql } from '@vercel/postgres';

// Load .env.local
config({ path: '.env.local' });

async function seedLeaderboard() {
  const file = path.join(process.cwd(), 'public', 'data', 'leaderboard.json');
  const raw = await fs.readFile(file, 'utf8');
  const rows: Array<{ rank: number; plate: string; total_fines: number; citation_count: number }> = JSON.parse(raw);

  console.log(`Inserting ${rows.length} leaderboard rows…`);
  let count = 0;
  for (const row of rows) {
    await sql`
      INSERT INTO leaderboard (rank, plate, total_fines, citation_count)
      VALUES (${row.rank}, ${row.plate}, ${row.total_fines}, ${row.citation_count})
      ON CONFLICT (rank) DO UPDATE SET
        plate = EXCLUDED.plate,
        total_fines = EXCLUDED.total_fines,
        citation_count = EXCLUDED.citation_count;
    `;
    count++;
    if (count % 20 === 0) {
      console.log(`  Progress: ${count}/${rows.length}`);
    }
  }
  console.log(`✓ Inserted ${count} leaderboard rows`);
}

async function seedPlateDetails(limit = 500) {
  const dir = path.join(process.cwd(), 'public', 'data', 'plates');
  const allFiles = (await fs.readdir(dir)).filter(f => f.endsWith('.json'));
  const files = limit > 0 ? allFiles.slice(0, limit) : allFiles;
  
  console.log(`Inserting ${files.length} plate details (of ${allFiles.length} total)…`);
  let count = 0;
  
  for (const fileName of files) {
    try {
      const plate = fileName.replace('.json', '').toUpperCase();
      const raw = await fs.readFile(path.join(dir, fileName), 'utf8');
      const detail = JSON.parse(raw);
      
      await sql`
        INSERT INTO plate_details (plate, total_fines, citation_count, plate_state, favorite_violation, citations)
        VALUES (
          ${plate},
          ${detail.total_fines},
          ${detail.citation_count},
          ${detail.plate_state ?? null},
          ${detail.favorite_violation},
          ${JSON.stringify(detail.all_citations)}::jsonb
        )
        ON CONFLICT (plate) DO UPDATE SET
          total_fines = EXCLUDED.total_fines,
          citation_count = EXCLUDED.citation_count,
          plate_state = EXCLUDED.plate_state,
          favorite_violation = EXCLUDED.favorite_violation,
          citations = EXCLUDED.citations;
      `;
      count++;
      if (count % 50 === 0) {
        console.log(`  Progress: ${count}/${files.length}`);
      }
    } catch (err) {
      console.warn(`  Skipping ${fileName}:`, (err as Error).message);
    }
  }
  console.log(`✓ Inserted ${count} plate details`);
}

(async () => {
  try {
    await seedLeaderboard();
    
    // Plate details are optional (directory might not exist)
    try {
      await seedPlateDetails();
    } catch (err) {
      console.warn('⚠️  Skipping plate details:', (err as Error).message);
    }
    
    console.log('Seeding complete ✅');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed', err);
    process.exit(1);
  }
})();
