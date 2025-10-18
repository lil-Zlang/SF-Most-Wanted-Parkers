import { sql } from '@vercel/postgres';

async function checkDateRange() {
  try {
    const result = await sql`
      SELECT
        MIN((citation->>'issue_date')::date) AS earliest_citation,
        MAX((citation->>'issue_date')::date) AS latest_citation,
        COUNT(DISTINCT (citation->>'issue_date')::date) as unique_dates
      FROM plate_details, jsonb_array_elements(citations) AS citation
      WHERE citation->>'issue_date' IS NOT NULL;
    `;

    console.log('Date Range Analysis:');
    console.log('-------------------');
    console.log('Earliest citation:', result.rows[0].earliest_citation);
    console.log('Latest citation:', result.rows[0].latest_citation);
    console.log('Unique dates:', result.rows[0].unique_dates);

    const earliest = new Date(result.rows[0].earliest_citation);
    const latest = new Date(result.rows[0].latest_citation);
    const monthsDiff = (latest.getFullYear() - earliest.getFullYear()) * 12 +
                       (latest.getMonth() - earliest.getMonth());

    console.log('Approximate months span:', monthsDiff);
  } catch (error) {
    console.error('Error:', error);
  }
}

checkDateRange();
