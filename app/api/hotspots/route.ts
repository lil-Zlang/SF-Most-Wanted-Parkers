import { NextResponse } from 'next/server';
import { fetchAllHotspots } from '@/lib/db';

/**
 * API route to fetch citation hotspots from database
 * GET /api/hotspots
 */
export async function GET() {
  try {
    const hotspots = await fetchAllHotspots(1000);
    return NextResponse.json(hotspots);
  } catch (error) {
    console.error('Error fetching hotspots:', error);
    return NextResponse.json(
      { error: 'Failed to fetch citation hotspots' },
      { status: 500 }
    );
  }
}

