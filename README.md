# SF's Most Wanted Parkers 🚗🎫

The official leaderboard of San Francisco's worst parking offenders since 2020.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)
![Python](https://img.shields.io/badge/Python-3.9+-green)

## 🎯 Overview

"SF's Most Wanted Parkers" is a fast, interactive single-page application that displays parking citation data from San Francisco. Built with Next.js and powered by pre-processed SFMTA data, it provides:

- 🏆 **Leaderboard**: Top 100 worst parking offenders ranked by total fines
- 🔍 **Search**: Look up any license plate's complete violation history
- 🗺️ **Interactive Maps**: See exactly where each ticket was issued
- 📊 **Statistics**: Total fines, citation counts, and favorite violations

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.9+ with pip
- ~~SFMTA Parking Citations dataset (CSV format)~~ **Not needed! Use API download** 🎉

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd SF-Most-Wanted-Parkers
   ```

2. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Download and process parking data** ⚡ NEW!
   
   **Option A: API Download (Recommended)**
   ```bash
   # Download filtered data directly from SF Open Data API
   # No need to manually download 20M+ rows!
   python process_data.py --api --start-date 2020-01-01 --limit 500000
   ```
   
   **Option B: Process from CSV (Traditional)**
   ```bash
   # If you already have a CSV file
   python process_data.py path/to/parking_citations.csv
   ```
   
   This generates `public/data/leaderboard.json` and `public/data/all_plates_details.json`

4. **Install Node.js dependencies**
   ```bash
   npm install
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### 🔑 Optional: Get Free API Token (Recommended)

For faster downloads and higher rate limits:

1. Register at https://dev.socrata.com/register
2. Create a `.env` file: `echo "SOCRATA_APP_TOKEN=your_token" > .env`
3. Re-run the API download command

See [QUICKSTART_API.md](QUICKSTART_API.md) for more details.

## 📁 Project Structure

```
SF-Most-Wanted-Parkers/
├── app/                      # Next.js App Router pages
│   ├── page.tsx             # Main leaderboard page
│   ├── layout.tsx           # Root layout
│   └── plate/[plateNumber]/ # Dynamic plate detail pages
├── components/              # React components
│   ├── SearchBar.tsx       # License plate search
│   ├── LeaderboardTable.tsx # Top 100 table
│   └── TicketMap.tsx       # Interactive map
├── types/                   # TypeScript types
├── public/data/            # Generated JSON data files
├── __tests__/              # Test files
├── process_data.py         # Python data processor
└── README.md              # This file
```

## 🔧 How It Works

### Phase 1: Data Processing (Python)

The `process_data.py` script:
1. **Downloads** data from SF Open Data API with filtering (or loads CSV)
2. **Filters** records by date range (default: 2020 onwards)
3. **Groups** citations by license plate
4. **Calculates** totals, counts, and favorite violations
5. **Exports** two optimized JSON files:
   - `leaderboard.json`: Top 100 offenders
   - `all_plates_details.json`: Complete plate database

#### NEW: API Download with Filtering 🎉

Instead of downloading 20M+ rows manually, use the API to filter server-side:

```bash
# Download last 5 years, limit to 500k records
python process_data.py --api --start-date 2020-01-01 --limit 500000

# Download specific year
python process_data.py --api --start-date 2023-01-01 --end-date 2023-12-31

# More examples in FILTERING_EXAMPLES.md
```

**Benefits:**
- ✅ No manual CSV download needed
- ✅ Filter data BEFORE downloading (saves time & bandwidth)
- ✅ Always get the latest data
- ✅ Flexible date ranges and limits

### Phase 2: Frontend (Next.js)

The web application:
- **Main Page (`/`)**: Displays the leaderboard with search functionality
- **Plate Pages (`/plate/[plateNumber]`)**: Shows individual "rap sheets" with:
  - Total fines and citation counts
  - Most frequent violation
  - Interactive map of all ticket locations
  - Complete citation history table

## 🧪 Testing

### Run Frontend Tests
```bash
npm test              # Run once
npm run test:watch    # Watch mode
```

### Run Backend Tests
```bash
pytest                # All tests
pytest --cov          # With coverage report
```

### Coverage Goals
- Minimum 80% coverage on all metrics
- Unit tests for components
- Integration tests for data processing

## 📊 Data Requirements

The input CSV should contain these columns (names are flexible, the script auto-maps):
- `vehicle_plate` or similar
- `fine_amount` or similar
- `citation_issued_datetime` or similar
- `violation_description` or similar
- `latitude` (optional)
- `longitude` (optional)

## 🛠️ Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS
- **Maps**: React Leaflet + OpenStreetMap
- **Data Processing**: Python 3, Pandas
- **Testing**: Jest, React Testing Library, Pytest

## 🎨 Features

### Main Leaderboard Page
- Clean, responsive design
- Search bar for quick plate lookup
- Top 100 offenders table with:
  - Ranking with medal icons (🥇🥈🥉)
  - License plate (clickable)
  - Total fines (formatted currency)
  - Citation count

### Plate Details ("Rap Sheet")
- Key statistics cards
- Interactive map with markers for each ticket
- Click markers to see violation details
- Sortable table of all citations
- Back navigation to leaderboard

### Search Functionality
- Real-time input validation
- Automatic uppercase conversion
- Direct navigation to plate details
- "Not found" handling

## 🚢 Deployment

### Build for Production
```bash
npm run build
npm start
```

### Deploy to Vercel (Recommended)
```bash
vercel deploy
```

### Deploy to Other Platforms
Compatible with:
- Netlify
- AWS Amplify
- Any Node.js hosting service

Ensure `public/data/*.json` files are included in the build.

## 📝 Scripts

**Frontend:**
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run Jest tests

**Data Processing:**
- `python process_data.py --api` - Download from API (recommended)
- `python process_data.py <file>` - Process from CSV file
- `python process_data.py --help` - Show all options

## 🔒 Security & Privacy

- Uses publicly available parking citation data
- No user authentication required
- No personal information collected
- All data is pre-processed and static
- No API keys needed (uses public maps)

## 🐛 Troubleshooting

**"No data available" message**
- Run `python process_data.py <csv_file>` to generate data files

**Map not loading**
- Ensure JavaScript is enabled
- Check browser console for errors
- Verify Leaflet CSS is loaded

**Plate not found**
- Verify plate exists in dataset
- Check that plate number is correct
- Data is case-insensitive (auto-converts to uppercase)

**Build errors**
- Clear `.next` folder: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Verify Node.js version: `node --version` (should be 18+)

## 📖 Documentation

- **[QUICKSTART_API.md](QUICKSTART_API.md)** - Fast setup with API download
- **[API_SETUP.md](API_SETUP.md)** - Complete API usage guide
- **[FILTERING_EXAMPLES.md](FILTERING_EXAMPLES.md)** - Practical filtering examples
- **[dev_documentation.txt](dev_documentation.txt)** - Full technical documentation
- **[USAGE.md](USAGE.md)** - Web app usage guide

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

MIT License - See LICENSE file for details

## 🙏 Acknowledgments

- Data provided by SFMTA (San Francisco Municipal Transportation Agency)
- Maps powered by OpenStreetMap contributors
- Built with Next.js and React

## 📧 Contact

For questions or issues, please open a GitHub issue.

---

Made with ❤️ in San Francisco