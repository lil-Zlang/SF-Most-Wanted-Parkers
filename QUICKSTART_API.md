# Quick Start: API Download Method

## 🚀 Fastest Way to Get Started (No Manual CSV Download!)

Instead of manually downloading a huge 20M+ row CSV file, use the API to download only what you need.

### Step 1: Install Python Dependencies

```bash
pip install -r requirements.txt
```

### Step 2: Download Filtered Data

```bash
# Download 500k records from 2020 onwards (takes ~5-10 minutes)
python process_data.py --api --start-date 2020-01-01 --limit 500000
```

**That's it!** The script will:
- Download data directly from SF Open Data
- Filter by date server-side
- Process and aggregate the data
- Generate `public/data/leaderboard.json` and `public/data/all_plates_details.json`

### Step 3: Run the Web App

```bash
npm install
npm run dev
```

Visit http://localhost:3000

---

## 🔑 Optional: Get Free API Token (Recommended)

For faster downloads and no rate limits:

1. **Register**: https://dev.socrata.com/register
2. **Create `.env` file**:
   ```bash
   echo "SOCRATA_APP_TOKEN=YOUR_ACTUAL_TOKEN_HERE" > .env
   ```
3. **Re-run the script** (it will automatically use your token)

---

## 📊 Usage Examples

### Download Recent Data Only

```bash
# Last 2 years (smaller dataset, faster)
python process_data.py --api --start-date 2023-01-01 --limit 500000
```

### Download Specific Year

```bash
python process_data.py --api --start-date 2023-01-01 --end-date 2023-12-31
```

### Download More Records

```bash
# 1 million records
python process_data.py --api --start-date 2020-01-01 --limit 1000000

# ALL matching records (no limit) - this may take a while!
python process_data.py --api --start-date 2020-01-01 --limit 0
```

### Help

```bash
python process_data.py --help
```

---

## ⚡ Why Use the API?

| Traditional Method | API Method |
|-------------------|------------|
| Download 5+ GB CSV manually | Download only what you need |
| Wait hours | Wait minutes |
| 20M+ rows locally | 500k-1M rows (configurable) |
| Manual filtering | Server-side filtering |
| Stale data | Latest data on-demand |

---

## 🆚 Comparison

### Without API Token
- ~1,000 requests/day
- Fine for testing and small downloads
- May see "429 Too Many Requests" if downloading lots

### With API Token (Free!)
- ~100,000 requests/day
- Much faster
- No rate limit issues
- **Highly recommended** for regular use

---

## 🛠️ Troubleshooting

### "No module named 'requests'"

Install dependencies:
```bash
pip install -r requirements.txt
```

### "Connection timeout" or "Rate limit exceeded"

1. Get a free API token (see above)
2. Reduce the limit: `--limit 100000`
3. Try again in a few minutes

### "No data available" on website

Make sure the script completed successfully and generated:
- `public/data/leaderboard.json`
- `public/data/all_plates_details.json`

---

## 📚 More Information

- **Full API Documentation**: See [API_SETUP.md](API_SETUP.md)
- **Developer Documentation**: See [dev_documentation.txt](dev_documentation.txt)
- **General Setup**: See [QUICKSTART.md](QUICKSTART.md)

