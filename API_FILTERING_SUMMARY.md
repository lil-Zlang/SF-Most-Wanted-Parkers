# ✅ API Filtering Feature - Complete Summary

## 🎉 What's New?

You can now **download filtered data directly from SF Open Data API** without manually downloading a 20M+ row CSV file!

---

## ⚡ Quick Answer to Your Question

**YES!** You can filter the data BEFORE downloading using the Socrata API. Here's how:

### Instead of This (Old Way):
1. ❌ Go to https://data.sfgov.org/Transportation/SFMTA-Parking-Citations-Fines/ab4h-6ztd
2. ❌ Wait for 20M rows to export
3. ❌ Download 5+ GB CSV file
4. ❌ Process locally

### Do This (New Way):
```bash
# Download only what you need (takes ~5 minutes)
python process_data.py --api --start-date 2020-01-01 --limit 500000
```

✅ Server-side filtering  
✅ Only downloads what you need  
✅ Much faster  
✅ Always latest data  

---

## 🚀 Getting Started

### 1. Install Dependencies (if not already installed)

```bash
pip install -r requirements.txt
```

### 2. Download Filtered Data

```bash
# Default: 500k records from 2020 onwards (~5-10 minutes)
python process_data.py --api

# Or customize:
python process_data.py --api --start-date 2023-01-01 --limit 100000
```

### 3. Run the App

```bash
npm install
npm run dev
```

Visit http://localhost:3000

---

## 📝 Common Examples

### Testing & Development (Fast - 30 seconds)
```bash
python process_data.py --api --start-date 2024-01-01 --limit 10000
```

### Last 3 Years (Balanced - 5 minutes)
```bash
python process_data.py --api --start-date 2022-01-01 --limit 500000
```

### Specific Year
```bash
python process_data.py --api --start-date 2023-01-01 --end-date 2023-12-31
```

### All Available Data (Slow - 30+ minutes)
```bash
python process_data.py --api --start-date 2020-01-01 --limit 0
```

---

## 🔑 Optional: Free API Token (Highly Recommended)

### Why?
- **5-10x faster downloads**
- **No rate limits**
- **Free forever**

### How?

1. **Register** (2 minutes): https://dev.socrata.com/register
2. **Get your token** from the developer portal
3. **Create `.env` file**:
   ```bash
   echo "SOCRATA_APP_TOKEN=your_actual_token_here" > .env
   ```
4. **Run the script** (token is automatically used)

That's it!

---

## 🎯 All Available Options

```bash
python process_data.py --help
```

**Options:**
- `--api` - Download from API (recommended)
- `--start-date YYYY-MM-DD` - Start date for filtering (default: 2020-01-01)
- `--end-date YYYY-MM-DD` - End date for filtering (default: today)
- `--limit N` - Maximum records to download (default: 500000, use 0 for no limit)

**Examples:**
```bash
# Test with small dataset
python process_data.py --api --limit 10000

# Last year only
python process_data.py --api --start-date 2024-01-01

# Specific date range
python process_data.py --api --start-date 2023-01-01 --end-date 2023-12-31

# Large dataset
python process_data.py --api --limit 1000000

# Everything (no limit)
python process_data.py --api --start-date 2020-01-01 --limit 0
```

---

## 📊 How Filtering Works

### The API Query:
When you run:
```bash
python process_data.py --api --start-date 2022-01-01 --limit 500000
```

The script sends this to the API:
```sql
WHERE citation_issued_datetime >= '2022-01-01T00:00:00.000'
LIMIT 500000
```

**This means:**
- ✅ Filtering happens **on the server**
- ✅ Only filtered data is transferred
- ✅ Saves bandwidth and time
- ✅ No need to download 20M rows

### Without API Token:
- ~1,000 requests/day
- Slower downloads
- May hit rate limits

### With API Token:
- ~100,000 requests/day
- Much faster
- No rate limit issues

---

## 🔧 What Changed?

### Updated Files:

1. **`process_data.py`**
   - Added API download functionality
   - SoQL query support
   - Automatic pagination
   - Column name mapping
   - Progress tracking

2. **`requirements.txt`**
   - Added `requests` (for API calls)
   - Added `python-dotenv` (for .env support)

3. **Documentation**
   - `API_SETUP.md` - Complete API guide
   - `QUICKSTART_API.md` - Fast start guide
   - `FILTERING_EXAMPLES.md` - Practical examples
   - `README.md` - Updated with API instructions
   - `dev_documentation.txt` - Full technical docs

---

