import { useEffect, useState } from 'react';
import { Search, Eye, RefreshCw, CheckCircle2, ShieldAlert } from 'lucide-react';
import { PageHeader, SearchInput } from '../../components/shared/index';
import { GlassPanel } from '../../components/shared/GlassPanel';
import { SeverityBadge, StatusBadge } from '../../components/shared/Badges';
import { useCaseStore } from '../../stores/caseStore';
import { findingsApi, type Finding } from '../../services/api';

export default function FindingsExplorer() {
  const { selectedCaseId, cases } = useCaseStore();
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState('all');

  const loadFindings = async (caseId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await findingsApi.listForCase(caseId);
      setFindings(data);
      setSelectedFindingId(data[0]?.id ?? null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCaseId) loadFindings(selectedCaseId);
  }, [selectedCaseId]);

  const filtered = findings.filter((f) => {
    const matchesSearch =
      f.title.toLowerCase().includes(search.toLowerCase()) ||
      f.description.toLowerCase().includes(search.toLowerCase()) ||
      f.mitre_tactics.some((t) => t.toLowerCase().includes(search.toLowerCase())) ||
      (f.mitre_technique && f.mitre_technique.toLowerCase().includes(search.toLowerCase()));
    const matchesSeverity = severityFilter === 'all' || f.severity === severityFilter;
    return matchesSearch && matchesSeverity;
  });

  const selectedFinding = findings.find((f) => f.id === selectedFindingId);
  const selectedCaseName = cases.find((c) => c.id === selectedCaseId)?.title ?? 'Unknown case';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Findings Explorer"
        description="Browse, filter, and inspect verified indicators of compromise and malicious actor behaviors"
        icon={<Eye size={20} />}
      />

      {/* Case info + controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-xs text-sift-muted font-mono">
          Case: <span className="text-sift-cyan">{selectedCaseName}</span>
          {' · '}
          <span className="text-white">{findings.length} findings</span>
        </p>
        <button
          onClick={() => selectedCaseId && loadFindings(selectedCaseId)}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-sift-muted hover:text-white border border-white/10 rounded px-3 py-1.5 transition-colors"
        >
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search findings or MITRE tactics..."
          className="flex-1 min-w-48 max-w-sm"
        />
        <div className="flex items-center gap-2">
          {['all', 'critical', 'high', 'medium', 'low'].map((s) => (
            <button
              key={s}
              onClick={() => setSeverityFilter(s)}
              className={`text-[10px] font-mono px-3 py-1.5 rounded-lg border transition-all ${
                severityFilter === s
                  ? 'bg-sift-cyan/15 border-sift-cyan/40 text-sift-cyan'
                  : 'border-white/10 text-sift-muted hover:border-white/20 hover:text-white'
              }`}
            >
              {s.toUpperCase()}
            </button>
          ))}
        </div>
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
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Findings List */}
          <div className="xl:col-span-2">
            <GlassPanel className="p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-white/08 bg-white/[0.01]">
                      <th className="px-4 py-3 font-mono uppercase text-[9px] text-sift-muted tracking-widest">Title</th>
                      <th className="px-4 py-3 font-mono uppercase text-[9px] text-sift-muted tracking-widest">Severity</th>
                      <th className="px-4 py-3 font-mono uppercase text-[9px] text-sift-muted tracking-widest">MITRE</th>
                      <th className="px-4 py-3 font-mono uppercase text-[9px] text-sift-muted tracking-widest">Confidence</th>
                      <th className="px-4 py-3 font-mono uppercase text-[9px] text-sift-muted tracking-widest">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((f) => (
                      <tr
                        key={f.id}
                        onClick={() => setSelectedFindingId(f.id)}
                        className={`border-b border-white/05 cursor-pointer hover:bg-white/03 transition-colors ${
                          selectedFindingId === f.id ? 'bg-sift-cyan/05 border-l-2 border-l-sift-cyan' : ''
                        }`}
                      >
                        <td className="px-4 py-3 font-bold text-white max-w-[220px] truncate">{f.title}</td>
                        <td className="px-4 py-3"><SeverityBadge severity={f.severity as any} className="text-[9px]" /></td>
                        <td className="px-4 py-3 font-mono text-sift-cyan">{f.mitre_technique ?? 'N/A'}</td>
                        <td className="px-4 py-3 font-mono text-sift-green font-bold">
                          {Math.round(f.confidence_score * 100)}%
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge
                            status={f.status.toUpperCase()}
                            variant={f.status === 'confirmed' ? 'success' : 'warning'}
                            className="text-[8px]"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filtered.length === 0 && !loading && (
                <div className="py-20 text-center text-sift-muted font-mono text-xs">
                  {findings.length === 0 ? 'No findings for this case yet.' : 'No findings matched filters.'}
                </div>
              )}
            </GlassPanel>
          </div>

          {/* Finding Detail Panel */}
          <div>
            {selectedFinding ? (
              <GlassPanel className="p-5 space-y-5 border border-sift-cyan/15">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-mono text-sift-muted truncate max-w-[70%]">ID: {selectedFinding.id.slice(0, 16)}…</span>
                    <SeverityBadge severity={selectedFinding.severity as any} className="text-[9px]" />
                  </div>
                  <h4 className="text-sm font-bold text-white leading-snug">{selectedFinding.title}</h4>
                  <p className="text-[11px] text-sift-muted mt-1 leading-relaxed">{selectedFinding.description}</p>
                </div>

                {/* MITRE ATT&CK */}
                <div className="space-y-1.5">
                  <p className="text-[9px] font-mono text-sift-muted uppercase tracking-wider">MITRE ATT&CK Classification</p>
                  <div className="flex flex-wrap gap-2 text-[10px] font-mono">
                    {selectedFinding.mitre_technique && (
                      <span className="bg-sift-cyan/10 text-sift-cyan px-2 py-0.5 rounded border border-sift-cyan/20">
                        Tech: {selectedFinding.mitre_technique}
                      </span>
                    )}
                    {selectedFinding.mitre_tactics.map((t) => (
                      <span key={t} className="bg-white/5 text-white/70 px-2 py-0.5 rounded border border-white/10">
                        Tactic: {t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Tags */}
                {selectedFinding.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedFinding.tags.map((tag) => (
                      <span key={tag} className="text-[9px] font-mono text-white/50 bg-white/05 px-2 py-0.5 rounded border border-white/10">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Agent Reasoning Trace */}
                <div className="border-t border-white/08 pt-4 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                    <ShieldAlert size={14} className="text-sift-cyan" />
                    <span>Agent Reasoning Trace</span>
                  </div>

                  <div className="space-y-3 text-[11px] leading-relaxed">
                    {selectedFinding.reasoning.observation && (
                      <div className="p-2.5 rounded bg-white/[0.01] border border-white/05">
                        <p className="font-mono text-sift-cyan text-[9px] uppercase mb-0.5">Observation</p>
                        <p className="text-white/80">{selectedFinding.reasoning.observation}</p>
                      </div>
                    )}
                    {selectedFinding.reasoning.evidence && (
                      <div className="p-2.5 rounded bg-white/[0.01] border border-white/05">
                        <p className="font-mono text-sift-cyan text-[9px] uppercase mb-0.5">Forensic Evidence Ref</p>
                        <p className="text-white/80 font-mono text-[10px]">{selectedFinding.reasoning.evidence}</p>
                      </div>
                    )}
                    {selectedFinding.reasoning.inference && (
                      <div className="p-2.5 rounded bg-white/[0.01] border border-white/05">
                        <p className="font-mono text-sift-cyan text-[9px] uppercase mb-0.5">Logical Inference</p>
                        <p className="text-white/80">{selectedFinding.reasoning.inference}</p>
                      </div>
                    )}
                    {selectedFinding.supporting_evidence.length > 0 && (
                      <div className="p-2.5 rounded bg-white/[0.01] border border-white/05">
                        <p className="font-mono text-sift-cyan text-[9px] uppercase mb-1.5">Supporting Evidence</p>
                        <div className="space-y-1">
                          {selectedFinding.supporting_evidence.map((e, i) => (
                            <div key={i} className="flex items-start gap-1.5 text-[10px] font-mono">
                              <CheckCircle2 size={11} className="text-sift-green mt-0.5 flex-shrink-0" />
                              <p className="text-white/70">{e}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedFinding.reasoning.conclusion && (
                      <div className="p-2.5 rounded bg-sift-green/05 border border-sift-green/15 text-sift-green">
                        <p className="font-mono text-[9px] uppercase mb-0.5">Finding Conclusion</p>
                        <p>{selectedFinding.reasoning.conclusion}</p>
                      </div>
                    )}
                  </div>
                </div>
              </GlassPanel>
            ) : (
              <div className="text-center text-sift-muted font-mono text-xs py-20">
                Select a finding to inspect reasoning.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
