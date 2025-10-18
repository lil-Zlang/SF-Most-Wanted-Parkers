#!/usr/bin/env python3
"""
Fetch SF Parking Citation Data for January-July 2025

This script fetches parking citation data month by month from January to July 2025
and stores it in the PostgreSQL database.

Usage:
    python fetch_2025_data.py
"""

import json
import os
import sys
import time
from datetime import datetime
from typing import Dict, List, Any
from collections import Counter

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
    'violation_desc',
    'citation_location',
    'vehicle_plate_state',
    'vehicle_plate',
    'fine_amount',
    'the_geom'
]


def fetch_month_data(year: int, month: int) -> List[Dict]:
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
        '$limit': 10000,  # Smaller batch size to avoid timeouts
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
            response = requests.get(BASE_URL, params=params, headers=headers, timeout=60)
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
            time.sleep(1)
            
        except requests.exceptions.Timeout:
            print(f"     ⚠️  Timeout fetching batch at offset {offset}, continuing with {len(all_data)} records...")
            break
        except requests.exceptions.RequestException as e:
            print(f"     ❌ Error fetching data: {e}")
            break
    
    print(f"  ✅ Total records for {year}-{month:02d}: {len(all_data):,}")
    return all_data


def clean_and_process_data(raw_data: List[Dict]) -> pd.DataFrame:
    """Clean and process raw citation data"""
    if not raw_data:
        return pd.DataFrame()
    
    df = pd.DataFrame(raw_data)
    
    # Convert date column
    df['citation_issued_datetime'] = pd.to_datetime(df['citation_issued_datetime'], errors='coerce')
    
    # Convert fine_amount to numeric
    df['fine_amount'] = pd.to_numeric(df['fine_amount'], errors='coerce').fillna(0.0)
    
    # Extract coordinates from the_geom (if available)
    df['latitude'] = None
    df['longitude'] = None
    
    if 'the_geom' in df.columns:
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


def aggregate_by_plate(df: pd.DataFrame) -> Dict[str, Dict]:
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
                'violation': str(row.get('violation_desc', 'Unknown')),
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


def store_month_data(plate_data: Dict[str, Dict], year: int, month: int):
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


def update_leaderboard():
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


def main():
    print("\n" + "=" * 60)
    print("SF PARKING CITATIONS - 2025 DATA FETCHER")
    print("Fetching January through July 2025")
    print("=" * 60 + "\n")
    
    start_time = time.time()
    total_citations = 0
    processed_months = 0
    
    try:
        # Process each month from January to July 2025
        for month in range(1, 8):  # 1 to 7 (January to July)
            print(f"\n📅 Processing 2025-{month:02d}")
            print("-" * 30)
            
            # Fetch data for this month
            raw_data = fetch_month_data(2025, month)
            
            if not raw_data:
                print(f"  ⚠️  No data found for 2025-{month:02d}")
                continue
            
            # Process the data
            df = clean_and_process_data(raw_data)
            if df.empty:
                print(f"  ⚠️  No valid data after cleaning for 2025-{month:02d}")
                continue
            
            # Aggregate by plate
            plate_data = aggregate_by_plate(df)
            if not plate_data:
                print(f"  ⚠️  No plate data for 2025-{month:02d}")
                continue
            
            # Store in database
            store_month_data(plate_data, 2025, month)
            
            total_citations += len(raw_data)
            processed_months += 1
            
            print(f"  ✅ Completed 2025-{month:02d}")
            
            # Rate limiting between months
            time.sleep(1)
        
        # Update leaderboard
        update_leaderboard()
        
        elapsed = time.time() - start_time
        print("\n" + "=" * 60)
        print("2025 DATA FETCH COMPLETE")
        print("=" * 60)
        print(f"Processed months: {processed_months}")
        print(f"Total citations: {total_citations:,}")
        print(f"Time elapsed: {elapsed:.1f} seconds")
        print("=" * 60 + "\n")
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Process interrupted by user")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    main()
