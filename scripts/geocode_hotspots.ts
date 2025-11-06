/**
 * Geocode citation_hotspots using Nominatim and store coordinates in database
 * This is a ONE-TIME operation that will take ~16-20 minutes (1 req/sec rate limit)
 */
import { sql } from '@vercel/postgres';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

interface Hotspot {
  location: string;
  latitude: number | null;
  longitude: number | null;
}

/**
 * Geocode address using Nominatim (OpenStreetMap's free geocoding service)
 */
async function geocodeWithNominatim(address: string): Promise<{lat: number, lng: number} | null> {
  try {
    const fullAddress = `${address}, San Francisco, CA`;
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?` +
      `q=${encodeURIComponent(fullAddress)}` +
      `&format=json&limit=1`,
      {
        headers: {
          'User-Agent': 'SF-Most-Wanted-Parkers-Geocoder'
        }
      }
    );

    if (response.ok) {
      const results = await response.json();
      if (results && results.length > 0) {
        return {
          lat: parseFloat(results[0].lat),
          lng: parseFloat(results[0].lon)
        };
      }
    }
  } catch (error) {
    console.error(`Failed to geocode ${address}:`, error);
  }

  return null;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function geocodeHotspots() {
  try {
    console.log('🗺️  Starting geocoding of citation_hotspots...\n');

    // Get all hotspots without coordinates
    const hotspots = await sql`
      SELECT location, latitude, longitude
      FROM citation_hotspots
      ORDER BY citation_count DESC;
    `;

    const total = hotspots.rows.length;
    const needGeocoding = hotspots.rows.filter(h => !h.latitude || !h.longitude);

    console.log(`📊 Total hotspots: ${total}`);
    console.log(`📍 Already have coordinates: ${total - needGeocoding.length}`);
    console.log(`🔍 Need geocoding: ${needGeocoding.length}`);

    if (needGeocoding.length === 0) {
      console.log('\n✨ All hotspots already have coordinates!');
      process.exit(0);
    }

    const estimatedMinutes = Math.ceil((needGeocoding.length * 1.1) / 60);
    console.log(`\n⏱️  Estimated time: ~${estimatedMinutes} minutes`);
    console.log(`⚠️  Nominatim rate limit: 1 request per second\n`);

    const startTime = Date.now();
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < needGeocoding.length; i++) {
      const hotspot = needGeocoding[i];
      const progress = i + 1;

      try {
        // Geocode the address
        const coords = await geocodeWithNominatim(hotspot.location);

        if (coords) {
          // Update database
          await sql`
            UPDATE citation_hotspots
            SET latitude = ${coords.lat}, longitude = ${coords.lng}
            WHERE location = ${hotspot.location};
          `;

          successCount++;
          console.log(
            `✅ [${progress}/${needGeocoding.length}] ${hotspot.location} → ` +
            `(${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`
          );
        } else {
          failCount++;
          console.log(
            `❌ [${progress}/${needGeocoding.length}] ${hotspot.location} → Failed to geocode`
          );
        }

        // Respect Nominatim rate limit (1 request per second)
        if (progress < needGeocoding.length) {
          await sleep(1100); // 1.1 seconds to be safe
        }

        // Show progress every 50 locations
        if (progress % 50 === 0) {
          const elapsed = Math.round((Date.now() - startTime) / 1000 / 60);
          const remaining = Math.ceil(((needGeocoding.length - progress) * 1.1) / 60);
          console.log(
            `\n📈 Progress: ${progress}/${needGeocoding.length} ` +
            `(${Math.round((progress / needGeocoding.length) * 100)}%) ` +
            `| Elapsed: ${elapsed}min | Remaining: ~${remaining}min\n`
          );
        }
      } catch (error) {
        console.error(`Error processing ${hotspot.location}:`, error);
        failCount++;
      }
    }

    const totalTime = Math.round((Date.now() - startTime) / 1000 / 60);

    console.log('\n' + '='.repeat(60));
    console.log('✨ Geocoding complete!');
    console.log('='.repeat(60));
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`⏱️  Total time: ${totalTime} minutes`);
    console.log('\n🗺️  Your map will now show all geocoded locations!');
    console.log('💡 Reload your browser to see the updated map.\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

geocodeHotspots();
