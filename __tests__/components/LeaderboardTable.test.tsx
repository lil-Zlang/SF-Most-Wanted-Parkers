import { render, screen } from '@testing-library/react';
import LeaderboardTable from '@/components/LeaderboardTable';
import { LeaderboardEntry } from '@/types';

describe('LeaderboardTable', () => {
  const mockData: LeaderboardEntry[] = [
    {
      rank: 1,
      plate: 'ABC123',
      total_fines: 1000.50,
      citation_count: 10,
    },
    {
      rank: 2,
      plate: 'XYZ789',
      total_fines: 500.25,
      citation_count: 5,
    },
  ];

  it('renders table with correct headers', () => {
    render(<LeaderboardTable data={mockData} />);
    
    expect(screen.getByText('Rank')).toBeInTheDocument();
    expect(screen.getByText('License Plate')).toBeInTheDocument();
    expect(screen.getByText('Total Fines')).toBeInTheDocument();
    expect(screen.getByText('Citations')).toBeInTheDocument();
  });

  it('renders all leaderboard entries', () => {
    render(<LeaderboardTable data={mockData} />);
    
    expect(screen.getByText('ABC123')).toBeInTheDocument();
    expect(screen.getByText('XYZ789')).toBeInTheDocument();
    expect(screen.getByText('$1,000.50')).toBeInTheDocument();
    expect(screen.getByText('$500.25')).toBeInTheDocument();
  });

  it('displays medals for top 3', () => {
    render(<LeaderboardTable data={mockData} />);
    
    expect(screen.getByText(/🥇/)).toBeInTheDocument();
    expect(screen.getByText(/🥈/)).toBeInTheDocument();
  });

  it('shows message when no data is available', () => {
    render(<LeaderboardTable data={[]} />);
    
    expect(screen.getByText(/no data available/i)).toBeInTheDocument();
  });

  it('creates links to plate detail pages', () => {
    render(<LeaderboardTable data={mockData} />);
    
    const link = screen.getByRole('link', { name: /ABC123/ });
    expect(link).toHaveAttribute('href', '/plate/ABC123');
  });

  it('formats numbers with commas', () => {
    const largeData: LeaderboardEntry[] = [
      {
        rank: 1,
        plate: 'TEST',
        total_fines: 10000.00,
        citation_count: 1000,
      },
    ];
    
    render(<LeaderboardTable data={largeData} />);
    
    expect(screen.getByText('$10,000.00')).toBeInTheDocument();
    expect(screen.getByText('1,000')).toBeInTheDocument();
  });
});

