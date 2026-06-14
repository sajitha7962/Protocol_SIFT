"""Findings Engine — Applies security detection rules to normalized logs and stores findings."""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Tuple
from uuid import UUID, uuid4

from models.normalized_log import NormalizedLog
from models.sift_types import Finding, FindingStatus, Severity, ReasoningTrace
from services.findings_store import findings_store
from services.graph_service import graph_service

logger = logging.getLogger(__name__)


def _is_private_ip(ip: str) -> bool:
    """Check if an IP address is a private/loopback/non-routable IP."""
    if not ip:
        return True
    ip = ip.strip()
    if ip.startswith(("127.", "10.", "192.168.")):
        return True
    if ip.startswith("172."):
        # Check 172.16.x.x to 172.31.x.x
        parts = ip.split(".")
        if len(parts) >= 2:
            try:
                sec = int(parts[1])
                if 16 <= sec <= 31:
                    return True
            except ValueError:
                pass
    if ip in ("localhost", "::1", "0.0.0.0"):
        return True
    return False


class FindingsEngine:
    """Applies threat detection heuristics to normalized logs."""

    async def analyze_and_store_findings(
        self,
        case_id: str,
        logs: List[NormalizedLog],
    ) -> List[Finding]:
        """Runs the 5 threat rules and saves findings to MongoDB."""
        findings: List[Finding] = []
        
        if not logs:
            return findings

        # Sort logs chronologically to help windowed rules
        sorted_logs = sorted(logs, key=lambda x: x.timestamp)
        
        # Rule 1: Multiple Failed Logins
        failed_logins = await self._detect_failed_logins(case_id, sorted_logs)
        findings.extend(failed_logins)

        # Rule 2: Suspicious Login (Off-hours / Anomalous)
        suspicious_logins = await self._detect_suspicious_logins(case_id, sorted_logs)
        findings.extend(suspicious_logins)

        # Rule 3: Unknown/Suspicious Process Execution
        suspicious_processes = await self._detect_suspicious_processes(case_id, sorted_logs)
        findings.extend(suspicious_processes)

        # Rule 4: External IP Communication
        external_ips = await self._detect_external_ips(case_id, sorted_logs)
        findings.extend(external_ips)

        # Rule 5: Privilege Escalation
        priv_escs = await self._detect_privilege_escalation(case_id, sorted_logs)
        findings.extend(priv_escs)

        # Persist findings and register in knowledge graph
        for finding in findings:
            await findings_store.create(finding)
            await graph_service.create_finding_node(
                case_id=case_id,
                finding_id=str(finding.id),
                title=finding.title,
                severity=finding.severity.value,
                mitre_id=finding.mitre_technique or "",
            )
            
            # Also create relationships from finding to its evidence reference logs if any
            for ev_id in finding.evidence_refs:
                # Link finding to evidence node
                await graph_service.create_relationship(
                    from_id=str(finding.id),
                    from_label="Finding",
                    to_id=str(ev_id),
                    to_label="Evidence",
                    relationship="SUPPORTED_BY",
                    investigation_id=case_id
                )

        logger.info(f"Findings Engine generated {len(findings)} findings for case {case_id}")
        return findings

    async def _detect_failed_logins(self, case_id: str, logs: List[NormalizedLog]) -> List[Finding]:
        """Rule 1: Multiple Failed Logins (>=5 failures in a 5-minute window)."""
        findings = []
        
        # Group failure logs by (user, host)
        failures_by_user_host: Dict[Tuple[str, str], List[NormalizedLog]] = {}
        for log in logs:
            is_failed = False
            raw_str = str(log.raw_data).lower()
            
            if log.event_type == "Sysmon-4625" or "4625" in raw_str:
                is_failed = True
            elif "fail" in log.event_type.lower():
                is_failed = True
            elif any(x in raw_str for x in ("failed logon", "failed login", "authentication failure", "failed password", "invalid user")):
                is_failed = True
                
            if is_failed and log.user and log.host:
                key = (log.user, log.host)
                failures_by_user_host.setdefault(key, []).append(log)

        # Check for sliding windows of 5 mins with count >= 5
        for (user, host), group in failures_by_user_host.items():
            # Sliding window check
            for i in range(len(group)):
                start_log = group[i]
                window_logs = [start_log]
                for j in range(i + 1, len(group)):
                    diff = (group[j].timestamp - start_log.timestamp).total_seconds()
                    if diff <= 300: # 5 minutes
                        window_logs.append(group[j])
                    else:
                        break
                
                if len(window_logs) >= 5:
                    evidence_refs = list(set(UUID(l.evidence_id) for l in window_logs))
                    supporting_evidence = [
                        f"Failed login attempt by user '{user}' on host '{host}' at {l.timestamp.isoformat()}"
                        for l in window_logs
                    ]
                    
                    trace = ReasoningTrace(
                        observation=f"Observed {len(window_logs)} failed login attempts within 5 minutes.",
                        evidence=f"Logs from user '{user}' on host '{host}'.",
                        inference="Multiple authentication failures suggest a password guessing or brute force attack.",
                        confidence=0.85,
                        conclusion="Brute force authentication attempt detected.",
                    )
                    
                    finding = Finding(
                        case_id=UUID(case_id),
                        title="Brute Force Attack Detected: Multiple Failed Logins",
                        description=(
                            f"Multiple failed login attempts ({len(window_logs)}) were detected for user '{user}' "
                            f"on host '{host}' within a 5-minute window."
                        ),
                        severity=Severity.HIGH,
                        status=FindingStatus.SUSPECTED,
                        mitre_technique="T1110",
                        mitre_tactics=["Credential Access"],
                        evidence_refs=evidence_refs,
                        confidence_score=0.85,
                        supporting_evidence=supporting_evidence,
                        reasoning=trace,
                        detected_at=window_logs[-1].timestamp,
                        tags=["brute_force", "authentication", "auth_failure"]
                    )
                    findings.append(finding)
                    break # Only create one brute force finding per user/host pair to avoid spamming
                    
        return findings

    async def _detect_suspicious_logins(self, case_id: str, logs: List[NormalizedLog]) -> List[Finding]:
        """Rule 2: Suspicious Login (Successful off-hours authentication 11PM - 5AM)."""
        findings = []
        for log in logs:
            raw_str = str(log.raw_data).lower()
            
            is_success_login = False
            if log.event_type == "Sysmon-4624" or "4624" in raw_str:
                is_success_login = True
            elif "success" in log.event_type.lower() and "login" in log.event_type.lower():
                is_success_login = True
            elif "accepted password" in raw_str or "session opened" in raw_str:
                is_success_login = True
                
            # Filter system service logons
            if is_success_login and log.user and log.user.lower() not in ("system", "network service", "local service", "-"):
                # Check off-hours (11 PM to 5 AM)
                hour = log.timestamp.hour
                if hour >= 23 or hour < 5:
                    trace = ReasoningTrace(
                        observation=f"User '{log.user}' successfully logged in at {log.timestamp.isoformat()}.",
                        evidence=f"Successful logon record from host '{log.host}' at {log.timestamp.strftime('%H:%M:%S')}.",
                        inference="Logon activity during standard non-working hours (11 PM - 5 AM) is highly anomalous.",
                        confidence=0.6,
                        conclusion="Anomalous off-hours logon activity detected.",
                    )
                    
                    finding = Finding(
                        case_id=UUID(case_id),
                        title="Suspicious Login: Off-Hours Authentication",
                        description=(
                            f"User '{log.user}' successfully authenticated on host '{log.host}' at "
                            f"{log.timestamp.strftime('%I:%M %p')} which falls outside of typical business hours."
                        ),
                        severity=Severity.MEDIUM,
                        status=FindingStatus.SUSPECTED,
                        mitre_technique="T1078",
                        mitre_tactics=["Initial Access", "Defense Evasion"],
                        evidence_refs=[UUID(log.evidence_id)],
                        confidence_score=0.6,
                        supporting_evidence=[f"Successful logon at {log.timestamp.isoformat()} by '{log.user}'"],
                        reasoning=trace,
                        detected_at=log.timestamp,
                        tags=["anomalous_login", "authentication", "off_hours"]
                    )
                    findings.append(finding)
        return findings

    async def _detect_suspicious_processes(self, case_id: str, logs: List[NormalizedLog]) -> List[Finding]:
        """Rule 3: Unknown/Suspicious Process Execution (Shells spawned by web server or temp execution)."""
        findings = []
        for log in logs:
            if not log.process:
                continue

            proc_lower = log.process.lower()
            event_data = log.raw_data.get("event_data", {}) if isinstance(log.raw_data, dict) else {}
            
            # Extract parent image and command line
            parent = event_data.get("ParentImage") or log.raw_data.get("parent_process") or ""
            parent_lower = parent.lower()
            cmdline = event_data.get("CommandLine") or log.raw_data.get("command") or ""
            cmdline_lower = cmdline.lower()

            is_shell = "cmd.exe" in proc_lower or "powershell" in proc_lower or proc_lower in ("bash", "sh", "zsh")
            is_web_server = any(ws in parent_lower for ws in ("nginx", "apache", "httpd", "w3wp", "tomcat"))

            # Scenario A: Web shell execution (shell spawned by web server)
            if is_shell and is_web_server:
                trace = ReasoningTrace(
                    observation=f"Web server process '{parent}' spawned shell interpreter '{log.process}'.",
                    evidence=f"Process creation log on host '{log.host}' with Command Line: '{cmdline}'.",
                    inference="A web server spawning a command shell is a key indicator of web shell exploitation (e.g. Remote Code Execution).",
                    confidence=0.95,
                    conclusion="Web Shell / RCE activity detected.",
                )
                
                finding = Finding(
                    case_id=UUID(case_id),
                    title="Suspicious Shell Spawned by Web Server",
                    description=(
                        f"A command shell interpreter '{log.process}' was spawned by web server process '{parent}' "
                        f"on host '{log.host}'. Command line: '{cmdline}'."
                    ),
                    severity=Severity.CRITICAL,
                    status=FindingStatus.SUSPECTED,
                    mitre_technique="T1505.003",
                    mitre_tactics=["Persistence", "Execution"],
                    evidence_refs=[UUID(log.evidence_id)],
                    confidence_score=0.95,
                    supporting_evidence=[
                        f"Parent process: '{parent}'",
                        f"Spawned shell: '{log.process}'",
                        f"Command line: '{cmdline}'"
                    ],
                    reasoning=trace,
                    detected_at=log.timestamp,
                    tags=["web_shell", "webshell", "rce", "execution"]
                )
                findings.append(finding)
                continue # Skip checking other process rules for this log if it matches this high severity one

            # Scenario B: Temporary directory execution
            is_temp_path = any(x in proc_lower or x in cmdline_lower for x in ("\\temp\\", "/tmp/", "\\appdata\\local\\temp\\"))
            if is_temp_path and not any(s in proc_lower for s in ("update", "install", "setup")):
                trace = ReasoningTrace(
                    observation=f"Process '{log.process}' was executed from a temporary directory path.",
                    evidence=f"Process execution path: '{log.process}' on host '{log.host}'.",
                    inference="Malware often drops and executes payloads from user temporary directories to avoid detection.",
                    confidence=0.75,
                    conclusion="Suspicious executable run from temporary path.",
                )
                
                finding = Finding(
                    case_id=UUID(case_id),
                    title="Suspicious Process Executed from Temp Directory",
                    description=(
                        f"Process '{log.process}' was executed from a temporary directory path "
                        f"on host '{log.host}'. Command line: '{cmdline}'."
                    ),
                    severity=Severity.HIGH,
                    status=FindingStatus.SUSPECTED,
                    mitre_technique="T1204.002",
                    mitre_tactics=["Execution"],
                    evidence_refs=[UUID(log.evidence_id)],
                    confidence_score=0.75,
                    supporting_evidence=[f"Executed from temp: '{log.process}'", f"Command Line: '{cmdline}'"],
                    reasoning=trace,
                    detected_at=log.timestamp,
                    tags=["temp_execution", "malware_behavior", "execution"]
                )
                findings.append(finding)

        return findings

    async def _detect_external_ips(self, case_id: str, logs: List[NormalizedLog]) -> List[Finding]:
        """Rule 4: External IP Communication (Connection to a non-RFC1918 public IP)."""
        findings = []
        for log in logs:
            if not log.ip or _is_private_ip(log.ip):
                continue
                
            event_data = log.raw_data.get("event_data", {}) if isinstance(log.raw_data, dict) else {}
            event_id = log.raw_data.get("event_id") or ""
            
            # Check for network connection indicators (Sysmon Event ID 3, Zeek connection, etc.)
            is_network_event = False
            if event_id == "3" or "network" in log.event_type.lower() or "connect" in log.event_type.lower():
                is_network_event = True
            elif "DestinationPort" in event_data or "remote_port" in log.raw_data:
                is_network_event = True
                
            if is_network_event:
                dest_port = event_data.get("DestinationPort") or log.raw_data.get("remote_port") or "unknown"
                proc_name = log.process or event_data.get("Image") or "unknown"
                
                trace = ReasoningTrace(
                    observation=f"Established network connection from host '{log.host}' to public IP '{log.ip}' on port {dest_port}.",
                    evidence=f"Network connection log for process '{proc_name}' connecting to remote host {log.ip}.",
                    inference="Connecting to non-private external IP addresses might represent command & control channel, staging server, or exfiltration.",
                    confidence=0.7,
                    conclusion="Network communication to external IP address.",
                )
                
                finding = Finding(
                    case_id=UUID(case_id),
                    title="External IP Communication",
                    description=(
                        f"Process '{proc_name}' on host '{log.host}' initiated an external network "
                        f"connection to public IP address '{log.ip}' on port {dest_port}."
                    ),
                    severity=Severity.MEDIUM,
                    status=FindingStatus.SUSPECTED,
                    mitre_technique="T1071",
                    mitre_tactics=["Command and Control"],
                    evidence_refs=[UUID(log.evidence_id)],
                    confidence_score=0.7,
                    supporting_evidence=[
                        f"Remote IP: '{log.ip}'",
                        f"Port: {dest_port}",
                        f"Process name: '{proc_name}'"
                    ],
                    reasoning=trace,
                    detected_at=log.timestamp,
                    tags=["external_network", "c2_activity", "network_connection"]
                )
                findings.append(finding)
        return findings

    async def _detect_privilege_escalation(self, case_id: str, logs: List[NormalizedLog]) -> List[Finding]:
        """Rule 5: Privilege Escalation (Adding local group administrator or privilege adjustments)."""
        findings = []
        for log in logs:
            event_data = log.raw_data.get("event_data", {}) if isinstance(log.raw_data, dict) else {}
            event_id = str(log.raw_data.get("event_id") or "")
            cmdline = event_data.get("CommandLine") or log.raw_data.get("command") or ""
            cmdline_lower = cmdline.lower()

            is_priv_esc = False
            details = ""
            
            # Scenario A: Local group modifications via net.exe
            if "localgroup" in cmdline_lower and "administrators" in cmdline_lower and any(x in cmdline_lower for x in ("/add", "add")):
                is_priv_esc = True
                details = f"Command executed: '{cmdline}'"
                
            # Scenario B: Windows Security Log Event ID 4732 (Member added to security-enabled local group)
            elif event_id == "4732" or "4732" in str(log.raw_data):
                is_priv_esc = True
                member = event_data.get("MemberName") or "New user"
                details = f"Security Event 4732: {member} added to Administrators group"

            if is_priv_esc:
                trace = ReasoningTrace(
                    observation=f"Detected local group modification on host '{log.host}' pointing to administrative elevation.",
                    evidence=f"Log details: {details}.",
                    inference="Adding accounts to the local administrators group is a common technique used by attackers to gain persistence and elevate privileges.",
                    confidence=0.9,
                    conclusion="Privilege escalation group modification detected.",
                )
                
                finding = Finding(
                    case_id=UUID(case_id),
                    title="Privilege Escalation: Local Administrator Added",
                    description=(
                        f"An account membership modification was detected on host '{log.host}' "
                        f"granting administrative rights. Details: {details}."
                    ),
                    severity=Severity.HIGH,
                    status=FindingStatus.SUSPECTED,
                    mitre_technique="T1098",
                    mitre_tactics=["Privilege Escalation", "Persistence"],
                    evidence_refs=[UUID(log.evidence_id)],
                    confidence_score=0.9,
                    supporting_evidence=[details, f"Execution timestamp: {log.timestamp.isoformat()}"],
                    reasoning=trace,
                    detected_at=log.timestamp,
                    tags=["privilege_escalation", "account_manipulation", "persistence"]
                )
                findings.append(finding)
        return findings


findings_engine = FindingsEngine()
