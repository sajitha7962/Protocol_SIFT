import { useEffect, useState } from 'react';
import { Database, RefreshCw, ShieldCheck, Eye } from 'lucide-react';
import { GlassPanel } from '../../components/shared/GlassPanel';
import { PageHeader, SearchInput, EmptyState } from '../../components/shared/index';
import { StatusBadge } from '../../components/shared/Badges';
import { useCaseStore } from '../../stores/caseStore';
import { evidenceApi, type Evidence } from '../../services/api';
import { formatBytes, formatDateTime } from '../../lib/utils';

const TYPE_LABELS: Record<string, string> = {
  disk_image: 'Disk Image', memory_dump: 'Memory Dump', log_file: 'Log File',
  pcap: 'PCAP', siem_export: 'SIEM Export', endpoint_telemetry: 'Endpoint Telemetry',
  cloud_logs: 'Cloud Logs', json_package: 'JSON Package', windows_evtx: 'Windows EVTX',
  firewall_log: 'Firewall Log',
};

function EvidenceDetailPanel({ evidence, onClose }: { evidence: Evidence; onClose: () => void }) {
  return (
    <GlassPanel className="p-5" strong>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">Evidence Inspector</h3>
        <button onClick={onClose} className="text-sift-muted hover:text-white text-lg leading-none">×</button>
      </div>
      <div className="space-y-3 text-xs">
        <div>
          <p className="text-sift-muted font-mono uppercase mb-1">Filename</p>
          <p className="text-white font-mono">{evidence.filename}</p>
        </div>
        <div>
          <p className="text-sift-muted font-mono uppercase mb-1">SHA256 Hash</p>
          <p className="text-sift-green font-mono break-all text-[10px]">{evidence.sha256}</p>
        </div>
        <div>
          <p className="text-sift-muted font-mono uppercase mb-1">MD5 Hash</p>
          <p className="text-sift-muted font-mono text-[10px]">{evidence.md5}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><p className="text-sift-muted font-mono uppercase mb-1">Size</p><p className="text-white">{formatBytes(evidence.size_bytes)}</p></div>
          <div><p className="text-sift-muted font-mono uppercase mb-1">Type</p><p className="text-white">{TYPE_LABELS[evidence.type] ?? evidence.type}</p></div>
          <div><p className="text-sift-muted font-mono uppercase mb-1">Source</p><p className="text-white">{evidence.source}</p></div>
          <div><p className="text-sift-muted font-mono uppercase mb-1">Status</p><StatusBadge status={evidence.status.toUpperCase()} variant={evidence.status === 'verified' ? 'success' : 'info'} /></div>
        </div>
        {evidence.uploaded_at && (
          <div>
            <p className="text-sift-muted font-mono uppercase mb-1">Uploaded</p>
            <p className="text-white font-mono text-[10px]">{formatDateTime(evidence.uploaded_at)}</p>
          </div>
        )}
        {evidence.verified_at && (
          <div>
            <p className="text-sift-muted font-mono uppercase mb-1">Verified At</p>
            <p className="text-sift-green font-mono text-[10px]">{formatDateTime(evidence.verified_at)}</p>
          </div>
        )}

        {/* Chain of Custody */}
        {evidence.custody_chain.length > 0 && (
          <div>
            <p className="text-sift-muted font-mono uppercase mb-2">Chain of Custody</p>
            <div className="space-y-2">
              {evidence.custody_chain.map((e, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div className="w-1.5 h-1.5 rounded-full bg-sift-cyan mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="text-white">{e.action} – <span className="text-sift-muted">{e.actor}</span></p>
                    {e.timestamp && <p className="text-sift-muted font-mono text-[10px]">{formatDateTime(e.timestamp)}</p>}
                    {e.notes && <p className="text-sift-muted text-[10px] italic">{e.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Metadata */}
        {Object.keys(evidence.metadata ?? {}).length > 0 && (
          <div>
            <p className="text-sift-muted font-mono uppercase mb-2">Metadata</p>
            <div className="bg-[#050814] rounded p-2 text-[10px] font-mono max-h-24 overflow-auto">
              {Object.entries(evidence.metadata).map(([k, v]) => (
                <p key={k}><span className="text-sift-cyan">{k}:</span> {String(v)}</p>
              ))}
            </div>
          </div>
        )}
      </div>
    </GlassPanel>
  );
}

export default function EvidenceSources() {
  const { selectedCaseId, cases } = useCaseStore();
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<Evidence | null>(null);

  const loadEvidence = async (caseId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await evidenceApi.listForCase(caseId);
      setEvidence(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCaseId) loadEvidence(selectedCaseId);
  }, [selectedCaseId]);

  const filtered = evidence.filter((e) => {
    const matchSearch =
      e.filename.toLowerCase().includes(search.toLowerCase()) ||
      e.source.toLowerCase().includes(search.toLowerCase()) ||
      e.type.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || e.type === filter || e.status === filter;
    return matchSearch && matchFilter;
  });

  const selectedCaseName = cases.find((c) => c.id === selectedCaseId)?.title ?? 'Unknown case';

  return (
    <div className="space-y-5">
      <PageHeader
        title="Evidence Sources"
        description="Browse and inspect all forensic evidence collected, with full chain of custody audit trail"
        icon={<Database size={20} />}
      />

      {/* Case / refresh bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-xs text-sift-muted font-mono">
          Case: <span className="text-sift-cyan">{selectedCaseName}</span>
          {' · '}
          <span className="text-white">{evidence.length} evidence item{evidence.length !== 1 ? 's' : ''}</span>
        </p>
        <button
          onClick={() => selectedCaseId && loadEvidence(selectedCaseId)}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-sift-muted hover:text-white border border-white/10 rounded px-3 py-1.5 transition-colors"
        >
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by filename or source..." className="flex-1 min-w-48 max-w-sm" />
        <div className="flex items-center gap-2">
          {['all', 'verified', 'pending', 'analyzing', 'processed'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs font-mono px-3 py-1.5 rounded-lg border transition-colors ${
                filter === f
                  ? 'bg-sift-cyan/15 border-sift-cyan/40 text-sift-cyan'
                  : 'border-white/15 text-sift-muted hover:border-white/30 hover:text-white'
              }`}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg bg-sift-danger/10 border border-sift-danger/30 text-xs text-sift-danger font-mono">
          {error}
        </div>
      )}

      <div className={`grid gap-5 ${selected ? 'xl:grid-cols-3' : 'grid-cols-1'}`}>
        <div className={selected ? 'xl:col-span-2' : ''}>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 rounded-full border-2 border-sift-cyan/40 border-t-sift-cyan animate-spin" />
            </div>
          ) : (
            <GlassPanel>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/08">
                      {['Evidence', 'Type', 'Source', 'Size', 'SHA256', 'Status', 'Uploaded'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left font-mono uppercase tracking-widest text-sift-muted text-[10px]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((ev) => (
                      <tr
                        key={ev.id}
                        onClick={() => setSelected(ev === selected ? null : ev)}
                        className={`border-b border-white/05 last:border-0 cursor-pointer hover:bg-white/03 transition-colors ${selected?.id === ev.id ? 'bg-sift-cyan/05' : ''}`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Database size={13} className="text-sift-cyan flex-shrink-0" />
                            <span className="text-white font-medium max-w-[140px] truncate">{ev.filename}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sift-muted whitespace-nowrap">{TYPE_LABELS[ev.type] ?? ev.type}</td>
                        <td className="px-4 py-3 font-mono text-sift-muted">{ev.source}</td>
                        <td className="px-4 py-3 font-mono text-white whitespace-nowrap">{formatBytes(ev.size_bytes)}</td>
                        <td className="px-4 py-3 font-mono text-sift-green text-[10px]">{ev.sha256.slice(0, 16)}…</td>
                        <td className="px-4 py-3">
                          <StatusBadge
                            status={ev.status.toUpperCase()}
                            variant={ev.status === 'verified' || ev.status === 'processed' ? 'success' : ev.status === 'analyzing' ? 'warning' : 'info'}
                            pulse={ev.status === 'analyzing'}
                          />
                        </td>
                        <td className="px-4 py-3 font-mono text-sift-muted whitespace-nowrap">
                          {ev.uploaded_at ? new Date(ev.uploaded_at).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filtered.length === 0 && (
                <EmptyState icon={<Database size={24} />} title="No evidence found" description="Upload evidence via New Case Intake, or adjust your filters." />
              )}
            </GlassPanel>
          )}
        </div>

        {selected && (
          <EvidenceDetailPanel evidence={selected} onClose={() => setSelected(null)} />
        )}
      </div>
    </div>
  );
}
