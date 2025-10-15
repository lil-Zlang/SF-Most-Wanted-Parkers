import { render, screen, fireEvent } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import SearchBar from '@/components/SearchBar';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

describe('SearchBar', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
    mockPush.mockClear();
  });

  it('renders search input and button', () => {
    render(<SearchBar />);
    
    const input = screen.getByPlaceholderText(/enter license plate/i);
    const button = screen.getByRole('button', { name: /search/i });
    
    expect(input).toBeInTheDocument();
    expect(button).toBeInTheDocument();
  });

  it('navigates to plate page when valid plate is entered', () => {
    render(<SearchBar />);
    
    const input = screen.getByPlaceholderText(/enter license plate/i);
    const button = screen.getByRole('button', { name: /search/i });
    
    fireEvent.change(input, { target: { value: '7ABC123' } });
    fireEvent.click(button);
    
    expect(mockPush).toHaveBeenCalledWith('/plate/7ABC123');
  });

  it('converts plate to uppercase', () => {
    render(<SearchBar />);
    
    const input = screen.getByPlaceholderText(/enter license plate/i);
    const button = screen.getByRole('button', { name: /search/i });
    
    fireEvent.change(input, { target: { value: 'abc123' } });
    fireEvent.click(button);
    
    expect(mockPush).toHaveBeenCalledWith('/plate/ABC123');
  });

  it('shows alert when empty plate is submitted', () => {
    window.alert = jest.fn();
    render(<SearchBar />);
    
    const button = screen.getByRole('button', { name: /search/i });
    fireEvent.click(button);
    
    expect(window.alert).toHaveBeenCalledWith('Please enter a license plate number');
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('trims whitespace from plate number', () => {
    render(<SearchBar />);
    
    const input = screen.getByPlaceholderText(/enter license plate/i);
    const button = screen.getByRole('button', { name: /search/i });
    
    fireEvent.change(input, { target: { value: '  ABC123  ' } });
    fireEvent.click(button);
    
    expect(mockPush).toHaveBeenCalledWith('/plate/ABC123');
  });
});

