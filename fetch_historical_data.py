#!/usr/bin/env python3
"""
Fetch Historical SF Parking Citation Data from Open Data Portal

This script fetches parking citation data month by month from 2020 to 2025
and stores it in the PostgreSQL database. It processes data in batches to
avoid memory issues and API rate limits.

Usage:
    python fetch_historical_data.py [--start-year 2020] [--end-year 2025] [--batch-size 10000]
"""

import json
import os
import sys
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import argparse

import pandas as pd
import requests
import psycopg2
from psycopg2.extras import Json
from dotenv import load_dotenv

# Load environment variables
load_dotenv('.env.local')

# Database connection
DATABASE_URL = os.getenv('DATABASE_URL') or os.getenv('POSTGRES_URL')

# Socrata API configuration
BASE_URL = "https://data.sfgov.org/resource/ab4h-6ztd.json"
SOCRATA_APP_TOKEN = os.getenv('SOCRATA_APP_TOKEN')

# Field mappings
REQUIRED_FIELDS = [
    'citation_number',
    'citation_issued_datetime',
    'violation',
    'violation_desc',
    'citation_location',
    'vehicle_plate_state',
    'vehicle_plate',
    'fine_amount',
    'date_added',
    'the_geom',
    'supervisor_districts',
    'analysis_neighborhood',
    'latitude',
    'longitude'
]


