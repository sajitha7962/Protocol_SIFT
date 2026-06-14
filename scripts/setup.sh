#!/bin/bash
set -e

echo "Protocol SIFT — Setup Script (MongoDB Edition)"
echo "================================================"

# ── Prerequisite: MongoDB ─────────────────────────────────────────────────────
echo ""
echo "[1/4] Verifying MongoDB installation..."
if ! command -v mongod &> /dev/null; then
    echo "[ERROR] mongod not found. Please install MongoDB Community Server."
    echo "        https://www.mongodb.com/try/download/community"
    exit 1
fi
mongod --version

echo "[1/4] Verifying MongoDB is reachable at localhost:27017..."
if ! mongosh --eval "db.runCommand({ping:1})" mongodb://localhost:27017 --quiet &> /dev/null; then
    echo "[WARN] MongoDB is not running. Attempting to start..."
    sudo systemctl start mongod 2>/dev/null || echo "[INFO] Start MongoDB manually and re-run this script."
else
    echo "[OK] MongoDB is running."
fi

# ── Backend ───────────────────────────────────────────────────────────────────
echo ""
echo "[2/4] Creating Python virtual environment..."
cd backend
python3 -m venv .venv
source .venv/bin/activate

echo "[2/4] Installing backend dependencies..."
pip install -r requirements.txt

if [ ! -f .env ]; then
    cp .env.example .env 2>/dev/null || cat > .env << 'EOF'
MONGODB_URI=mongodb://localhost:27017/protocol_sift
MONGODB_DB=protocol_sift
EOF
    echo "[OK] Created backend/.env"
fi
cd ..

# ── Frontend ──────────────────────────────────────────────────────────────────
echo ""
echo "[3/4] Installing frontend dependencies..."
cd frontend
npm install
cd ..

# ── Seed ─────────────────────────────────────────────────────────────────────
echo ""
echo "[4/4] Seeding sample investigation data into MongoDB..."
cd backend
source .venv/bin/activate
python ../scripts/seed_sample_investigation.py
cd ..

echo ""
echo "================================================"
echo "Setup complete!"
echo ""
echo "To start the backend:  cd backend && .venv/bin/uvicorn app.main:app --reload --port 8000"
echo "To start the frontend: cd frontend && npm run dev"
echo "API docs:              http://127.0.0.1:8000/docs"

