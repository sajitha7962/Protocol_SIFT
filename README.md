# Protocol SIFT

Protocol SIFT is an autonomous cybersecurity incident response agent that works like a senior cybersecurity investigator — uploading evidence, normalising logs, extracting threat entities, building a knowledge graph, generating MITRE-mapped findings, and producing a full investigation report.

## Architecture

This is an enterprise monorepo containing:
- `backend/` — FastAPI + MongoDB (Motor) async backend
- `frontend/` — React SPA with Zustand and Tailwind
- `datasets/` — Sample forensic log files for testing
- `scripts/` — Setup and seeding utilities
- `docs/` — Architecture documentation

## MVP Pipeline

```
Evidence Upload
  → Log Normalization (JSON / CSV / Sysmon XML)
  → Entity Extraction  (Host, User, IP, Process, File, Domain)
  → Relationship Graph (MongoDB relationships collection)
  → Findings Engine    (5 heuristic threat detection rules)
  → Timeline Builder   (Chronological MITRE-annotated events)
  → Report Generator   (Executive summary + MITRE coverage)
  → Frontend Display
```

## Prerequisites

- **Python 3.11+**
- **Node.js 18+**
- **MongoDB Community Server** (running locally on port 27017)

Verify MongoDB:
```bash
mongod --version
mongosh mongodb://localhost:27017
```

## Quickstart

### 1. Run the setup script

Windows (PowerShell):
```powershell
.\scripts\setup.ps1
```

Linux / macOS:
```bash
./scripts/setup.sh
```

### 2. Seed a sample investigation

```bash
cd backend
python ../scripts/seed_sample_investigation.py
```

### 3. Start the backend

```bash
cd backend
.venv\Scripts\uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

API docs available at: **http://127.0.0.1:8000/docs**

Health checks:
- `GET /health` — overall status
- `GET /health/mongodb` — database connectivity
- `GET /health/storage` — file storage

### 4. Start the frontend

```bash
cd frontend
npm run dev
```

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and configure:

```env
MONGODB_URI=mongodb://localhost:27017/protocol_sift
MONGODB_DB=protocol_sift
```

No Docker, no PostgreSQL, no Redis, no Neo4j required for the MVP.

