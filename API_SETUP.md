# SF Open Data API Setup Guide

## Overview

Instead of downloading the entire 20M+ row dataset as a CSV/JSON file, you can use the **Socrata API** to filter and download only the data you need directly from SF Open Data.

## Quick Start

### Basic Usage (No API Token Required)

Download citations from 2020 onwards (max 500k records):

```bash
python process_data.py --api
```

### Recommended: Get a Free API Token

API tokens provide:
- **Higher rate limits** (no throttling)
- **Faster downloads**
- **Better reliability**

#### Steps to Get Your Token:

1. **Register for a free account**: https://dev.socrata.com/register
2. **Get your App Token** from the developer portal
3. **Create a `.env` file** in the project root:
   ```bash
   echo "SOCRATA_APP_TOKEN=your_actual_token_here" > .env
   ```
4. **Run the script** (it will automatically use your token)

## Usage Examples

### Download Recent Data (2023 onwards)

```bash
python process_data.py --api --start-date 2023-01-01
```

### Download Specific Date Range

```bash
python process_data.py --api --start-date 2022-01-01 --end-date 2022-12-31
```

### Download More Records

```bash
# Download 1 million records
python process_data.py --api --limit 1000000

# Download ALL matching records (no limit)
python process_data.py --api --limit 0 --start-date 2020-01-01
```

### Download Last 3 Years

```bash
python process_data.py --api --start-date 2022-01-01 --limit 0
```

## How Filtering Works

The script uses **SoQL** (Socrata Query Language) to filter data **server-side** before download. This means:

✅ **Only filtered data is transferred** (saves bandwidth and time)  
✅ **No need to download 20M rows** to filter locally  
✅ **Faster processing** overall  

## API Limits & Performance

| Configuration | Rate Limit | Recommended For |
|--------------|------------|-----------------|
| No token | ~1,000 requests/day | Testing, small downloads |
| With token | ~100,000 requests/day | Production, large downloads |

- Each request can fetch up to **50,000 records**
- The script automatically handles pagination
- Progress is displayed in real-time

## Advanced Filters (Future Enhancement)

The Socrata API supports many filters. You could extend the script to filter by:

- Specific violation types
- Plate state (CA, NV, etc.)
- Geographic bounds (latitude/longitude)
- Fine amount ranges
- Time of day

Example SoQL query (not yet implemented):
```sql
$where=citation_issued_datetime >= '2023-01-01' 
  AND fine_amount > 100 
  AND rp_plate_state = 'CA'
```

## Troubleshooting

### "No API token found" Warning

This is just a warning. The script will work without a token, but with lower rate limits. To remove the warning, add your token to `.env`.

### "Rate limit exceeded" Error

If you hit rate limits:
1. **Get an API token** (see above)
2. **Reduce the limit**: `--limit 100000`
3. **Wait a few hours** and try again
4. **Filter by date range** to reduce total records

### "Connection timeout" Error

- Check your internet connection
- The API might be temporarily unavailable
- Try again in a few minutes

### Column Names Don't Match

The API column names might differ from CSV exports. The script automatically maps common variations:
- `plate` → `vehicle_plate`
- `citation_issued_datetime` → `citation_issued_datetime`
- etc.

If you encounter unmapped columns, check the [API documentation](https://dev.socrata.com/foundry/data.sfgov.org/ab4h-6ztd).

## API Documentation

- **Dataset**: https://data.sfgov.org/Transportation/SFMTA-Parking-Citations-Fines/ab4h-6ztd
- **Socrata API Docs**: https://dev.socrata.com/
- **SoQL Reference**: https://dev.socrata.com/docs/queries/

## Benefits Summary

| Traditional Download | API Download with Filtering |
|---------------------|----------------------------|
| 20M+ rows | Only what you need |
| 5+ GB file size | Much smaller |
| Hours to download | Minutes to download |
| Manual CSV cleanup | Clean JSON data |
| Local filtering needed | Server-side filtering |

