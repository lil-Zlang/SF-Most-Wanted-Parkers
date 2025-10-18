import { promises as fs } from 'fs';
import path from 'path';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { PlateDetails } from '@/types';
import { fetchPlateDetails } from '@/lib/db';

// Dynamically import the map component with no SSR
const TicketMap = dynamic(() => import('@/components/TicketMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[500px] bg-gray-200 rounded-lg flex items-center justify-center">
      <p className="text-gray-600">Loading map...</p>
    </div>
  ),
});

interface PageProps {
  params: {
    plateNumber: string;
  };
}

/**
 * Load plate details from individual plate file (optimized)
 * 
 * Instead of loading a massive 10M+ line JSON file, we now load
 * individual plate files for better performance and memory efficiency.
 */
async function getPlateDetails(plateNumber: string): Promise<PlateDetails | null> {
  // Try database first (already filters to 2025+ in the query)
  try {
    const dbResult = await fetchPlateDetails(plateNumber);
    if (dbResult) {
      // Database query already filters to 2025-01-01 onwards
      const plateDetails = dbResult as PlateDetails;
      
      // Additional safety filter in case database doesn't have citations array
      const citations2025 = (plateDetails.all_citations || []).filter(citation => {
        if (!citation.date) return false;
        const citationDate = new Date(citation.date);
        return citationDate >= new Date('2025-01-01T00:00:00');
      });
      
      // Return filtered data
      return {
        ...plateDetails,
        all_citations: citations2025,
        citation_count: citations2025.length,
        total_fines: citations2025.reduce((sum, c) => sum + (c.fine_amount || 0), 0)
      };
    }
  } catch (err) {
    console.error('DB error, falling back to file', err);
  }

  // Fallback to file storage (legacy) - also filter to 2025-01-01 onwards
  try {
    const plateFile = path.join(process.cwd(), 'public', 'data', 'plates', `${plateNumber}.json`);
    await fs.access(plateFile);
    const fileContents = await fs.readFile(plateFile, 'utf8');
    const plateDetails = JSON.parse(fileContents);
    
    // Filter to citations from 2025-01-01 onwards
    const citations2025 = plateDetails.all_citations.filter((citation: any) => {
      if (!citation.date) return false;
      const citationDate = new Date(citation.date);
      return citationDate >= new Date('2025-01-01T00:00:00');
    });
    
    return {
      ...plateDetails,
      all_citations: citations2025,
      citation_count: citations2025.length,
      total_fines: citations2025.reduce((sum: number, c: any) => sum + (c.fine_amount || 0), 0)
    };
  } catch {
    return null;
  }
}

/**
 * Plate Details Page - Shows the "rap sheet" for a specific license plate
 * 
 * Displays all parking violations, statistics, and a map of ticket locations.
 */
export default async function PlatePage({ params }: PageProps) {
  const plateNumber = decodeURIComponent(params.plateNumber).toUpperCase();
  const plateDetails = await getPlateDetails(plateNumber);

  // Handle plate not found
  if (!plateDetails) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
        <div className="container mx-auto px-4 py-12 max-w-6xl">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Plate Not Found
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              No parking violations found for plate <span className="font-mono font-bold">{plateNumber}</span>
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              ← Back to Leaderboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mb-4 inline-block"
          >
            ← Back to Leaderboard
          </Link>
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-2">
            <span className="font-mono">{plateNumber}</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">2025 Parking Violations</p>
        </div>

        {/* Key Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border-l-4 border-red-500">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase mb-2">
              Total Fines Owed
            </h3>
            <p className="text-4xl font-bold text-red-600 dark:text-red-400">
              ${plateDetails.total_fines.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border-l-4 border-orange-500">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase mb-2">
              Total Citations
            </h3>
            <p className="text-4xl font-bold text-orange-600 dark:text-orange-400">
              {plateDetails.citation_count.toLocaleString()}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border-l-4 border-blue-500">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase mb-2">
              Favorite Violation
            </h3>
            <p className="text-lg font-semibold text-blue-600 dark:text-blue-400 leading-tight">
              {plateDetails.favorite_violation}
            </p>
          </div>
        </div>

        {/* Map Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
            Ticket Locations (2025)
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Map showing all {plateDetails.all_citations.length} parking violations for this plate in 2025
          </p>
          <TicketMap citations={plateDetails.all_citations} />
        </div>

        {/* Recent Citations */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
            All Citations (2025)
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Date
                  </th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Violation
                  </th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Location
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                {plateDetails.all_citations
                  .sort((a, b) => {
                    if (!a.date) return 1;
                    if (!b.date) return -1;
                    return new Date(b.date).getTime() - new Date(a.date).getTime();
                  })
                  .map((citation, index) => (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                        {citation.date
                          ? new Date(citation.date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                        {citation.violation}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                        {citation.latitude && citation.longitude
                          ? `${citation.latitude.toFixed(4)}, ${citation.longitude.toFixed(4)}`
                          : 'No location data'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}

