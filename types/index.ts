/**
 * Type definitions for SF's Most Wanted Parkers application
 */

export interface LeaderboardEntry {
  rank: number;
  plate: string;
  total_fines: number;
  citation_count: number;
}

export interface Citation {
  date: string | null;
  violation: string;
  latitude?: number;
  longitude?: number;
}

export interface PlateDetails {
  total_fines: number;
  citation_count: number;
  favorite_violation: string;
  all_citations: Citation[];
}

export interface AllPlatesDetails {
  [plate: string]: PlateDetails;
}

