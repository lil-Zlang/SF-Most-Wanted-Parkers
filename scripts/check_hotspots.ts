/**
 * Check citation_hotspots table
 */
import { sql } from '@vercel/postgres';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function checkHotspots() {
  try {
    console.log('🗺️  Checking citation_hotspots table...\n');

    // Get sample hotspots
    const hotspots = await sql`
      SELECT *
      FROM citation_hotspots
      ORDER BY citation_count DESC
      LIMIT 5;
    `;

    console.log('Top 5 hotspots:');
    hotspots.rows.forEach((row, idx) => {
      console.log(`\n${idx + 1}. Location: ${row.location}`);
      console.log(`   Citations: ${row.citation_count}`);
      console.log(`   Total Fines: $${row.total_fines}`);
      console.log(`   Top Violation: ${row.top_violation}`);
      console.log(`   Violation Breakdown:`, JSON.stringify(row.violation_breakdown, null, 2));
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkHotspots();
