import asyncio
import os
import sys
import shutil

# Ensure backend/app is in pythonpath
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../backend/app')))

from database.mongodb import initialize_indexes, verify_connectivity
from services.state_service import state_service
from storage.evidence_store import evidence_store
from workers.tasks import run_pipeline_background
from models.sift_types import InvestigationCreate, EvidenceCreate, EvidenceType, Severity
from core.config import get_settings


async def seed_data():
    print("=== SEEDING SAMPLE INVESTIGATION FOR MONGODB ===")
    
    # 1. Verify connection
    connected = await verify_connectivity()
    if not connected:
        print("[ERROR] MongoDB is not running at mongodb://localhost:27017")
        print("Please start MongoDB and try again.")
        return

    # 2. Init indexes
    await initialize_indexes()
    print("[+] MongoDB indexes initialized.")

    # 3. Create Investigation
    inv = await state_service.create_investigation(InvestigationCreate(
        title="APT compromise - ACME Corp Intranet",
        description="Forensic investigation into anomalous server login, webshell deployment, and privilege escalation.",
        severity=Severity.HIGH,
        tags=["apt", "intrusion", "webshell"]
    ))
    case_id = inv.id
    print(f"[+] Created Investigation Case: {case_id}")

    # 4. Locate sample log
    sample_log_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../datasets/sample_log.json'))
    if not os.path.exists(sample_log_path):
        sample_log_path = os.path.abspath(os.path.join(os.path.dirname(__file__), 'datasets/sample_log.json'))
        
    settings = get_settings()
    os.makedirs(settings.EVIDENCE_STORAGE_PATH, exist_ok=True)
    dest_path = os.path.join(settings.EVIDENCE_STORAGE_PATH, f"{case_id}_sample_log.json")
    
    try:
        shutil.copy2(sample_log_path, dest_path)
        print(f"[+] Copied log file to storage: {dest_path}")
    except Exception as e:
        print(f"[WARN] Failed to copy log: {e}. Will use direct path.")
        dest_path = sample_log_path

    # 5. Create Evidence Record
    ev = await evidence_store.create(
        create_data=EvidenceCreate(
            case_id=case_id,
            type=EvidenceType.JSON_PACKAGE,
            filename="sample_log.json",
            source="upload"
        ),
        filename="sample_log.json",
        sha256="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        md5="d41d8cd98f00b204e9800998ecf8427e",
        size_bytes=os.path.getsize(sample_log_path) if os.path.exists(sample_log_path) else 1500,
        storage_path=dest_path,
        uploaded_by="soc_analyst"
    )
    evidence_id = ev.id
    print(f"[+] Created Evidence Record: {evidence_id}")

    # 6. Run pipeline
    print("[*] Running forensic pipeline to generate findings, timeline, and report...")
    result = await run_pipeline_background(
        case_id=str(case_id),
        evidence_id=str(evidence_id),
        evidence_path=dest_path,
        evidence_type="json_package"
    )
    print(f"[+] Pipeline completed successfully: {result}")
    print("\n[SUCCESS] Seeding complete! You can start the app and navigate to the dashboard.")


if __name__ == "__main__":
    asyncio.run(seed_data())

