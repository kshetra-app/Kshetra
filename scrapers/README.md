# Kshetra Data Scrapers

Multi-source scraper suite for Indian election data — photos, affidavits, DOBs, election results.

## Sources (Priority Order)

| # | Source | Script | Data |
|---|--------|--------|------|
| 1 | **MyNeta/ADR** | `myneta-scraper.js` | Age, assets, liabilities, criminal cases, education, profession, photos |
| 2 | **PRS India** | `prs-scraper.js` | MLA/MP photos (100% coverage), age, performance metrics |
| 3 | **Wikipedia** | `wikipedia-scraper.js` | DOB, biographical data, photos |
| 4 | **ECI (GitHub)** | `eci-github-scraper.js` | Election results, vote counts, all candidates |
| 5 | **Sansad.in** | `sansad-scraper.js` | Lok Sabha/Rajya Sabha MP profiles (Puppeteer) |
| 6 | **data.gov.in** | `datagov-scraper.js` | Open government datasets |

## Quick Start

```bash
# Install dependencies
cd scrapers && npm install

# Run all scrapers for all states
node scrapers/run-all.js

# Run single scraper for single state
node scrapers/myneta-scraper.js --state=TS --winners-only
node scrapers/prs-scraper.js --state=TS
node scrapers/wikipedia-scraper.js --state=TS

# Run all years (last 3-4 elections)
node scrapers/myneta-scraper.js --state=TS --all-years

# Only merge existing data
node scrapers/run-all.js --step=merge
```

## Output

All data is saved in `scrapers/output/`:
- `myneta/{ElectionKey}.json` — Per-election affidavit data
- `prs/{StateCode}-mlas.json` — MLA profiles + photos
- `wikipedia/{StateCode}-dobs.json` — DOB data
- `eci/{StateCode}-{Year}.json` — Election results
- `sansad/lok-sabha-members.json` — MP profiles
- `merged/all-candidates.json` — Unified candidate database
- `merged/photo-map.json` — Best photo per candidate

The photo map is automatically synced to `apps/mobile/data/candidate-photo-map.json`.

## Coverage

All 29 states + 2 UTs, elections from 2008 onwards. See `config.js` for complete mapping.
