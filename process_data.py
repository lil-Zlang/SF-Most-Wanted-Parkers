#!/usr/bin/env python3
"""
SF's Most Wanted Parkers - Data Processing Script

This script processes the SFMTA Parking Citations dataset to generate
optimized JSON files for the web application.

Usage:
    # Download from API with filtering (recommended):
    python process_data.py --api --start-date 2020-01-01 --limit 500000
    
    # Or process from CSV file:
    python process_data.py <input_csv_file>

Output:
    - public/data/leaderboard.json: Top 100 worst offenders
    - public/data/all_plates_details.json: Complete plate details
"""

import argparse
import json
import os
import sys
from collections import Counter, defaultdict
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# SF Neighborhood boundaries (approximate centers)
# These coordinates represent approximate central points for each neighborhood
NEIGHBORHOOD_COORDS = {
    # Downtown / Central Areas
    "Chinatown": (37.7941, -122.4078),
    "Financial District": (37.7946, -122.3999),
    "Nob Hill": (37.7924, -122.4156),
    "North Beach": (37.8005, -122.4098),
    "Russian Hill": (37.8008, -122.4194),
    "Telegraph Hill": (37.8025, -122.4058),
    "Tenderloin": (37.7844, -122.4134),
    "Union Square": (37.7880, -122.4075),
    
    # The Mission and Southeast
    "Bernal Heights": (37.7419, -122.4157),
    "The Castro": (37.7609, -122.4350),
    "Dogpatch": (37.7609, -122.3892),
    "Excelsior": (37.7247, -122.4267),
    "Glen Park": (37.7331, -122.4339),
    "Mission District": (37.7599, -122.4148),
    "Mission Bay": (37.7706, -122.3920),
    "Noe Valley": (37.7504, -122.4330),
    "Portola": (37.7279, -122.4061),
    "Potrero Hill": (37.7577, -122.3988),
    "SoMa": (37.7749, -122.4194),
    "Visitacion Valley": (37.7134, -122.4040),
    
    # West Side / Richmond and Sunset Districts
    "Haight-Ashbury": (37.7697, -122.4479),
    "Inner Richmond": (37.7802, -122.4668),
    "Inner Sunset": (37.7630, -122.4730),
    "Outer Richmond": (37.7758, -122.4965),
    "Outer Sunset": (37.7574, -122.4966),
    "Presidio": (37.7989, -122.4662),
    "Richmond District": (37.7794, -122.4823),
    "Sunset District": (37.7602, -122.4942),
    "Twin Peaks": (37.7544, -122.4477),
    "West Portal": (37.7407, -122.4655),
    
    # Northwest / Marina and Pacific Heights
    "Cow Hollow": (37.7989, -122.4344),
    "Marina District": (37.8043, -122.4410),
    "Pacific Heights": (37.7922, -122.4366),
    
    # Other Notable Neighborhoods
    "Alamo Square": (37.7766, -122.4341),
    "Embarcadero": (37.7955, -122.3937),
    "Fisherman's Wharf": (37.8080, -122.4177),
    "Hayes Valley": (37.7756, -122.4250),
    "Lower Haight": (37.7719, -122.4318),
    "Lower Pacific Heights": (37.7880, -122.4340),
    "Western Addition": (37.7827, -122.4331),
}

def get_nearest_neighborhood(lat: float, lon: float) -> str:
    """
    Find the nearest neighborhood to a given coordinate.
    
    Uses simple Euclidean distance for performance. For more accurate results,
    you could use the Haversine formula, but this is sufficient for our purposes.
    
    Args:
        lat: Latitude coordinate
        lon: Longitude coordinate
        
    Returns:
        Name of the nearest neighborhood
    """
    min_distance = float('inf')
    nearest = "Unknown"
    
    for neighborhood, (n_lat, n_lon) in NEIGHBORHOOD_COORDS.items():
        # Simple Euclidean distance (good enough for small areas)
        distance = ((lat - n_lat) ** 2 + (lon - n_lon) ** 2) ** 0.5
        if distance < min_distance:
            min_distance = distance
            nearest = neighborhood
    
    return nearest


