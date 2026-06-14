import { useEffect, useState } from 'react';
import { FileText, Printer, ShieldCheck, Download, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { PageHeader } from '../../components/shared/index';
import { GlassPanel } from '../../components/shared/GlassPanel';
import { SeverityBadge, ConfidenceBadge } from '../../components/shared/Badges';
import { useCaseStore } from '../../stores/caseStore';
import { reportsApi, findingsApi, type Finding } from '../../services/api';

interface ReportData {
  case_id: string;
  title?: string;
  generated_at?: string;
  generated_by?: string;
  executive_summary?: string;
  incident_overview?: string;
  attack_narrative?: string;
  mitre_techniques?: string[];
  recommendations?: string[];
  sections?: Array<{ title: string; content: string }>;
}

export default function FinalReport() {
  const { selectedCaseId, cases } = useCaseStore();
  const [report, setReport] = useState<ReportData | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCase = cases.find((c) => c.id === selectedCaseId);

  const fetchReport = async (caseId: string) => {
    setLoading(true);
    setError(null);
    try {
      const [reportData, findingsList] = await Promise.all([
        reportsApi.get(caseId).catch(() => null),
        findingsApi.listForCase(caseId).catch(() => []),
      ]);
      setReport(reportData as ReportData | null);
      setFindings(findingsList as Finding[]);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    if (!selectedCaseId) return;
    setGenerating(true);
    setError(null);
    try {
      await reportsApi.generate(selectedCaseId);
      await fetchReport(selectedCaseId);
    } catch (e) {
      setError(String(e));
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    if (selectedCaseId) fetchReport(selectedCaseId);
  }, [selectedCaseId]);

  const criticalCount = findings.filter((f) => f.severity === 'critical').length;
  const highCount = findings.filter((f) => f.severity === 'high').length;
  const avgConf = findings.length
    ? Math.round(findings.reduce((s, f) => s + f.confidence_score * 100, 0) / findings.length)
    : 0;

  const mitreTechniques = [...new Set(findings.map((f) => f.mitre_technique).filter(Boolean))] as string[];
  const allTactics = [...new Set(findings.flatMap((f) => f.mitre_tactics))];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <PageHeader
          title="Incident Investigation Report"
          description="SIFT compiles structured Executive Summaries, Timelines, Findings, and Remediations for compliance review"
          icon={<FileText size={20} />}
        />
        <div className="flex items-center gap-3">
          <button
            onClick={generateReport}
            disabled={generating || !selectedCaseId}
            className="px-4 py-2 border border-sift-cyan/30 bg-sift-cyan/10 hover:bg-sift-cyan/20 rounded-lg text-xs font-mono text-white transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {generating ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            {generating ? 'Generating...' : 'Generate Report'}
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 border border-white/15 hover:border-white/30 rounded-lg text-xs font-mono text-sift-muted hover:text-white transition-all flex items-center gap-2"
          >
            <Printer size={13} /> Print
          </button>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg bg-sift-danger/10 border border-sift-danger/30 text-xs text-sift-danger font-mono flex items-center gap-2">
          <AlertCircle size={13} /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-sift-cyan/40 border-t-sift-cyan animate-spin" />
        </div>
      ) : (
        <GlassPanel className="p-8 space-y-8 max-w-4xl mx-auto border border-white/10 bg-[#090e1c]/95" id="printable-area">

          {/* Document Header */}
          <div className="border-b border-white/15 pb-6 space-y-4">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="space-y-1">
                <span className="text-[9px] font-mono text-sift-muted uppercase tracking-widest block">CONFIDENTIAL // HIGH SECURITY SYSTEM</span>
                <h1 className="text-xl font-bold text-white uppercase tracking-wide">
                  {report?.title ?? `Incident Report — ${selectedCase?.title ?? 'Unknown Case'}`}
                </h1>
                <p className="text-xs text-sift-muted font-mono">
                  CASE ID: {selectedCaseId?.slice(0, 16) ?? '—'} · SIFT AUTONOMOUS FORENSICS
                </p>
              </div>
              <div className="text-right text-xs font-mono space-y-1">
                <p className="text-sift-muted">GENERATED AT</p>
                <p className="text-white">{report?.generated_at ? new Date(report.generated_at).toLocaleString() : new Date().toLocaleString()}</p>
                <p className="text-sift-muted">GENERATED BY</p>
                <p className="text-sift-cyan">{report?.generated_by ?? 'Protocol SIFT AI Engine'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {selectedCase && (
                <>
                  <span className="text-xs text-sift-muted font-mono">Severity:</span>
                  <SeverityBadge severity={selectedCase.severity as any} className="text-[9px]" />
                  <span className="text-xs text-sift-muted font-mono">Avg Confidence:</span>
                  <ConfidenceBadge score={avgConf} className="text-[9px]" />
                  <span className="text-xs text-sift-muted font-mono">Status:</span>
                  <span className="text-xs font-mono text-sift-cyan">{selectedCase.status}</span>
                </>
              )}
            </div>
          </div>

          {/* Case Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-2">
            {[
              { label: 'Total Findings', value: findings.length, color: 'text-white' },
              { label: 'Critical', value: criticalCount, color: 'text-sift-danger' },
              { label: 'High', value: highCount, color: 'text-sift-warning' },
              { label: 'Avg Confidence', value: `${avgConf}%`, color: 'text-sift-green' },
            ].map(({ label, value, color }) => (
              <div key={label} className="p-3 rounded-lg border border-white/08 bg-white/[0.01] text-center">
                <p className={`text-xl font-bold font-mono ${color}`}>{value}</p>
                <p className="text-[10px] text-sift-muted mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Executive Summary */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-white/05 pb-2">
              <ShieldCheck size={16} className="text-sift-green" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">1. Executive Summary</h3>
            </div>
            <p className="text-xs text-white/80 leading-relaxed indent-4">
              {report?.executive_summary ??
                `This report presents the findings from a Protocol SIFT autonomous forensic investigation into case "${selectedCase?.title ?? 'Unknown'}". ` +
                `The investigation identified ${findings.length} security findings across ${mitreTechniques.length} distinct MITRE ATT&CK techniques. ` +
                `${criticalCount > 0 ? `${criticalCount} critical severity finding${criticalCount > 1 ? 's' : ''} require immediate remediation.` : 'No critical findings were identified.'} ` +
                `The overall average confidence score across all findings is ${avgConf}%.`
              }
            </p>
          </div>

          {/* Findings Summary */}
          {findings.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-white/05 pb-2">
                <FileText size={16} className="text-sift-cyan" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">2. Findings Summary</h3>
              </div>
              <div className="space-y-3">
                {findings.map((f, i) => (
                  <div key={f.id} className="p-3 rounded-lg border border-white/05 bg-white/[0.01]">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-sift-muted">{i + 1}.</span>
                        <p className="text-xs font-semibold text-white">{f.title}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <SeverityBadge severity={f.severity as any} className="text-[9px]" />
                        {f.mitre_technique && (
                          <span className="text-[9px] font-mono text-sift-cyan bg-sift-cyan/10 border border-sift-cyan/20 px-2 py-0.5 rounded">
                            {f.mitre_technique}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-[11px] text-sift-muted leading-relaxed">{f.description}</p>
                    <p className="text-[10px] font-mono text-sift-green mt-1">
                      Confidence: {Math.round(f.confidence_score * 100)}%
                      {f.mitre_tactics.length > 0 && ` · Tactics: ${f.mitre_tactics.join(', ')}`}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MITRE ATT&CK Coverage */}
          {mitreTechniques.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-white/05 pb-2">
                <FileText size={16} className="text-sift-warning" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">3. MITRE ATT&CK Coverage</h3>
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {mitreTechniques.map((t) => (
                    <span key={t} className="text-[10px] font-mono text-sift-cyan bg-sift-cyan/10 border border-sift-cyan/20 px-2.5 py-1 rounded">
                      {t}
                    </span>
                  ))}
                </div>
                {allTactics.length > 0 && (
                  <p className="text-xs text-sift-muted mt-2">
                    <span className="text-white">Kill-chain tactics detected:</span>{' '}
                    {allTactics.join(' → ')}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Incident Description (from case) */}
          {selectedCase?.description && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-white/05 pb-2">
                <FileText size={16} className="text-sift-primary" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">4. Incident Overview</h3>
              </div>
              <p className="text-xs text-white/80 leading-relaxed indent-4">{selectedCase.description}</p>
            </div>
          )}

          {/* Dynamic sections from API */}
          {(report?.sections ?? []).map((sec, i) => (
            <div key={i} className="space-y-3">
              <div className="flex items-center gap-2 border-b border-white/05 pb-2">
                <FileText size={16} className="text-sift-primary" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  {i + 5}. {sec.title}
                </h3>
              </div>
              <p className="text-xs text-white/80 leading-relaxed whitespace-pre-wrap">{sec.content}</p>
            </div>
          ))}

          {/* Recommendations */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-white/05 pb-2">
              <ShieldCheck size={16} className="text-sift-green" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Remediation Recommendations</h3>
            </div>
            <div className="space-y-2 text-xs text-white/80 leading-relaxed">
              {(report?.recommendations ?? [
                'Immediately isolate all affected hosts from the network.',
                'Reset credentials for all accounts active during the compromise window.',
                'Patch web-facing services and close unnecessary external ports.',
                'Enable enhanced logging and alerting on privilege escalation events.',
                'Conduct a post-incident review and update incident response playbooks.',
              ]).map((rec, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-sift-green font-mono text-[10px] flex-shrink-0 mt-0.5">{i + 1}.</span>
                  <p>{rec}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Signature */}
          <div className="pt-12 border-t border-white/10 flex justify-between items-center text-[10px] font-mono text-sift-muted">
            <span>PROTOCOL SIFT AUTONOMOUS FORENSICS ENGINE — VALIDATED</span>
            <span>CASE: {selectedCaseId?.slice(0, 8).toUpperCase() ?? '—'}</span>
          </div>
        </GlassPanel>
      )}

      <style>{`
        @media print {
          body { background: #fff !important; color: #000 !important; }
          header, aside, button, nav { display: none !important; }
          #main-content { margin-left: 0 !important; padding: 0 !important; }
          #printable-area {
            border: none !important; background: #fff !important;
            box-shadow: none !important; color: #000 !important; padding: 0 !important;
          }
          #printable-area * { color: #000 !important; }
        }
      `}</style>
    </div>
  );
}
