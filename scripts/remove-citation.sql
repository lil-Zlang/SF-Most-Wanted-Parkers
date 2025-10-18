-- Remove citation #1006431882 from the database

-- First, find and update the plate_details table
-- Remove the citation from the JSONB array and update totals
UPDATE plate_details
SET
  citations = (
    SELECT jsonb_agg(elem)
    FROM jsonb_array_elements(citations) elem
    WHERE elem->>'citation_number' != '1006431882'
  ),
  citation_count = citation_count - 1,
  total_fines = total_fines - 380.00
WHERE EXISTS (
  SELECT 1
  FROM jsonb_array_elements(citations) elem
  WHERE elem->>'citation_number' = '1006431882'
);

-- Update the leaderboard table to reflect the new totals
UPDATE leaderboard l
SET
  total_fines = pd.total_fines,
  citation_count = pd.citation_count
FROM plate_details pd
WHERE l.plate = pd.plate
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(pd.citations) elem
    WHERE elem->>'citation_number' != '1006431882'
  );

-- Display affected plate for verification
SELECT plate, citation_count, total_fines
FROM plate_details
WHERE plate IN (
  SELECT plate
  FROM plate_details,
  jsonb_array_elements(citations) elem
  WHERE elem->>'location' = '652 PACIFIC'
  LIMIT 1
);
