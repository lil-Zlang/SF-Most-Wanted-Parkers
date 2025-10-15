# Data Filtering Examples

This guide shows practical examples of filtering the 20M+ row SFMTA dataset to get exactly what you need.

## 🎯 Common Use Cases

### 1. Testing & Development (Small Dataset)

```bash
# Get just 10k recent records (fast download, ~30 seconds)
python process_data.py --api --start-date 2024-01-01 --limit 10000
```

**Use when:** You want to test the app quickly without waiting for large downloads.

---

### 2. Last Year Only (Medium Dataset)

```bash
# Get all 2024 citations
python process_data.py --api --start-date 2024-01-01 --end-date 2024-12-31 --limit 0
```

**Use when:** You want recent trends and don't need historical data.

---

### 3. Last 3 Years (Balanced Dataset)

```bash
# Citations from 2022 onwards (500k max)
python process_data.py --api --start-date 2022-01-01 --limit 500000
```

**Use when:** This is the **recommended default** for most use cases. Good balance of data volume and relevance.

---

### 4. Last 5 Years (Large Dataset)

```bash
# Citations from 2020 onwards (1M max)
python process_data.py --api --start-date 2020-01-01 --limit 1000000
```

**Use when:** You want comprehensive historical analysis.

---

### 5. All Available Data (Full Dataset)

```bash
# Get EVERYTHING from 2020 onwards (no limit)
python process_data.py --api --start-date 2020-01-01 --limit 0
```

**Use when:** You need the complete dataset. ⚠️ This may take 30-60 minutes and use several GB of RAM.

---

### 6. Specific Month

```bash
# Just January 2024
python process_data.py --api --start-date 2024-01-01 --end-date 2024-01-31
```

**Use when:** You want to analyze a specific time period.

---

### 7. Pandemic Period Analysis

```bash
# COVID-era citations (2020-2021)
python process_data.py --api --start-date 2020-01-01 --end-date 2021-12-31 --limit 0
```

**Use when:** Comparing parking patterns before/during/after the pandemic.

---

### 8. Current Year-to-Date

```bash
# 2025 so far
python process_data.py --api --start-date 2025-01-01 --limit 0
```

**Use when:** You want the freshest data possible.

---

## 📊 Download Time Estimates

| Records | Without Token | With Token | Use Case |
|---------|--------------|------------|----------|
| 10k | 30 sec | 10 sec | Quick testing |
| 50k | 2 min | 30 sec | Development |
| 100k | 4 min | 1 min | Small analysis |
| 500k | 20 min | 5 min | **Recommended** |
| 1M | 40 min | 10 min | Comprehensive |
| 2M+ | 60+ min | 20+ min | Full dataset |

*Actual times vary based on network speed and API load*

---

## 🔍 Advanced Filtering (Future Enhancement)

The Socrata API supports many more filters that aren't currently exposed via command-line. You could extend the script to support:

### Filter by Violation Type

```python
# In process_data.py, you could add:
where_clause += " AND violation_description LIKE '%METER%'"
```

### Filter by Location

```python
# Downtown SF only
where_clause += " AND latitude >= 37.77 AND latitude <= 37.80"
where_clause += " AND longitude >= -122.42 AND longitude <= -122.39"
```

### Filter by Fine Amount

```python
# High-value tickets only (>$100)
where_clause += " AND fine_amount > 100"
```

### Filter by Plate State

```python
# California plates only
where_clause += " AND rp_plate_state = 'CA'"
```

**Want these features?** Let me know, and I can add them to the script!

---

## 💡 Tips & Best Practices

### 1. Start Small

Always start with a small dataset (e.g., `--limit 10000`) to verify everything works before downloading large amounts.

```bash
# Test first
python process_data.py --api --start-date 2024-01-01 --limit 10000
npm run dev  # Verify the app works

# Then go bigger
python process_data.py --api --start-date 2022-01-01 --limit 500000
```

### 2. Use Date Ranges for Specific Periods

Instead of limiting by record count, use date ranges for more predictable results:

```bash
# Good: Exact time period
python process_data.py --api --start-date 2023-01-01 --end-date 2023-12-31

# Less predictable: May get random time coverage
python process_data.py --api --limit 100000
```

### 3. Get an API Token

**Seriously.** It's free, takes 2 minutes, and makes downloads 3-5x faster:

1. https://dev.socrata.com/register
2. `echo "SOCRATA_APP_TOKEN=your_token" > .env`
3. That's it!

### 4. Monitor Progress

The script shows real-time progress:
```
Downloading data from SF Open Data API...
  Filtering: citations from 2022-01-01 onwards
  Limit: 500,000 records maximum
  Using API token for higher rate limits
  Fetched 50,000 records...
  Fetched 100,000 records...
```

### 5. Combine Filters

You can use both date range AND limit:

```bash
# Get up to 100k records from 2023, but stop if we reach 100k before year-end
python process_data.py --api --start-date 2023-01-01 --end-date 2023-12-31 --limit 100000
```

---

## 🚨 Troubleshooting

### Too Slow?

1. **Get an API token** (5x faster)
2. **Reduce the limit**: Try `--limit 100000` instead of 500k
3. **Narrow date range**: Recent data only

### Out of Memory?

Your computer can't handle the dataset size:

1. **Reduce limit**: `--limit 250000`
2. **Shorter time range**: Use `--end-date`
3. **Close other programs** to free RAM

### Rate Limited?

You're hitting API limits:

1. **Get an API token** (100x higher limits)
2. **Wait 1 hour** and try again
3. **Reduce limit** on next attempt

### No Results?

Check your date range:

```bash
# Make sure dates are valid
python process_data.py --api --start-date 2023-01-01 --end-date 2023-12-31

# If still no results, try wider range
python process_data.py --api --start-date 2020-01-01 --limit 10000
```

---

## 📈 Recommended Workflow

```bash
# 1. Quick test (30 seconds)
python process_data.py --api --start-date 2024-01-01 --limit 10000
npm run dev
# Verify app works, looks good

# 2. Get meaningful dataset (5-10 minutes with token)
python process_data.py --api --start-date 2022-01-01 --limit 500000
# Rebuild app with larger dataset

# 3. (Optional) Go full scale later
python process_data.py --api --start-date 2020-01-01 --limit 0
# When you need complete historical analysis
```

---

## 🔗 More Resources

- **API Setup Guide**: [API_SETUP.md](API_SETUP.md)
- **Quick Start**: [QUICKSTART_API.md](QUICKSTART_API.md)
- **Full Documentation**: [dev_documentation.txt](dev_documentation.txt)
- **SF Open Data**: https://data.sfgov.org/Transportation/SFMTA-Parking-Citations-Fines/ab4h-6ztd
- **Socrata API Docs**: https://dev.socrata.com/

