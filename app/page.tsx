import { promises as fs } from 'fs';
import path from 'path';
import SearchBar from '@/components/SearchBar';
import LeaderboardTable from '@/components/LeaderboardTable';
import NeighborhoodHeatMap from '@/components/NeighborhoodHeatMap';
import { LeaderboardEntry } from '@/types';

/**
 * Main page - Displays the leaderboard of worst parking offenders
 * 
 * This is a server component that loads the leaderboard data at build time
 * for optimal performance.
 */
async function getLeaderboardData(): Promise<LeaderboardEntry[]> {
  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'leaderboard.json');
    const fileContents = await fs.readFile(filePath, 'utf8');
    return JSON.parse(fileContents);
  } catch (error) {
    console.error('Error loading leaderboard data:', error);
    return [];
  }
}

export default async function Home() {
  const leaderboardData = await getLeaderboardData();

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4">
            SF&apos;s Most Wanted Parkers
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            The official leaderboard of San Francisco&apos;s worst parking offenders since 2020
          </p>
          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-500">
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full">
              {leaderboardData.length} plates tracked
            </span>
            <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full">
              $
              {leaderboardData
                .reduce((sum, entry) => sum + entry.total_fines, 0)
                .toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              {' '}in fines
            </span>
          </div>
        </div>

        {/* Search Bar */}
        <SearchBar />

        {/* Heat Map */}
        <div className="mb-12">
          <NeighborhoodHeatMap />
        </div>

        {/* Leaderboard */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-6">
            Top 100 Offenders
          </h2>
          <LeaderboardTable data={leaderboardData} />
        </div>

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm mt-12 pt-8 border-t border-gray-300">
          <p>
            Data sourced from SFMTA Parking Citations dataset. 
            Updated with citations from January 1, 2020 onwards.
          </p>
        </div>
      </div>
    </main>
  );
}

