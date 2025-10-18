import { sql } from '@vercel/postgres';

// Wrapper to get leaderboard entries from Postgres
export async function fetchLeaderboard(limit = 30) {
  const { rows } = await sql`
    SELECT rank, plate, total_fines, citation_count
    FROM leaderboard
    ORDER BY rank ASC
    LIMIT ${limit};
  `;
  return rows as {
    rank: number;
    plate: string;
    total_fines: number;
    citation_count: number;
  }[];
}

export async function fetchPlateDetails(plate: string) {
  const { rows } = await sql`
    SELECT total_fines, citation_count, plate_state, favorite_violation, citations AS all_citations
    FROM plate_details
    WHERE plate = ${plate}
    LIMIT 1;
  `;
  return rows[0] || null;
}

export async function fetchPlateCitations(plate: string) {
  const { rows } = await sql`SELECT citations FROM plate_details WHERE plate = ${plate} LIMIT 1;`;
  return rows[0]?.citations || null;
}

// Fetch citation hotspots (top locations with most citations)
export async function fetchCitationHotspots(limit = 20) {
  const { rows } = await sql`
    SELECT location, citation_count, total_fines, top_violation, violation_breakdown
    FROM citation_hotspots
    ORDER BY citation_count DESC
    LIMIT ${limit};
  `;
  return rows as {
    location: string;
    citation_count: number;
    total_fines: number;
    top_violation: string;
    violation_breakdown: any;
  }[];
}

// Fetch all hotspots for heatmap (more data)
export async function fetchAllHotspots(limit = 1000) {
  const { rows } = await sql`
    SELECT location, citation_count, total_fines, top_violation, violation_breakdown
    FROM citation_hotspots
    ORDER BY citation_count DESC
    LIMIT ${limit};
  `;
  return rows;
}
