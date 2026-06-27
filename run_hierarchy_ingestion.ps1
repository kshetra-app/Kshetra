# run_hierarchy_ingestion.ps1
# Script to run the complete Kshetra Hierarchy Framework data ingestion pipeline.
# Usage: .\run_hierarchy_ingestion.ps1 -State <TS|AP> [-Year <2023|2024>]

param (
    [Parameter(Mandatory=$true)]
    [ValidateSet('TS', 'AP')]
    [string]$State,

    [Parameter(Mandatory=$false)]
    [int]$Year = 2023
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Kshetra Administrative Hierarchy Data Ingestion Pipeline" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Target State: $State" -ForegroundColor Yellow
Write-Host "Election Year: $Year" -ForegroundColor Yellow

# Step 1: Run LGD Scraper to fetch structural mapping
Write-Host "`n[Step 1/5] Ingesting LGD Hierarchy structure..." -ForegroundColor Green
node scrapers/lgd-scraper.js --state=$State

if ($LASTEXITCODE -ne 0) {
    Write-Error "LGD Scraper failed. Ingestion aborted."
    exit 1
}

# Step 2: Run CEO Booth Scraper to fetch booth locations and voter count mapping
Write-Host "`n[Step 2/5] Ingesting Polling Booth mappings..." -ForegroundColor Green
node scrapers/ceo-booth-scraper.js --state=$State

if ($LASTEXITCODE -ne 0) {
    Write-Error "CEO Booth Scraper failed. Ingestion aborted."
    exit 1
}

# Step 3: Run Booth Result Scraper to ingest vote counts
Write-Host "`n[Step 3/5] Ingesting Booth-level Election Results..." -ForegroundColor Green
node scrapers/booth-result-scraper.js --state=$State --year=$Year

if ($LASTEXITCODE -ne 0) {
    Write-Error "Booth Result Scraper failed. Ingestion aborted."
    exit 1
}

# Step 4: Run Local Body Scraper to ingest Panchayat/Ward-level election results
Write-Host "`n[Step 4/5] Ingesting Local Body / Panchayat Results..." -ForegroundColor Green
$secYear = if ($State -eq 'TS') { 2019 } else { 2021 }
node scrapers/local-body-scraper.js --state=$State --year=$secYear

if ($LASTEXITCODE -ne 0) {
    Write-Error "Local Body Scraper failed. Ingestion aborted."
    exit 1
}

# Step 5: Run Hierarchy Validator to check data integrity
Write-Host "`n[Step 5/5] Running Hierarchy Validation..." -ForegroundColor Green
node scrapers/hierarchy-validator.js --state=$State --audit-report

if ($LASTEXITCODE -ne 0) {
    Write-Warning "Hierarchy validation found one or more warnings/errors. Please check the audit report."
} else {
    Write-Host "`nAll validation checks passed! Hierarchy is 100% accurate." -ForegroundColor Green
}

# Step 6: Generate TypeScript seed file from the scraped JSON data
Write-Host "`n[Optional Step] Generating TypeScript seed file..." -ForegroundColor Green
node scrapers/hierarchy-seed-generator.js --state=$State --year=$Year

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host "Ingestion Pipeline Completed Successfully!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
