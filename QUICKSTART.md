# Quick Start Guide

## 🚀 Get Started in 3 Steps

### 1️⃣ Install Dependencies

```bash
# Python dependencies
pip install -r requirements.txt

# Node.js dependencies
npm install
```

### 2️⃣ Process Data (Optional - Sample Data Included)

```bash
# If you have the SFMTA dataset:
python process_data.py path/to/parking_citations.csv

# Or use the included sample data (already copied):
# Sample data is ready to use!
```

### 3️⃣ Run the App

```bash
# Development mode (with hot reload)
npm run dev

# Then open: http://localhost:3000
```

## 📋 Common Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm test` | Run frontend tests |
| `npm run lint` | Check code quality |
| `python process_data.py <file>` | Process parking data |
| `pytest` | Run backend tests |

## 🔍 Quick Test

After running `npm run dev`, test these URLs:

- **Leaderboard**: http://localhost:3000
- **Sample Plate**: http://localhost:3000/plate/SAMPLE1

## 🆘 Troubleshooting

**Problem: "No data available"**
```bash
# Use sample data:
cp public/data/sample_leaderboard.json public/data/leaderboard.json
cp public/data/sample_all_plates_details.json public/data/all_plates_details.json
```

**Problem: Build errors**
```bash
# Clean and reinstall:
rm -rf .next node_modules
npm install
npm run build
```

**Problem: Port already in use**
```bash
# Use a different port:
PORT=3001 npm run dev
```

## 📚 Full Documentation

- **README.md** - Complete project overview
- **USAGE.md** - Detailed usage guide
- **dev_documentation.txt** - Technical documentation

## ✅ Verify Installation

```bash
# 1. Check Node.js version (should be 18+)
node --version

# 2. Check Python version (should be 3.9+)
python --version

# 3. Test frontend
npm test

# 4. Build project
npm run build

# 5. Start app
npm run dev
```

## 🎯 Next Steps

1. ✅ Browse the leaderboard at `/`
2. ✅ Search for a plate using the search bar
3. ✅ Click on a plate to see the "rap sheet"
4. ✅ Interact with the map
5. 📥 Download real SFMTA data from https://data.sfgov.org/
6. 🔄 Process your own data with `process_data.py`

---

**Need Help?** Check the full documentation or create an issue on GitHub.