class HistoricalDataFetcher:
    def __init__(self, start_year=2020, end_year=2025, batch_size=10000):
        self.start_year = start_year
        self.end_year = end_year
        self.batch_size = batch_size
        self.total_citations = 0
        self.processed_months = 0
        
    def fetch_month_data(self, year: int, month: int) -> List[Dict]:
        """Fetch data for a specific month"""
        # Create date range for the month
        start_date = datetime(year, month, 1)
        if month == 12:
            end_date = datetime(year + 1, 1, 1)
        else:
            end_date = datetime(year, month + 1, 1)
        
        start_str = start_date.strftime('%Y-%m-%dT00:00:00.000')
        end_str = end_date.strftime('%Y-%m-%dT00:00:00.000')
        
        params = {
            '$limit': 50000,  # Max per request
            '$offset': 0,
            '$order': 'citation_issued_datetime DESC',
            '$where': f"citation_issued_datetime >= '{start_str}' AND citation_issued_datetime < '{end_str}'",
            '$select': ','.join(REQUIRED_FIELDS)
        }
        
        headers = {}
        if SOCRATA_APP_TOKEN:
            headers['X-App-Token'] = SOCRATA_APP_TOKEN
        
        print(f"  📡 Fetching {year}-{month:02d} data...")
        print(f"     Date range: {start_str} to {end_str}")
        
        all_data = []
        offset = 0
        
        while True:
            params['$offset'] = offset
            
            try:
                response = requests.get(BASE_URL, params=params, headers=headers, timeout=120)
                response.raise_for_status()
                data = response.json()
                
                if not data:
                    break
                    
                all_data.extend(data)
                offset += len(data)
                
                print(f"     Fetched {len(data):,} records (total: {len(all_data):,})")
                
                # If we got fewer records than requested, we've reached the end
                if len(data) < params['$limit']:
                    break
                    
                # Rate limiting
                time.sleep(0.5)
                
            except requests.exceptions.RequestException as e:
                print(f"     ❌ Error fetching data: {e}")
                break
        
        print(f"  ✅ Total records for {year}-{month:02d}: {len(all_data):,}")
        return all_data
    
    def clean_and_process_data(self, raw_data: List[Dict]) -> pd.DataFrame:
        """Clean and process raw citation data"""
        if not raw_data:
            return pd.DataFrame()
        
        df = pd.DataFrame(raw_data)
        
        # Convert date column
        df['citation_issued_datetime'] = pd.to_datetime(df['citation_issued_datetime'], errors='coerce')
        
        # Convert fine_amount to numeric
        df['fine_amount'] = pd.to_numeric(df['fine_amount'], errors='coerce').fillna(0.0)
        
        # Extract coordinates from the_geom
        def extract_coords(geom):
            if pd.isna(geom) or not isinstance(geom, dict):
                return None, None
            try:
                coords = geom.get('coordinates', [])
                if len(coords) == 2:
                    return coords[1], coords[0]  # lat, lon
            except:
                pass
            return None, None
        
        coords = df['the_geom'].apply(extract_coords)
        df['latitude'] = coords.apply(lambda x: x[0])
        df['longitude'] = coords.apply(lambda x: x[1])
        
        # Clean plate numbers
        df['vehicle_plate'] = df['vehicle_plate'].astype(str).str.strip().str.upper()
        df = df[df['vehicle_plate'].str.len() > 0]
        df = df[~df['vehicle_plate'].isin(['NAN', 'NONE', 'NULL', ''])]
        
        # Drop rows with missing critical data
        df = df.dropna(subset=['vehicle_plate', 'citation_issued_datetime'])
        
        # Remove duplicates
        if 'citation_number' in df.columns:
            df = df.drop_duplicates(subset=['citation_number'], keep='first')
        
        return df
    
    def aggregate_by_plate(self, df: pd.DataFrame) -> Dict[str, Dict]:
        """Aggregate citations by plate"""
        plate_data = {}
        grouped = df.groupby('vehicle_plate')
        
        for plate, group in grouped:
            if not plate or plate == '' or pd.isna(plate):
                continue
            
            total_fines = float(group['fine_amount'].sum())
            citation_count = len(group)
            
            # Get plate state
            plate_state = 'CA'
            if 'vehicle_plate_state' in group.columns:
                state_counts = group['vehicle_plate_state'].value_counts()
                if len(state_counts) > 0:
                    plate_state = state_counts.index[0]
            
            # Store all citations
            all_citations = []
            for _, row in group.iterrows():
                citation = {
                    'citation_number': str(row.get('citation_number', '')),
                    'date': row['citation_issued_datetime'].isoformat() if pd.notna(row['citation_issued_datetime']) else None,
                    'violation': str(row.get('violation_desc', row.get('violation', 'Unknown'))),
                    'location': str(row.get('citation_location', '')),
                    'fine_amount': float(row.get('fine_amount', 0.0))
                }
                
                if pd.notna(row.get('latitude')) and pd.notna(row.get('longitude')):
                    citation['latitude'] = float(row['latitude'])
                    citation['longitude'] = float(row['longitude'])
                
                all_citations.append(citation)
            
            # Sort by date
            all_citations.sort(key=lambda x: x['date'] or '', reverse=True)
            
            # Calculate favorite violation
            violations = [c['violation'] for c in all_citations]
            from collections import Counter
            violation_counts = Counter(violations)
            favorite_violation = violation_counts.most_common(1)[0][0] if violations else 'Unknown'
            
            plate_data[plate] = {
                'total_fines': total_fines,
                'citation_count': citation_count,
                'plate_state': plate_state,
                'favorite_violation': favorite_violation,
                'all_citations': all_citations
            }
        
        return plate_data
    
    def store_month_data(self, plate_data: Dict[str, Dict], year: int, month: int):
        """Store processed data for a month in the database"""
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        try:
            print(f"  💾 Storing {year}-{month:02d} data in database...")
            
            # Store plate details
            stored_count = 0
            for plate, data in plate_data.items():
                cur.execute("""
                    INSERT INTO plate_details (plate, total_fines, citation_count, plate_state, favorite_violation, citations)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (plate) DO UPDATE SET
                        total_fines = plate_details.total_fines + EXCLUDED.total_fines,
                        citation_count = plate_details.citation_count + EXCLUDED.citation_count,
                        citations = plate_details.citations || EXCLUDED.citations
                """, (
                    plate,
                    data['total_fines'],
                    data['citation_count'],
                    data['plate_state'],
                    data['favorite_violation'],
                    Json(data['all_citations'])
                ))
                stored_count += 1
                
                if stored_count % 1000 == 0:
                    conn.commit()
                    print(f"     Stored {stored_count:,} plates...")
            
            conn.commit()
            print(f"  ✅ Stored {stored_count:,} plates for {year}-{month:02d}")
            
        except Exception as e:
            print(f"  ❌ Error storing data: {e}")
            conn.rollback()
        finally:
            cur.close()
            conn.close()
    
    def update_leaderboard(self):
        """Update the leaderboard with current data"""
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        try:
            print("  🏆 Updating leaderboard...")
            
            # Clear old leaderboard
            cur.execute("DELETE FROM leaderboard")
            
            # Get top 30 plates by total fines
            cur.execute("""
                SELECT plate, total_fines, citation_count
                FROM plate_details
                ORDER BY total_fines DESC, citation_count DESC
                LIMIT 30
            """)
            
            top_plates = cur.fetchall()
            
            # Insert new leaderboard
            for rank, (plate, total_fines, citation_count) in enumerate(top_plates, 1):
                cur.execute("""
                    INSERT INTO leaderboard (rank, plate, total_fines, citation_count)
                    VALUES (%s, %s, %s, %s)
                """, (rank, plate, total_fines, citation_count))
            
            conn.commit()
            print(f"  ✅ Updated leaderboard with {len(top_plates)} entries")
            
        except Exception as e:
            print(f"  ❌ Error updating leaderboard: {e}")
            conn.rollback()
        finally:
            cur.close()
            conn.close()
    
    def run(self):
        """Run the complete data fetching process"""
        print("\n" + "=" * 60)
        print("SF PARKING CITATIONS - HISTORICAL DATA FETCHER")
        print("=" * 60)
        print(f"Fetching data from {self.start_year} to {self.end_year}")
        print(f"Batch size: {self.batch_size:,}")
        print("=" * 60 + "\n")
        
        start_time = time.time()
        
        try:
            # Process each year and month
            for year in range(self.start_year, self.end_year + 1):
                for month in range(1, 13):
                    # Skip future months
                    if year == datetime.now().year and month > datetime.now().month:
                        break
                    
                    print(f"\n📅 Processing {year}-{month:02d}")
                    print("-" * 30)
                    
                    # Fetch data for this month
                    raw_data = self.fetch_month_data(year, month)
                    
                    if not raw_data:
                        print(f"  ⚠️  No data found for {year}-{month:02d}")
                        continue
                    
                    # Process the data
                    df = self.clean_and_process_data(raw_data)
                    if df.empty:
                        print(f"  ⚠️  No valid data after cleaning for {year}-{month:02d}")
                        continue
                    
                    # Aggregate by plate
                    plate_data = self.aggregate_by_plate(df)
                    if not plate_data:
                        print(f"  ⚠️  No plate data for {year}-{month:02d}")
                        continue
                    
                    # Store in database
                    self.store_month_data(plate_data, year, month)
                    
                    self.total_citations += len(raw_data)
                    self.processed_months += 1
                    
                    print(f"  ✅ Completed {year}-{month:02d}")
                    
                    # Rate limiting between months
                    time.sleep(1)
            
            # Update leaderboard
            self.update_leaderboard()
            
            elapsed = time.time() - start_time
            print("\n" + "=" * 60)
            print("HISTORICAL DATA FETCH COMPLETE")
            print("=" * 60)
            print(f"Processed months: {self.processed_months}")
            print(f"Total citations: {self.total_citations:,}")
            print(f"Time elapsed: {elapsed:.1f} seconds")
            print("=" * 60 + "\n")
            
        except KeyboardInterrupt:
            print("\n\n⚠️  Process interrupted by user")
        except Exception as e:
            print(f"\n❌ Error: {e}")
            import traceback
            traceback.print_exc()


def main():
    parser = argparse.ArgumentParser(description='Fetch historical SF parking citation data')
    parser.add_argument('--start-year', type=int, default=2020, help='Start year (default: 2020)')
    parser.add_argument('--end-year', type=int, default=2025, help='End year (default: 2025)')
    parser.add_argument('--batch-size', type=int, default=10000, help='Batch size (default: 10000)')
    
    args = parser.parse_args()
    
    if not DATABASE_URL:
        print("❌ Error: DATABASE_URL not found in environment")
        print("   Please set DATABASE_URL or POSTGRES_URL in .env.local")
        sys.exit(1)
    
    fetcher = HistoricalDataFetcher(
        start_year=args.start_year,
        end_year=args.end_year,
        batch_size=args.batch_size
    )
    
    fetcher.run()


if __name__ == '__main__':
    main()
