import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

/**
 * API route to fetch filtered individual citations from database
 * GET /api/citations?fineRanges[]=500+&months[]=09&limit=20
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fineRanges = searchParams.getAll('fineRanges[]');
    const months = searchParams.getAll('months[]');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Build fine amount conditions
    let fineConditions: string[] = [];
    if (fineRanges.includes('500+')) {
      fineConditions.push(">= 500");
    }
    if (fineRanges.includes('300-499')) {
      fineConditions.push("300-499");
    }
    if (fineRanges.includes('200-299')) {
      fineConditions.push("200-299");
    }
    if (fineRanges.includes('100-199')) {
      fineConditions.push("100-199");
    }
    if (fineRanges.includes('under100')) {
      fineConditions.push("< 100");
    }

    // Build month conditions
    let monthConditions: string[] = [];
    const monthMap: { [key: string]: string } = {
      '01': '2025-01', '02': '2025-02', '03': '2025-03', '04': '2025-04',
      '05': '2025-05', '06': '2025-06', '07': '2025-07', '08': '2025-08',
      '09': '2025-09', '10': '2025-10', '11': '2025-11', '12': '2025-12'
    };
    
    months.forEach(month => {
      if (monthMap[month]) {
        monthConditions.push(monthMap[month]);
      }
    });

    // Get all citations from 2025 onwards, then filter in JavaScript for simplicity
    const { rows } = await sql`
      SELECT 
        jsonb_array_elements(citations) as citation
      FROM plate_details
      WHERE citations IS NOT NULL
        AND EXISTS (
          SELECT 1 
          FROM jsonb_array_elements(citations) AS cit
          WHERE (cit->>'date')::timestamp >= '2025-01-01'::timestamp
        )
    `;
    
    // Extract citation data and filter out invalid locations + enforce 2025+ dates
    let allCitations = rows
      .map(row => row.citation)
      .filter(citation => {
        if (!citation || !citation.location || citation.location.trim() === '' || 
            citation.location === 'None' || citation.location === 'NULL') {
          return false;
        }
        // Enforce date filter: only citations from 2025-01-01 onwards
        if (!citation.date) return false;
        const citationDate = new Date(citation.date);
        return citationDate >= new Date('2025-01-01T00:00:00');
      })
      .map(citation => ({
        location: citation.location.trim(),
        violation: citation.violation || 'Unknown',
        fine_amount: parseFloat(citation.fine_amount) || 0,
        citation_number: citation.citation_number || '',
        date: citation.date || '',
        latitude: citation.latitude || null,
        longitude: citation.longitude || null
      }));

    // Apply fine amount filters (only if any are selected)
    if (fineRanges.length > 0 && fineConditions.length > 0) {
      allCitations = allCitations.filter(citation => {
        const fineAmount = citation.fine_amount;
        return fineConditions.some(condition => {
          if (condition === ">= 500") return fineAmount >= 500;
          if (condition === "300-499") return fineAmount >= 300 && fineAmount < 500;
          if (condition === "200-299") return fineAmount >= 200 && fineAmount < 300;
          if (condition === "100-199") return fineAmount >= 100 && fineAmount < 200;
          if (condition === "< 100") return fineAmount < 100;
          return false;
        });
      });
    }

    // Apply month filters (only if any are selected)
    if (months.length > 0 && monthConditions.length > 0) {
      allCitations = allCitations.filter(citation => {
        const date = citation.date;
        if (!date) return false;
        return monthConditions.some(condition => {
          return date.startsWith(condition);
        });
      });
    }

    // Apply limit
    allCitations = allCitations.slice(0, limit);
    
    return NextResponse.json({
      citations: allCitations,
      total: allCitations.length,
      filters: {
        fineRanges: fineRanges,
        months: months,
        limit: limit
      }
    });
  } catch (error) {
    console.error('Error fetching citations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch citations' },
      { status: 500 }
    );
  }
}
