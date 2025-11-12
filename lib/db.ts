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

export async function fetchPlateDetails(plate: string, months?: string[], year?: string) {
  // If no filter specified, return all citations
  const yearToUse = year || '2025';
  
  const { rows } = await sql`
    SELECT 
      plate,
      plate_state,
      favorite_violation,
      (
        SELECT jsonb_agg(citation)
        FROM jsonb_array_elements(citations) AS citation
        WHERE (citation->>'date')::timestamp >= '2020-01-01'::timestamp
      ) AS all_citations,
      (
        SELECT COUNT(*)::integer
        FROM jsonb_array_elements(citations) AS citation
        WHERE (citation->>'date')::timestamp >= '2020-01-01'::timestamp
      ) AS citation_count,
      (
        SELECT COALESCE(SUM((citation->>'fine_amount')::numeric), 0)
        FROM jsonb_array_elements(citations) AS citation
        WHERE (citation->>'date')::timestamp >= '2020-01-01'::timestamp
      ) AS total_fines
    FROM plate_details
    WHERE plate = ${plate}
    LIMIT 1;
  `;
  
  // Filter by selected months/year in JavaScript for safety
  const result = rows[0];
  if (!result) return null;
  
  if (result.all_citations && Array.isArray(result.all_citations)) {
    let filteredCitations = result.all_citations;
    
    // Filter by year if specified
    if (yearToUse) {
      filteredCitations = filteredCitations.filter((citation: any) => {
        if (!citation.date) return false;
        return citation.date.startsWith(yearToUse);
      });
    }
    
    // Filter by months if specified
    if (months && months.length > 0) {
      const monthMap: { [key: string]: string } = {
        '01': `${yearToUse}-01`, '02': `${yearToUse}-02`, '03': `${yearToUse}-03`,
        '04': `${yearToUse}-04`, '05': `${yearToUse}-05`, '06': `${yearToUse}-06`,
        '07': `${yearToUse}-07`, '08': `${yearToUse}-08`, '09': `${yearToUse}-09`,
        '10': `${yearToUse}-10`, '11': `${yearToUse}-11`, '12': `${yearToUse}-12`
      };
      const monthPrefixes = months.map(m => monthMap[m]).filter(Boolean);
      
      if (monthPrefixes.length > 0) {
        filteredCitations = filteredCitations.filter((citation: any) => {
          if (!citation.date) return false;
          return monthPrefixes.some(prefix => citation.date.startsWith(prefix));
        });
      }
    }
    
    result.all_citations = filteredCitations;
    result.citation_count = filteredCitations.length;
    result.total_fines = filteredCitations.reduce((sum: number, c: any) => sum + (c.fine_amount || 0), 0);
  }
  
  return result;
}

export async function fetchPlateCitations(plate: string, months?: string[], year?: string) {
  const yearToUse = year || '2025';
  
  const { rows } = await sql`
    SELECT 
      (
        SELECT jsonb_agg(citation)
        FROM jsonb_array_elements(citations) AS citation
        WHERE (citation->>'date')::timestamp >= '2020-01-01'::timestamp
      ) AS citations
    FROM plate_details 
    WHERE plate = ${plate} 
    LIMIT 1;
  `;
  
  // Filter by selected months/year in JavaScript for safety
  const citations = rows[0]?.citations;
  if (!citations || !Array.isArray(citations)) return null;
  
  let filteredCitations = citations;
  
  // Filter by year if specified
  if (yearToUse) {
    filteredCitations = filteredCitations.filter((citation: any) => {
      if (!citation.date) return false;
      return citation.date.startsWith(yearToUse);
    });
  }
  
  // Filter by months if specified
  if (months && months.length > 0) {
    const monthMap: { [key: string]: string } = {
      '01': `${yearToUse}-01`, '02': `${yearToUse}-02`, '03': `${yearToUse}-03`,
      '04': `${yearToUse}-04`, '05': `${yearToUse}-05`, '06': `${yearToUse}-06`,
      '07': `${yearToUse}-07`, '08': `${yearToUse}-08`, '09': `${yearToUse}-09`,
      '10': `${yearToUse}-10`, '11': `${yearToUse}-11`, '12': `${yearToUse}-12`
    };
    const monthPrefixes = months.map(m => monthMap[m]).filter(Boolean);
    
    if (monthPrefixes.length > 0) {
      filteredCitations = filteredCitations.filter((citation: any) => {
        if (!citation.date) return false;
        return monthPrefixes.some(prefix => citation.date.startsWith(prefix));
      });
    }
  }
  
  return filteredCitations;
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
    SELECT location, citation_count, total_fines, top_violation, violation_breakdown, latitude, longitude
    FROM citation_hotspots
    ORDER BY citation_count DESC
    LIMIT ${limit};
  `;
  return rows;
}

// Fetch safe parking zones (areas with fewer citations - inverse of hotspots)
// Returns locations with coordinates, ordered by lowest citation count
export async function fetchSafeZones(limit = 1000) {
  const { rows } = await sql`
    SELECT location, citation_count, total_fines, top_violation, violation_breakdown, latitude, longitude
    FROM citation_hotspots
    WHERE citation_count > 0
      AND latitude IS NOT NULL 
      AND longitude IS NOT NULL
    ORDER BY citation_count ASC, total_fines ASC
    LIMIT ${limit};
  `;
  return rows;
}