class ParkingDataProcessor:
    """Processes parking citation data and generates JSON output files."""
    
    # Socrata API endpoint for SFMTA Parking Citations
    API_ENDPOINT = "https://data.sfgov.org/resource/ab4h-6ztd.json"
    API_LIMIT_PER_REQUEST = 50000  # Socrata's max per request

    def __init__(self, input_file: Optional[str] = None):
        """
        Initialize the processor.

        Args:
            input_file: Path to the input CSV file containing parking citations (optional)
        """
        self.input_file = input_file
        self.df = None
        self.plate_data = defaultdict(lambda: {
            "total_fines": 0.0,
            "citation_count": 0,
            "violations": [],
            "all_citations": []
        })
        self.location_data = defaultdict(lambda: {
            "total_fines": 0.0,
            "citation_count": 0,
            "violations": [],
            "coordinates": []
        })
        self.api_token = os.getenv('SOCRATA_APP_TOKEN', None)
    
    def download_from_api(
        self, 
        start_date: str = "2020-01-01",
        end_date: Optional[str] = None,
        limit: Optional[int] = None
    ) -> None:
        """
        Download data directly from SF Open Data API with filtering.
        
        This method uses the Socrata API to fetch data with server-side filtering,
        avoiding the need to download the entire 20M+ row dataset.
        
        Args:
            start_date: Start date for filtering (YYYY-MM-DD format)
            end_date: End date for filtering (YYYY-MM-DD format), None for today
            limit: Maximum number of records to download, None for all matching records
            
        Note:
            For better performance and higher rate limits, set the SOCRATA_APP_TOKEN
            environment variable. Get a free token at: https://dev.socrata.com/register
        """
        print(f"Downloading data from SF Open Data API...")
        print(f"  Filtering: citations from {start_date} onwards")
        if limit:
            print(f"  Limit: {limit:,} records maximum")
        
        # Build SoQL query for filtering
        where_clause = f"citation_issued_datetime >= '{start_date}T00:00:00.000'"
        if end_date:
            where_clause += f" AND citation_issued_datetime <= '{end_date}T23:59:59.999'"
        
        # Prepare headers
        headers = {}
        if self.api_token:
            headers['X-App-Token'] = self.api_token
            print("  Using API token for higher rate limits")
        else:
            print("  Warning: No API token found. Consider setting SOCRATA_APP_TOKEN")
            print("  Get a free token at: https://dev.socrata.com/register")
        
        # Download data in chunks
        all_data = []
        offset = 0
        total_fetched = 0
        
        while True:
            # Determine chunk size
            chunk_limit = self.API_LIMIT_PER_REQUEST
            if limit:
                remaining = limit - total_fetched
                if remaining <= 0:
                    break
                chunk_limit = min(chunk_limit, remaining)
            
            # Build request parameters
            params = {
                '$where': where_clause,
                '$limit': chunk_limit,
                '$offset': offset,
                '$order': 'citation_issued_datetime DESC'
            }
            
            try:
                # Make API request
                response = requests.get(
                    self.API_ENDPOINT,
                    params=params,
                    headers=headers,
                    timeout=60
                )
                response.raise_for_status()
                
                chunk_data = response.json()
                
                if not chunk_data:
                    # No more data
                    break
                
                all_data.extend(chunk_data)
                total_fetched += len(chunk_data)
                print(f"  Fetched {total_fetched:,} records...", end='\r')
                
                # Check if we got less than requested (end of data)
                if len(chunk_data) < chunk_limit:
                    break
                
                offset += chunk_limit
                
            except requests.exceptions.RequestException as e:
                print(f"\nError downloading data: {e}")
                if all_data:
                    print(f"Partial data downloaded: {len(all_data):,} records")
                    break
                else:
                    sys.exit(1)
        
        print(f"\n✓ Downloaded {len(all_data):,} records from API")
        
        # Convert to DataFrame
        self.df = pd.DataFrame(all_data)
        
        # Standardize column names from API format
        column_mapping = {
            'citation_issued_datetime': 'citation_issued_datetime',
            'issued_datetime': 'citation_issued_datetime',
            'rp_plate_state': 'plate_state',
            'vehicle_plate_state': 'plate_state',
            'plate': 'vehicle_plate',
            'plate_number': 'vehicle_plate',
            'fine_amount': 'fine_amount',
            'violation_description': 'violation_description',
            'violation_desc': 'violation_description',
            'violation': 'violation_description',
            'latitude': 'latitude',
            'longitude': 'longitude',
            'lat': 'latitude',
            'lon': 'longitude'
        }
        
        # Only rename columns that exist
        existing_mappings = {k: v for k, v in column_mapping.items() if k in self.df.columns}
        self.df = self.df.rename(columns=existing_mappings)
        
        # Convert citation_issued_datetime to datetime if it's a string
        if 'citation_issued_datetime' in self.df.columns:
            self.df['citation_issued_datetime'] = pd.to_datetime(
                self.df['citation_issued_datetime'],
                errors='coerce'
            )

    def load_data(self) -> None:
        """Load the CSV data into a pandas DataFrame."""
        print(f"Loading data from {self.input_file}...")
        try:
            self.df = pd.read_csv(self.input_file, low_memory=False)
            print(f"Loaded {len(self.df)} rows")
        except FileNotFoundError:
            print(f"Error: File '{self.input_file}' not found.")
            sys.exit(1)
        except Exception as e:
            print(f"Error loading data: {e}")
            sys.exit(1)

    def filter_by_date(self, cutoff_date: str = "2020-01-01") -> None:
        """
        Filter data to only include citations on or after the cutoff date.

        Args:
            cutoff_date: ISO format date string (YYYY-MM-DD)
        """
        print(f"Filtering data from {cutoff_date} onwards...")
        initial_count = len(self.df)

        # Convert to datetime, handling various formats and errors
        self.df['citation_issued_datetime'] = pd.to_datetime(
            self.df['citation_issued_datetime'],
            errors='coerce'
        )

        # Filter by date
        cutoff = pd.to_datetime(cutoff_date)
        self.df = self.df[self.df['citation_issued_datetime'] >= cutoff]

        # Drop rows with null datetime
        self.df = self.df.dropna(subset=['citation_issued_datetime'])

        print(f"Filtered from {initial_count} to {len(self.df)} rows")

    def process_plates(self) -> None:
        """Group and aggregate data by license plate."""
        print("Processing plates and aggregating data...")

        # Ensure required columns exist
        required_cols = ['vehicle_plate', 'fine_amount', 'violation_description']
        optional_cols = ['latitude', 'longitude']

        # Check for column variations
        column_mapping = {}
        for col in self.df.columns:
            col_lower = col.lower().replace('_', '').replace(' ', '')
            if 'plate' in col_lower and 'vehicle' in col_lower:
                column_mapping['vehicle_plate'] = col
            elif 'fine' in col_lower and 'amount' in col_lower:
                column_mapping['fine_amount'] = col
            elif 'violation' in col_lower and ('desc' in col_lower or 'description' in col_lower):
                column_mapping['violation_description'] = col
            elif col_lower == 'latitude' or col_lower == 'lat':
                column_mapping['latitude'] = col
            elif col_lower == 'longitude' or col_lower == 'lon' or col_lower == 'lng':
                column_mapping['longitude'] = col

        # Rename columns to standardized names
        if column_mapping:
            self.df = self.df.rename(columns=column_mapping)

        # Verify we have minimum required columns
        missing_cols = [col for col in required_cols if col not in self.df.columns]
        if missing_cols:
            print(f"Warning: Missing columns {missing_cols}. Attempting to continue...")

        # Process each row
        for _, row in self.df.iterrows():
            try:
                plate = str(row.get('vehicle_plate', '')).strip().upper()
                if not plate or plate == 'NAN':
                    continue

                # Parse fine amount
                fine_amount = 0.0
                try:
                    fine_amount = float(row.get('fine_amount', 0))
                except (ValueError, TypeError):
                    fine_amount = 0.0

                # Get violation description
                violation = str(row.get('violation_description', 'Unknown')).strip()
                if violation.upper() == 'NAN':
                    violation = 'Unknown'

                # Get location data
                lat = row.get('latitude', None)
                lon = row.get('longitude', None)

                # Convert lat/lon to float if possible
                try:
                    lat = float(lat) if pd.notna(lat) else None
                    lon = float(lon) if pd.notna(lon) else None
                except (ValueError, TypeError):
                    lat = None
                    lon = None

                # Get citation datetime
                citation_date = row.get('citation_issued_datetime')
                if pd.notna(citation_date):
                    # Handle both datetime objects and strings
                    if hasattr(citation_date, 'isoformat'):
                        citation_date_str = citation_date.isoformat()
                    else:
                        citation_date_str = str(citation_date)
                else:
                    citation_date_str = None

                # Aggregate data
                self.plate_data[plate]['total_fines'] += fine_amount
                self.plate_data[plate]['citation_count'] += 1
                self.plate_data[plate]['violations'].append(violation)

                # Add citation details
                citation_detail = {
                    'date': citation_date_str,
                    'violation': violation
                }

                # Only add lat/lon if both are valid
                if lat is not None and lon is not None:
                    citation_detail['latitude'] = lat
                    citation_detail['longitude'] = lon
                    
                    # Aggregate by neighborhood for heat map
                    neighborhood = get_nearest_neighborhood(lat, lon)
                    self.location_data[neighborhood]['total_fines'] += fine_amount
                    self.location_data[neighborhood]['citation_count'] += 1
                    self.location_data[neighborhood]['violations'].append(violation)
                    self.location_data[neighborhood]['coordinates'].append({
                        'lat': lat,
                        'lon': lon,
                        'fine': fine_amount,
                        'violation': violation
                    })

                self.plate_data[plate]['all_citations'].append(citation_detail)

            except Exception as e:
                print(f"Warning: Error processing row: {e}")
                continue

        print(f"Processed {len(self.plate_data)} unique plates")

    def calculate_favorite_violations(self) -> None:
        """Calculate the most frequent violation for each plate."""
        print("Calculating favorite violations...")
        for plate, data in self.plate_data.items():
            if data['violations']:
                # Find most common violation
                violation_counter = Counter(data['violations'])
                favorite = violation_counter.most_common(1)[0][0]
                data['favorite_violation'] = favorite
            else:
                data['favorite_violation'] = 'Unknown'

            # Remove the violations list as it's no longer needed
            del data['violations']

    def generate_output_files(self) -> None:
        """Generate the leaderboard and all_plates_details JSON files."""
        print("Generating output files...")

        # Create output directory if it doesn't exist
        output_dir = os.path.join('public', 'data')
        os.makedirs(output_dir, exist_ok=True)

        # Generate leaderboard (top 100)
        sorted_plates = sorted(
            self.plate_data.items(),
            key=lambda x: x[1]['total_fines'],
            reverse=True
        )[:100]

        leaderboard = []
        for rank, (plate, data) in enumerate(sorted_plates, 1):
            leaderboard.append({
                'rank': rank,
                'plate': plate,
                'total_fines': round(data['total_fines'], 2),
                'citation_count': data['citation_count']
            })

        # Write leaderboard.json
        leaderboard_path = os.path.join(output_dir, 'leaderboard.json')
        with open(leaderboard_path, 'w') as f:
            json.dump(leaderboard, f, indent=2)
        print(f"Created {leaderboard_path} with {len(leaderboard)} entries")

        # Generate all_plates_details
        all_plates_details = {}
        for plate, data in self.plate_data.items():
            all_plates_details[plate] = {
                'total_fines': round(data['total_fines'], 2),
                'citation_count': data['citation_count'],
                'favorite_violation': data['favorite_violation'],
                'all_citations': data['all_citations']
            }

        # Write all_plates_details.json
        details_path = os.path.join(output_dir, 'all_plates_details.json')
        with open(details_path, 'w') as f:
            json.dump(all_plates_details, f, indent=2)
        print(f"Created {details_path} with {len(all_plates_details)} plates")
        
        # Generate location heat map data
        self._generate_location_heatmap()
    
    def _generate_location_heatmap(self) -> None:
        """Generate heat map data for neighborhoods and coordinates."""
        print("Generating location heat map data...")
        
        output_dir = os.path.join('public', 'data')
        
        # Aggregate by neighborhood
        neighborhood_data = []
        for neighborhood, data in self.location_data.items():
            if data['citation_count'] > 0:
                # Get neighborhood center coordinates
                center = NEIGHBORHOOD_COORDS.get(neighborhood, (37.7749, -122.4194))
                
                # Calculate most common violation
                violation_counter = Counter(data['violations'])
                top_violation = violation_counter.most_common(1)[0][0] if violation_counter else "Unknown"
                
                neighborhood_data.append({
                    'neighborhood': neighborhood,
                    'latitude': center[0],
                    'longitude': center[1],
                    'total_fines': round(data['total_fines'], 2),
                    'citation_count': data['citation_count'],
                    'top_violation': top_violation,
                    'intensity': data['citation_count']  # For heat map visualization
                })
        
        # Sort by citation count
        neighborhood_data.sort(key=lambda x: x['citation_count'], reverse=True)
        
        # Write neighborhood_heatmap.json
        heatmap_path = os.path.join(output_dir, 'neighborhood_heatmap.json')
        with open(heatmap_path, 'w') as f:
            json.dump(neighborhood_data, f, indent=2)
        print(f"Created {heatmap_path} with {len(neighborhood_data)} neighborhoods")
        
        # Generate detailed coordinate data for street-level view
        # Sample coordinates to keep file size reasonable (max 10,000 points)
        all_coords = []
        for neighborhood, data in self.location_data.items():
            all_coords.extend(data['coordinates'])
        
        # Sample if too many points
        if len(all_coords) > 10000:
            import random
            all_coords = random.sample(all_coords, 10000)
            print(f"Sampled 10,000 coordinates from {len(all_coords)} total")
        
        # Write coordinate_heatmap.json
        coords_path = os.path.join(output_dir, 'coordinate_heatmap.json')
        with open(coords_path, 'w') as f:
            json.dump(all_coords, f, indent=2)
        print(f"Created {coords_path} with {len(all_coords)} coordinate points")

    def process(
        self, 
        use_api: bool = False,
        start_date: str = "2020-01-01",
        end_date: Optional[str] = None,
        limit: Optional[int] = None
    ) -> None:
        """
        Execute the complete data processing pipeline.
        
        Args:
            use_api: If True, download from API instead of loading CSV
            start_date: Start date for filtering (applies to both API and CSV)
            end_date: End date for filtering (API only)
            limit: Maximum records to download (API only)
        """
        if use_api:
            self.download_from_api(start_date, end_date, limit)
        else:
            self.load_data()
            self.filter_by_date(start_date)
        
        self.process_plates()
        self.calculate_favorite_violations()
        self.generate_output_files()
        print("✓ Data processing complete!")


