'use client';

import Link from 'next/link';
import { LeaderboardEntry } from '@/types';

interface LeaderboardTableProps {
  data: LeaderboardEntry[];
}

/**
 * LeaderboardTable component displays the top parking offenders
 * 
 * Shows rank, plate number, total fines, and citation count for
 * the worst parking offenders in San Francisco.
 */
export default function LeaderboardTable({ data }: LeaderboardTableProps) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400">No data available. Please run the data processing script first.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto shadow-lg rounded-lg">
      <table className="min-w-full bg-white dark:bg-gray-800">
        <thead className="bg-gray-800 dark:bg-gray-900 text-white">
          <tr>
            <th className="py-3 px-6 text-left">Rank</th>
            <th className="py-3 px-6 text-left">License Plate</th>
            <th className="py-3 px-6 text-right">Total Fines</th>
            <th className="py-3 px-6 text-right">Citations</th>
          </tr>
        </thead>
        <tbody className="text-gray-700 dark:text-gray-300">
          {data.map((entry, index) => (
            <tr
              key={entry.plate}
              className={`border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                index < 3 ? 'bg-red-50 dark:bg-red-900/20' : ''
              }`}
            >
              <td className="py-4 px-6 text-left">
                <span className="font-bold text-lg">
                  {entry.rank === 1 && '🥇 '}
                  {entry.rank === 2 && '🥈 '}
                  {entry.rank === 3 && '🥉 '}
                  #{entry.rank}
                </span>
              </td>
              <td className="py-4 px-6 text-left">
                <Link
                  href={`/plate/${encodeURIComponent(entry.plate)}`}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-mono font-bold text-lg hover:underline"
                >
                  {entry.plate}
                </Link>
              </td>
              <td className="py-4 px-6 text-right font-semibold text-red-600 dark:text-red-400">
                ${entry.total_fines.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
              <td className="py-4 px-6 text-right">
                <span className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-3 py-1 rounded-full text-sm font-medium">
                  {entry.citation_count.toLocaleString()}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

