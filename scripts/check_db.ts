/**
 * Quick database inspection script
 */
import { sql } from '@vercel/postgres';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function checkDatabase() {
  try {
    console.log('🔍 Checking database...\n');

    // Check if tables exist
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;
    console.log('📊 Tables in database:', tables.rows.map(r => r.table_name).join(', '));

    // Check plate_details count
    const plateCount = await sql`SELECT COUNT(*) FROM plate_details;`;
    console.log('\n📝 Total plates in plate_details:', plateCount.rows[0].count);

    // Check if any plates have citations
    const citationsCount = await sql`
      SELECT COUNT(*) FROM plate_details
      WHERE citations IS NOT NULL AND jsonb_array_length(citations) > 0;
    `;
    console.log('📋 Plates with citations:', citationsCount.rows[0].count);

    // Sample a few citations to see their structure
    const sampleCitations = await sql`
      SELECT
        plate,
        jsonb_array_length(citations) as citation_count,
        citations->0 as first_citation
      FROM plate_details
      WHERE citations IS NOT NULL
        AND jsonb_array_length(citations) > 0
      LIMIT 3;
    `;

    console.log('\n📄 Sample citations:\n');
    sampleCitations.rows.forEach((row, idx) => {
      console.log(`${idx + 1}. Plate: ${row.plate}`);
      console.log(`   Citation Count: ${row.citation_count}`);
      console.log(`   First Citation:`, JSON.stringify(row.first_citation, null, 2));
      console.log();
    });

    // Check if citations have coordinates
    const withCoords = await sql`
      SELECT COUNT(*) as count
      FROM plate_details,
      jsonb_array_elements(citations) as citation
      WHERE citation->>'latitude' IS NOT NULL
        AND citation->>'longitude' IS NOT NULL;
    `;
    console.log('📍 Citations with coordinates:', withCoords.rows[0].count);

    // Check total citations
    const totalCitations = await sql`
      SELECT COUNT(*) as count
      FROM plate_details,
      jsonb_array_elements(citations) as citation;
    `;
    console.log('🎯 Total citations:', totalCitations.rows[0].count);

    // Check 2025 citations
    const citations2025 = await sql`
      SELECT COUNT(*) as count
      FROM plate_details,
      jsonb_array_elements(citations) as citation
      WHERE (citation->>'date')::timestamp >= '2025-01-01'::timestamp;
    `;
    console.log('📅 Citations from 2025:', citations2025.rows[0].count);

    // Check neighborhood_heatmap table
    try {
      const heatmapCount = await sql`SELECT COUNT(*) FROM citation_hotspots;`;
      console.log('\n🗺️  Citation hotspots:', heatmapCount.rows[0].count);
    } catch (err) {
      console.log('\n⚠️  citation_hotspots table not found');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkDatabase();
