# Usage Guide for SF's Most Wanted Parkers

## Data Processing Guide

### Step 1: Obtain the Dataset

Download the SFMTA Parking Citations dataset from:
- San Francisco Open Data Portal: https://data.sfgov.org/
- Look for "SFMTA Parking Citations" dataset
- Export as CSV format

### Step 2: Run the Processing Script

```bash
python process_data.py path/to/parking_citations.csv
```

#### What the Script Does:

1. **Data Loading**: Reads the CSV file and loads it into memory
2. **Date Filtering**: Removes all citations before January 1, 2020
3. **Data Aggregation**: Groups citations by license plate and calculates:
   - Total fines owed
   - Number of citations
   - Most frequent violation type
   - All citation details with locations
4. **File Generation**: Creates two JSON files:
   - `public/data/leaderboard.json` - Top 100 offenders (lightweight)
   - `public/data/all_plates_details.json` - Complete database (larger)

#### Expected Output:

```
Loading data from parking_citations.csv...
Loaded 5000000 rows
Filtering data from 2020-01-01 onwards...
Filtered from 5000000 to 3500000 rows
Processing plates and aggregating data...
Processed 150000 unique plates
Calculating favorite violations...
Generating output files...
Created public/data/leaderboard.json with 100 entries
Created public/data/all_plates_details.json with 150000 plates
✓ Data processing complete!
```

### Step 3: Verify Output Files

Check that the files were created:
```bash
ls -lh public/data/
```

You should see:
- `leaderboard.json` (small, ~10-20 KB)
- `all_plates_details.json` (large, size varies based on dataset)

## Running the Application

### Development Mode

```bash
npm run dev
```

Access at: http://localhost:3000

Features:
- Hot module reloading
- Detailed error messages
- Development tools enabled

### Production Mode

```bash
npm run build
npm start
```

Access at: http://localhost:3000

Features:
- Optimized bundle size
- Server-side rendering
- Performance optimizations

## Using the Application

### Main Leaderboard Page

**URL**: `/`

**Features**:
1. View top 100 worst offenders
2. See total fines and citation counts
3. Medal icons for top 3 positions
4. Search for specific plates

**Actions**:
- Click any plate number to view details
- Use search bar to find specific plates
- Scroll to see full leaderboard

### Plate Detail Page (Rap Sheet)

**URL**: `/plate/[PLATE_NUMBER]`

**Example**: `/plate/ABC123`

**Features**:
1. Total fines owed (red card)
2. Total citations (orange card)
3. Most frequent violation (blue card)
4. Interactive map with all ticket locations
5. Complete citation history table

**Map Interactions**:
- Zoom in/out with controls or scroll
- Pan by clicking and dragging
- Click markers to see violation details
- Each marker shows:
  - Violation type
  - Date and time

### Search Functionality

**How to Search**:
1. Enter license plate in search bar on main page
2. Press Enter or click "Search" button
3. Navigate to plate details page

**Search Features**:
- Automatic uppercase conversion (abc123 → ABC123)
- Whitespace trimming
- Case-insensitive matching
- Validation for empty input

**Not Found**:
If a plate doesn't exist, you'll see:
- "Plate Not Found" message
- Link back to leaderboard

## Testing

### Run All Frontend Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

Good for development - automatically re-runs tests on file changes.

### Run Backend Tests

```bash
pytest
```

### Run Tests with Coverage

```bash
# Frontend
npm test -- --coverage

# Backend
pytest --cov
```

Coverage reports show which code is tested and which isn't.

### Test Specific Files

```bash
# Frontend
npm test SearchBar.test.tsx

# Backend
pytest __tests__/process_data.test.py
```

## Updating Data

To refresh the data with a new dataset:

1. Download latest SFMTA dataset
2. Run processing script:
   ```bash
   python process_data.py new_parking_citations.csv
   ```
3. Restart the application:
   ```bash
   # Development
   npm run dev
   
   # Production
   npm run build
   npm start
   ```