def main():
    """Main entry point for the script."""
    parser = argparse.ArgumentParser(
        description='Process SFMTA Parking Citations data',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Download from API with default filters (2020 onwards, max 500k records):
  python process_data.py --api
  
  # Download from API with custom date range and limit:
  python process_data.py --api --start-date 2022-01-01 --limit 1000000
  
  # Download specific date range:
  python process_data.py --api --start-date 2023-01-01 --end-date 2023-12-31
  
  # Process from CSV file:
  python process_data.py parking_citations.csv
  
  # Process from CSV with custom start date:
  python process_data.py parking_citations.csv --start-date 2021-01-01

API Setup (optional but recommended):
  1. Register for a free API token at: https://dev.socrata.com/register
  2. Create a .env file in the project root with:
     SOCRATA_APP_TOKEN=your_token_here
  3. This gives you higher rate limits and faster downloads
        """
    )
    
    parser.add_argument(
        'input_file',
        nargs='?',
        help='Path to input CSV file (not needed if using --api)'
    )
    parser.add_argument(
        '--api',
        action='store_true',
        help='Download data directly from SF Open Data API (recommended)'
    )
    parser.add_argument(
        '--start-date',
        default='2020-01-01',
        help='Start date for filtering (YYYY-MM-DD). Default: 2020-01-01'
    )
    parser.add_argument(
        '--end-date',
        default=None,
        help='End date for filtering (YYYY-MM-DD). Default: today'
    )
    parser.add_argument(
        '--limit',
        type=int,
        default=500000,
        help='Maximum number of records to download (API mode only). Default: 500000. Use 0 for no limit.'
    )
    
    args = parser.parse_args()
    
    # Validate arguments
    if not args.api and not args.input_file:
        parser.error("Either provide an input CSV file or use --api to download from API")
    
    if args.api and args.input_file:
        print("Warning: Both --api and input file provided. Using API mode.")
    
    # Process limit argument
    limit = None if args.limit == 0 else args.limit
    
    # Initialize processor
    processor = ParkingDataProcessor(args.input_file)
    
    # Run processing
    processor.process(
        use_api=args.api,
        start_date=args.start_date,
        end_date=args.end_date,
        limit=limit
    )


if __name__ == "__main__":
    main()

