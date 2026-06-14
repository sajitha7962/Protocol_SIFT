import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw, HelpCircle, Shield } from 'lucide-react';
import { PageHeader } from '../../components/shared/index';
import { GlassPanel } from '../../components/shared/GlassPanel';
import { SeverityBadge, StatusBadge } from '../../components/shared/Badges';
import { useCaseStore } from '../../stores/caseStore';
import { reportsApi } from '../../services/api';

interface Contradiction {
  id?: string;
  type?: string;
  description?: string;
  severity?: string;
  status?: string;
  evidence_a?: string;
  evidence_b?: string;
  resolution?: string;
  detected_at?: string;
  resolved_at?: string;
}

export default function ContradictionDetector() {
  const { selectedCaseId, cases } = useCaseStore();
  const [contradictions, setContradictions] = useState<Contradiction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadContradictions = async (caseId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await reportsApi.getContradictions(caseId);
      setContradictions(data.contradictions as Contradiction[]);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCaseId) loadContradictions(selectedCaseId);
  }, [selectedCaseId]);

  const selectedCaseName = cases.find((c) => c.id === selectedCaseId)?.title ?? 'Unknown case';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contradiction Detector"
        description="SIFT autonomously audits forensic evidence layers to isolate and flag conflicting or inconsistent findings"
        icon={<AlertTriangle size={20} />}
      />

      {/* Case / refresh bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-xs text-sift-muted font-mono">
          Case: <span className="text-sift-cyan">{selectedCaseName}</span>
          {' · '}
          <span className="text-white">{contradictions.length} contradiction{contradictions.length !== 1 ? 's' : ''} found</span>
        </p>
        <button
          onClick={() => selectedCaseId && loadContradictions(selectedCaseId)}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-sift-muted hover:text-white border border-white/10 rounded px-3 py-1.5 transition-colors"
        >
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
          Re-Scan
        </button>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg bg-sift-danger/10 border border-sift-danger/30 text-xs text-sift-danger font-mono">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-sift-cyan/40 border-t-sift-cyan animate-spin" />
        </div>
      ) : contradictions.length === 0 ? (
        /* No contradictions — clean bill */
        <GlassPanel className="p-12 text-center border border-sift-green/20 bg-sift-green/02">
          <div className="flex items-center justify-center mb-4">
            <div className="p-4 rounded-2xl bg-sift-green/10 border border-sift-green/20">
              <Shield size={36} className="text-sift-green" />
            </div>
          </div>
          <h3 className="text-lg font-bold text-white mb-2">No Contradictions Detected</h3>
          <p className="text-xs text-sift-muted font-mono max-w-md mx-auto">
            The SIFT autonomous validation engine found no conflicting evidence across all findings for this case.
            The investigation is internally consistent.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <CheckCircle2 size={14} className="text-sift-green" />
            <span className="text-xs text-sift-green font-mono">ALL FINDINGS VALIDATED — NO CONFLICTS</span>
          </div>
        </GlassPanel>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {contradictions.map((con, idx) => {
            const isResolved = con.status === 'resolved';
            return (
              <GlassPanel
                key={con.id ?? idx}
                className={`p-5 border transition-all ${
                  isResolved
                    ? 'border-sift-green/20 bg-sift-green/02 opacity-75'
                    : 'border-sift-danger/20'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/08 pb-3 mb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono text-sift-muted">ID: {con.id ?? `CTR-${idx + 1}`}</span>
                      {con.severity && <SeverityBadge severity={con.severity as any} className="text-[9px]" />}
                    </div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                      Type: {(con.type ?? 'unknown').replace(/_/g, ' ')}
                    </h4>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge
                      status={(con.status ?? 'open').toUpperCase()}
                      variant={isResolved ? 'success' : 'danger'}
                      className="text-[9px]"
                    />
                    {!isResolved && (
                      <button
                        onClick={() =>
                          setContradictions((prev) =>
                            prev.map((c, i) =>
                              i === idx ? { ...c, status: 'resolved', resolved_at: new Date().toISOString() } : c
                            )
                          )
                        }
                        className="px-3 py-1.5 border border-white/10 hover:border-sift-green/30 bg-white/5 hover:bg-sift-green/10 rounded-lg text-[10px] font-mono text-white transition-all flex items-center gap-1.5"
                      >
                        <CheckCircle2 size={11} className="text-sift-green" /> RESOLVE
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                  <div className="space-y-4">
                    <div>
                      <h5 className="font-semibold text-white mb-1">Discrepancy Details</h5>
                      <p className="text-sift-muted leading-relaxed">{con.description ?? 'No description available.'}</p>
                    </div>
                    {(con.evidence_a || con.evidence_b) && (
                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="p-2.5 border border-white/05 rounded bg-white/[0.01]">
                          <p className="text-[9px] font-mono text-sift-muted uppercase">Evidence A</p>
                          <p className="text-white font-mono truncate mt-0.5" title={con.evidence_a}>{con.evidence_a}</p>
                        </div>
                        <div className="p-2.5 border border-white/05 rounded bg-white/[0.01]">
                          <p className="text-[9px] font-mono text-sift-muted uppercase">Evidence B</p>
                          <p className="text-white font-mono truncate mt-0.5" title={con.evidence_b}>{con.evidence_b}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-4 rounded-lg bg-[#050814]/50 border border-white/05 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-sift-cyan">
                        <HelpCircle size={13} />
                        <span>SIFT Resolution Strategy</span>
                      </div>
                      <p className="text-white/80 leading-relaxed italic">
                        {con.resolution ?? 'Awaiting additional correlation factors...'}
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-white/05 text-[10px] font-mono text-sift-muted flex justify-between">
                      {con.detected_at && <span>Detected: {new Date(con.detected_at).toLocaleString()}</span>}
                      {con.resolved_at && <span className="text-sift-green">Resolved: {new Date(con.resolved_at).toLocaleString()}</span>}
                    </div>
                  </div>
                </div>
              </GlassPanel>
            );
          })}
        </div>
      )}
    </div>
  );
}