The JSON files will be overwritten with new data.

## Common Tasks

### Add Sample Data for Testing

Sample files are provided in `public/data/`:
- `sample_leaderboard.json`
- `sample_all_plates_details.json`

To use them:
```bash
cp public/data/sample_leaderboard.json public/data/leaderboard.json
cp public/data/sample_all_plates_details.json public/data/all_plates_details.json
```

### Clear Cache

```bash
rm -rf .next
npm run dev
```

### Reinstall Dependencies

```bash
# Node.js
rm -rf node_modules package-lock.json
npm install

# Python
pip install -r requirements.txt --force-reinstall
```

### Check for Linting Errors

```bash
npm run lint
```

### Fix Linting Errors

```bash
npm run lint -- --fix
```

## Performance Tips

### For Large Datasets

1. **Increase Node.js Memory**:
   ```bash
   NODE_OPTIONS="--max-old-space-size=4096" npm run build
   ```

2. **Optimize JSON Files**:
   - Consider splitting all_plates_details.json into chunks
   - Implement lazy loading for plate details

3. **Enable Compression**:
   Add to `next.config.js`:
   ```javascript
   module.exports = {
     compress: true,
   }
   ```

### For Fast Load Times

1. Use static generation:
   ```bash
   npm run build
   ```

2. Deploy to CDN (Vercel, Netlify)

3. Enable caching headers

## Troubleshooting

### "Cannot find module" errors

```bash
rm -rf node_modules .next
npm install
```

### Map not displaying

1. Check browser console for errors
2. Verify Leaflet CSS is loaded
3. Ensure JavaScript is enabled
4. Check network tab for blocked resources

### Data not loading

1. Verify JSON files exist:
   ```bash
   ls public/data/
   ```

2. Check file permissions:
   ```bash
   chmod 644 public/data/*.json
   ```

3. Verify JSON syntax:
   ```bash
   cat public/data/leaderboard.json | json_pp
   ```

### Build failures

1. Check Node.js version:
   ```bash
   node --version  # Should be 18+
   ```

2. Clear cache and rebuild:
   ```bash
   rm -rf .next node_modules
   npm install
   npm run build
   ```

### Python script errors

1. Check Python version:
   ```bash
   python --version  # Should be 3.9+
   ```

2. Verify dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Check CSV file format:
   - Ensure proper encoding (UTF-8)
   - Verify column names
   - Check for corrupted rows

## Best Practices

### Development

1. Always run tests before committing
2. Use meaningful commit messages
3. Keep dependencies updated
4. Follow TypeScript types strictly
5. Write tests for new features

### Data Processing

1. Backup original CSV files
2. Verify output before deploying
3. Check for data quality issues
4. Monitor file sizes
5. Document any custom transformations

### Deployment

1. Test locally first
2. Run production build before deploying
3. Verify data files are included
4. Check environment variables
5. Monitor application logs

## Advanced Usage

### Custom Data Columns

To add new data fields:

1. Update `types/index.ts`:
   ```typescript
   export interface Citation {
     // ... existing fields
     newField: string;
   }
   ```

2. Modify `process_data.py` to include new field

3. Update components to display new data

### Custom Visualizations

To add charts or graphs:

1. Install charting library:
   ```bash
   npm install recharts
   ```

2. Create new component in `components/`

3. Add to relevant page

### API Integration

To fetch live data instead of static JSON:

1. Create API routes in `app/api/`
2. Update pages to use `fetch()`
3. Add loading states
4. Implement error handling

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Leaflet Docs](https://react-leaflet.js.org/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Pandas Documentation](https://pandas.pydata.org/docs/)
- [SFMTA Open Data](https://data.sfgov.org/)

## Support

For issues or questions:
1. Check this usage guide
2. Review `dev_documentation.txt`
3. Check GitHub issues
4. Create new issue with:
   - Error messages
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, Node version, etc.)

