/**
 * Add coordinate columns to citation_hotspots table
 */
import { sql } from '@vercel/postgres';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function addCoordinateColumns() {
  try {
    console.log('📍 Adding coordinate columns to citation_hotspots...\n');

    await sql`
      ALTER TABLE citation_hotspots
      ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
    `;

    console.log('✅ Added latitude and longitude columns');

    await sql`
      CREATE INDEX IF NOT EXISTS idx_hotspots_coords ON citation_hotspots(latitude, longitude);
    `;

    console.log('✅ Created index on coordinates');
    console.log('\n✨ Done! Now run: npx tsx scripts/geocode_hotspots.ts\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addCoordinateColumns();
