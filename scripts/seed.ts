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
import { sql } from '@vercel/postgres';

async function seedLeaderboard() {
  const file = path.join(process.cwd(), 'public', 'data', 'leaderboard.json');
  const raw = await fs.readFile(file, 'utf8');
  const rows: Array<{ rank: number; plate: string; total_fines: number; citation_count: number }> = JSON.parse(raw);

  console.log(`Inserting ${rows.length} leaderboard rows…`);
  for (const chunk of chunkArray(rows, 100)) {
    await sql`
      INSERT INTO leaderboard (rank, plate, total_fines, citation_count)
      SELECT * FROM UNNEST(
        ${chunk.map(r => r.rank)},
        ${chunk.map(r => r.plate)},
        ${chunk.map(r => r.total_fines)},
        ${chunk.map(r => r.citation_count)}
      )
      ON CONFLICT (rank) DO UPDATE SET
        plate = EXCLUDED.plate,
        total_fines = EXCLUDED.total_fines,
        citation_count = EXCLUDED.citation_count;
    `;
  }
}

async function seedPlateDetails() {
  const dir = path.join(process.cwd(), 'public', 'data', 'plates');
  const files = await fs.readdir(dir);
  console.log(`Inserting ${files.length} plate details…`);
  for (const fileName of files) {
    if (!fileName.endsWith('.json')) continue;
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
  }
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

(async () => {
  try {
    await seedLeaderboard();
    await seedPlateDetails();
    console.log('Seeding complete ✅');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed', err);
    process.exit(1);
  }
})();