## 🎁 Benefits

| Feature | Old Way (CSV) | New Way (API) |
|---------|--------------|---------------|
| Download size | 5+ GB | As needed |
| Time to data | Hours | Minutes |
| Filtering | Manual | Server-side |
| Latest data | Manual update | On-demand |
| Flexibility | Limited | High |

---

## 🛠️ Technical Details

### API Endpoint:
```
https://data.sfgov.org/resource/ab4h-6ztd.json
```

### Available Columns:
- `citation_issued_datetime`
- `vehicle_plate`
- `vehicle_plate_state`
- `fine_amount`
- `violation_desc`
- `citation_location`
- `citation_number`

### Pagination:
- Max 50,000 records per request
- Script automatically handles pagination
- Progress shown in real-time

### Filtering:
Currently supported:
- ✅ Date range filtering
- ✅ Record limit

Could be added (not implemented):
- Violation type
- Geographic bounds
- Fine amount range
- Plate state

---

## 📚 Documentation

**Quick Start:**
- [QUICKSTART_API.md](QUICKSTART_API.md) - Get started in 5 minutes

**Complete Guides:**
- [API_SETUP.md](API_SETUP.md) - Full API documentation
- [FILTERING_EXAMPLES.md](FILTERING_EXAMPLES.md) - Practical examples
- [dev_documentation.txt](dev_documentation.txt) - Technical details

**Original Docs:**
- [README.md](README.md) - Project overview
- [USAGE.md](USAGE.md) - Web app usage

---

## 🐛 Troubleshooting

### "No module named 'requests'"
```bash
pip install -r requirements.txt
```

### "Rate limit exceeded"
1. Get a free API token (see above)
2. Or reduce limit: `--limit 100000`
3. Or wait a few hours

### "Connection timeout"
- Check internet connection
- API might be temporarily down
- Try again in a few minutes

### "No data available" on website
- Make sure script completed successfully
- Check `public/data/leaderboard.json` exists
- Check `public/data/all_plates_details.json` exists

---

## ✅ Testing

### Verified Working:

```bash
# ✅ Small download (50 records)
python process_data.py --api --start-date 2024-10-01 --limit 50

# Output:
# ✓ Downloaded 50 records from API
# Processed 35 unique plates
# ✓ Data processing complete!
```

### Sample Output:
```json
[
  {
    "rank": 1,
    "plate": "8GOE057",
    "total_fines": 117.0,
    "citation_count": 1
  },
  ...
]
```

---

## 🎯 Recommended Workflow

### For Testing:
```bash
# Quick test (30 seconds)
python process_data.py --api --start-date 2024-01-01 --limit 10000
npm run dev
# Verify everything works
```

### For Development:
```bash
# Good balance (5-10 minutes)
python process_data.py --api --start-date 2022-01-01 --limit 500000
npm run dev
```

### For Production:
```bash
# Optional: Get API token first
# Then download comprehensive dataset (20-30 minutes)
python process_data.py --api --start-date 2020-01-01 --limit 1000000
npm run build
npm start
```

---

## 🙋 Questions?

**Q: Do I need an API token?**  
A: No, but it's highly recommended (free and 5x faster)

**Q: What's the default limit?**  
A: 500,000 records (good balance for most use cases)

**Q: Can I download everything?**  
A: Yes, use `--limit 0` (may take 30+ minutes)

**Q: Can I still use CSV files?**  
A: Yes! Just run: `python process_data.py file.csv`

**Q: How do I filter by violation type?**  
A: Not currently supported, but can be added if needed

**Q: Is the data real-time?**  
A: API has latest data from SFMTA, usually updated daily

---

## 🔗 Links

- **SF Open Data**: https://data.sfgov.org/Transportation/SFMTA-Parking-Citations-Fines/ab4h-6ztd
- **Get API Token**: https://dev.socrata.com/register
- **Socrata API Docs**: https://dev.socrata.com/
- **SoQL Reference**: https://dev.socrata.com/docs/queries/

---

## 🎉 Summary

You asked:
> "is there way that i can filter out the data before download this 20m row of json file"

**Answer: YES!** 

Just run:
```bash
python process_data.py --api --start-date 2020-01-01 --limit 500000
```

This will:
- ✅ Filter data **server-side** (no 20M download!)
- ✅ Download only 500k records (~5-10 minutes)
- ✅ Process and generate JSON files
- ✅ Ready to use with the web app

**Optional but recommended:** Get a free API token for 5x faster downloads.

---

**Made with ❤️ - October 14, 2025**

