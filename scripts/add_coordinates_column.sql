-- Add latitude and longitude columns to citation_hotspots
ALTER TABLE citation_hotspots
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_hotspots_coords ON citation_hotspots(latitude, longitude);
