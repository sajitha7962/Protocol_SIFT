Write-Host "Protocol SIFT — Setup Script (MongoDB Edition)" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# ── Prerequisite: MongoDB ─────────────────────────────────────────────────────
Write-Host ""
Write-Host "[1/4] Verifying MongoDB installation..." -ForegroundColor Yellow

if (-not (Get-Command mongod -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] mongod not found. Please install MongoDB Community Server." -ForegroundColor Red
    Write-Host "        https://www.mongodb.com/try/download/community"
    exit 1
}

mongod --version

Write-Host "[1/4] Verifying MongoDB is running..." -ForegroundColor Yellow
$mongoRunning = Get-Service -Name MongoDB -ErrorAction SilentlyContinue
if ($mongoRunning -and $mongoRunning.Status -eq 'Running') {
    Write-Host "[OK] MongoDB service is running." -ForegroundColor Green
} else {
    Write-Host "[INFO] Attempting to start MongoDB service..." -ForegroundColor Yellow
    try {
        Start-Service MongoDB -ErrorAction Stop
        Write-Host "[OK] MongoDB started." -ForegroundColor Green
    } catch {
        Write-Host "[WARN] Could not start MongoDB automatically. Please start it manually." -ForegroundColor Yellow
        Write-Host "       Run: mongod --dbpath C:\data\db"
    }
}

# ── Backend ───────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "[2/4] Creating Python virtual environment..." -ForegroundColor Yellow
python -m venv .\backend\.venv
.\backend\.venv\Scripts\Activate.ps1

Write-Host "[2/4] Installing backend dependencies..." -ForegroundColor Yellow
Set-Location backend
pip install -r requirements.txt

if (-not (Test-Path .env)) {
    if (Test-Path .env.example) {
        Copy-Item .env.example .env
    } else {
        @"
MONGODB_URI=mongodb://localhost:27017/protocol_sift
MONGODB_DB=protocol_sift
"@ | Out-File -FilePath .env -Encoding utf8
    }
    Write-Host "[OK] Created backend/.env" -ForegroundColor Green
}
Set-Location ..

# ── Frontend ──────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "[3/4] Installing frontend dependencies..." -ForegroundColor Yellow
Set-Location frontend
npm install
Set-Location ..

# ── Seed ─────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "[4/4] Seeding sample investigation data into MongoDB..." -ForegroundColor Yellow
.\backend\.venv\Scripts\python.exe .\scripts\seed_sample_investigation.py

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "To start the backend:"  -ForegroundColor White
Write-Host "  cd backend && .\.venv\Scripts\uvicorn.exe app.main:app --reload --port 8000"
Write-Host ""
Write-Host "To start the frontend:" -ForegroundColor White
Write-Host "  cd frontend && npm run dev"
Write-Host ""
Write-Host "API docs: http://127.0.0.1:8000/docs" -ForegroundColor Cyan
