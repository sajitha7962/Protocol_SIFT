# Protocol SIFT — Backend

FastAPI async backend for autonomous cybersecurity evidence analysis and investigation report generation.

**MVP Stack:** FastAPI · MongoDB (Motor) · Pydantic · Python 3.11+  
**No Celery. No PostgreSQL. No Neo4j. No Redis.**

---

## Directory Structure

```
app/
├── api/routers/         # HTTP endpoints
│   ├── evidence.py      # Evidence upload + pipeline trigger
│   ├── investigations.py
│   ├── pipeline.py      # Status, entities, normalized logs, timelines
│   ├── graph.py         # Knowledge graph (nodes + edges)
│   ├── findings.py      # Threat findings
│   └── reports.py       # Investigation reports
├── database/
│   └── mongodb.py       # Motor async client + collection accessors
├── models/
│   ├── sift_types.py    # Core enums and Pydantic models
│   └── normalized_log.py
├── parsers/             # Log format parsers
│   ├── json_parser.py
│   ├── csv_parser.py
│   └── sysmon_parser.py
├── services/            # Core business logic
│   ├── state_service.py      # Investigation lifecycle (MongoDB)
│   ├── entity_extractor.py   # Host, User, IP, Process, File, Domain
│   ├── graph_service.py      # Relationship graph (MongoDB)
│   ├── findings_engine.py    # 5 heuristic threat detection rules
│   ├── findings_store.py     # Findings persistence (MongoDB)
│   └── timeline_engine.py   # MITRE-annotated timeline builder
├── storage/
│   └── evidence_store.py    # Evidence file metadata (MongoDB)
├── workers/
│   └── tasks.py             # Pipeline orchestration (BackgroundTasks)
└── main.py                  # FastAPI app + lifespan startup
```

## Pipeline Flow

```
POST /evidence/upload
  → evidence_store (MongoDB)
  → BackgroundTasks → run_pipeline_background()
      1. parse logs  (json / csv / sysmon)
      2. entity_extractor → entities collection
      3. graph_service    → relationships collection
      4. findings_engine  → findings collection
      5. timeline_engine  → timelines collection
      6. report generator → reports collection
```

## Development

### Prerequisites
- Python 3.11+
- MongoDB Community Server running on `localhost:27017`

```bash
# Verify MongoDB
mongod --version
mongosh mongodb://localhost:27017
```

### Setup

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate

# Linux / macOS
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
```

### Environment Variables (`backend/.env`)

```env
MONGODB_URI=mongodb://localhost:27017/protocol_sift
MONGODB_DB=protocol_sift
```

### Run

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- **API docs:** http://127.0.0.1:8000/docs  
- **Health:** http://127.0.0.1:8000/health  
- **MongoDB health:** http://127.0.0.1:8000/health/mongodb  

### Tests

```bash
PYTHONPATH=app pytest --tb=short -q
```

