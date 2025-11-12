import { sql } from '@vercel/postgres'
import dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

async function checkProgress() {
  try {
    console.log('📊 Checking fetch progress...\n')

    // Check total citations in database
    const totalCitations = await sql`
      SELECT COUNT(*) as count
      FROM plate_details,
      jsonb_array_elements(citations) as citation;
    `
    console.log(`📋 Total citations in database: ${parseInt(totalCitations.rows[0].count).toLocaleString()}`)

    // Check citations by year
    const citationsByYear = await sql`
      SELECT 
        EXTRACT(YEAR FROM (citation->>'date')::timestamp) as year,
        COUNT(*) as count
      FROM plate_details,
      jsonb_array_elements(citations) as citation
      WHERE citation->>'date' IS NOT NULL
      GROUP BY year
      ORDER BY year DESC;
    `
    console.log('\n📅 Citations by year:')
    citationsByYear.rows.forEach(row => {
      console.log(`   ${row.year}: ${parseInt(row.count).toLocaleString()}`)
    })

    // Check citations for September 2025
    const sept2025 = await sql`
      SELECT COUNT(*) as count
      FROM plate_details,
      jsonb_array_elements(citations) as citation
      WHERE (citation->>'date')::timestamp >= '2025-09-01'::timestamp
        AND (citation->>'date')::timestamp < '2025-10-01'::timestamp;
    `
    console.log(`\n📅 September 2025 citations: ${parseInt(sept2025.rows[0].count).toLocaleString()}`)

    // Check citations for October 2025
    const oct2025 = await sql`
      SELECT COUNT(*) as count
      FROM plate_details,
      jsonb_array_elements(citations) as citation
      WHERE (citation->>'date')::timestamp >= '2025-10-01'::timestamp
        AND (citation->>'date')::timestamp < '2025-11-01'::timestamp;
    `
    console.log(`📅 October 2025 citations: ${parseInt(oct2025.rows[0].count).toLocaleString()}`)

    // Check total plates
    const plateCount = await sql`SELECT COUNT(*) FROM plate_details;`
    console.log(`\n🚗 Total plates: ${parseInt(plateCount.rows[0].count).toLocaleString()}`)

    // Check hotspots
    const hotspotCount = await sql`SELECT COUNT(*) FROM citation_hotspots;`
    console.log(`📍 Citation hotspots: ${parseInt(hotspotCount.rows[0].count).toLocaleString()}`)

    // Check recent citations (last hour)
    const recentCitations = await sql`
      SELECT COUNT(*) as count
      FROM plate_details,
      jsonb_array_elements(citations) as citation
      WHERE (citation->>'date')::timestamp >= NOW() - INTERVAL '1 hour';
    `
    console.log(`\n⏰ Citations added in last hour: ${parseInt(recentCitations.rows[0].count).toLocaleString()}`)

    // Show sample of recent citations
    const sampleRecent = await sql`
      SELECT 
        citation->>'date' as date,
        citation->>'citation_number' as citation_number,
        citation->>'location' as location
      FROM plate_details,
      jsonb_array_elements(citations) as citation
      WHERE (citation->>'date')::timestamp >= '2025-09-01'::timestamp
      ORDER BY (citation->>'date')::timestamp DESC
      LIMIT 5;
    `
    if (sampleRecent.rows.length > 0) {
      console.log('\n📄 Sample recent citations:')
      sampleRecent.rows.forEach((row, idx) => {
        console.log(`   ${idx + 1}. ${row.date} - ${row.citation_number} - ${row.location}`)
      })
    }

    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

checkProgress()

