import { useEffect, useState } from 'react';
import { Clock, RefreshCw, Filter } from 'lucide-react';
import { PageHeader, SearchInput } from '../../components/shared/index';
import { GlassPanel } from '../../components/shared/GlassPanel';
import { SeverityBadge } from '../../components/shared/Badges';
import { useCaseStore } from '../../stores/caseStore';
import { pipelineApi, type TimelineEvent } from '../../services/api';

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ff5c7c',
  high: '#ffb84d',
  medium: '#4cd7f6',
  low: '#4edea3',
  info: '#adc6ff',
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  Finding: '#ff5c7c',
  FailedPassword: '#ffb84d',
  'Sysmon-1': '#4cd7f6',
  'Sysmon-3': '#4edea3',
};

export default function InvestigationTimeline() {
  const { selectedCaseId, cases } = useCaseStore();
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const loadTimeline = async (caseId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await pipelineApi.timeline(caseId);
      setTimeline(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCaseId) loadTimeline(selectedCaseId);
  }, [selectedCaseId]);

  const eventTypes = ['all', ...Array.from(new Set(timeline.map((e) => e.event_type)))];

  const filtered = timeline.filter((event) => {
    const matchesSearch =
      event.title.toLowerCase().includes(search.toLowerCase()) ||
      event.description.toLowerCase().includes(search.toLowerCase()) ||
      (event.attack_phase && event.attack_phase.toLowerCase().includes(search.toLowerCase())) ||
      (event.actor && event.actor.toLowerCase().includes(search.toLowerCase()));
    const matchesSeverity = severityFilter === 'all' || event.severity === severityFilter;
    const matchesType = typeFilter === 'all' || event.event_type === typeFilter;
    return matchesSearch && matchesSeverity && matchesType;
  });

  const selectedCaseName = cases.find((c) => c.id === selectedCaseId)?.title ?? 'Unknown case';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Investigation Timeline"
        description="Chronological audit trail of compromised activities and threat traces reconstructed from evidence"
        icon={<Clock size={20} />}
      />

      {/* Case info */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-xs text-sift-muted font-mono">
          Case: <span className="text-sift-cyan">{selectedCaseName}</span>
          {' · '}
          <span className="text-white">{timeline.length} events</span>
          {' · '}
          <span className="text-sift-muted">{filtered.length} visible</span>
        </p>
        <button
          onClick={() => selectedCaseId && loadTimeline(selectedCaseId)}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-sift-muted hover:text-white border border-white/10 rounded px-3 py-1.5 transition-colors"
        >
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search events, actors, attack phases..."
          className="flex-1 min-w-48 max-w-sm"
        />
        <div className="flex items-center gap-2 flex-wrap">
          {['all', 'critical', 'high', 'medium', 'low'].map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`text-[10px] font-mono px-3 py-1.5 rounded-lg border transition-all ${
                severityFilter === sev
                  ? 'bg-sift-cyan/15 border-sift-cyan/40 text-sift-cyan'
                  : 'border-white/10 text-sift-muted hover:border-white/20 hover:text-white'
              }`}
            >
              {sev.toUpperCase()}
            </button>
          ))}
        </div>
        {eventTypes.length > 2 && (
          <div className="flex items-center gap-1.5">
            <Filter size={11} className="text-sift-muted" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="sift-input py-1 text-[10px] font-mono"
            >
              {eventTypes.map((t) => (
                <option key={t} value={t}>{t === 'all' ? 'All Types' : t}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg bg-sift-danger/10 border border-sift-danger/30 text-xs text-sift-danger font-mono">
          {error}
        </div>
      )}

      <GlassPanel className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-sift-cyan/40 border-t-sift-cyan animate-spin" />
          </div>
        ) : (
          <div className="max-w-3xl mx-auto relative">
            {/* Vertical line */}
            {filtered.length > 0 && (
              <div className="absolute left-[7px] top-4 bottom-4 w-px bg-white/10" />
            )}
            <div className="space-y-0">
              {filtered.map((event, idx) => {
                const isFinding = event.event_type === 'Finding';
                const dotColor = SEVERITY_COLORS[event.severity] ?? '#aaa';
                const typeColor = EVENT_TYPE_COLORS[event.event_type] ?? '#94a3b8';

                return (
                  <div key={event.id} className="flex items-start gap-4 py-4 relative">
                    {/* Timeline dot */}
                    <div
                      className="w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 mt-0.5 z-10"
                      style={{
                        borderColor: dotColor,
                        background: isFinding ? dotColor : 'rgba(9,14,28,0.95)',
                        boxShadow: isFinding ? `0 0 8px ${dotColor}60` : 'none',
                      }}
                    />

                    {/* Content */}
                    <div className={`flex-1 min-w-0 p-3 rounded-lg border transition-all ${
                      isFinding
                        ? 'border-sift-danger/20 bg-sift-danger/03'
                        : 'border-white/05 bg-white/[0.01]'
                    }`}>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="text-[9px] font-mono px-1.5 py-0.5 rounded border"
                            style={{ color: typeColor, borderColor: `${typeColor}40`, background: `${typeColor}10` }}
                          >
                            {event.event_type}
                          </span>
                          {event.attack_phase && (
                            <span className="badge-info text-[9px]">{event.attack_phase}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <SeverityBadge severity={event.severity as any} className="text-[9px]" />
                          <span className="text-[10px] font-mono text-sift-muted whitespace-nowrap">
                            {new Date(event.timestamp).toLocaleString('en-US', {
                              month: 'short', day: '2-digit',
                              hour: '2-digit', minute: '2-digit', second: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs font-semibold text-white mb-0.5">{event.title}</p>
                      <p className="text-[11px] text-sift-muted leading-relaxed">{event.description}</p>

                      {(event.source_host || event.dest_host || event.actor) && (
                        <div className="flex items-center gap-4 mt-2 text-[10px] font-mono">
                          {event.source_host && (
                            <span className="text-white/50">Src: <span className="text-sift-cyan">{event.source_host}</span></span>
                          )}
                          {event.dest_host && (
                            <span className="text-white/50">Dst: <span className="text-sift-warning">{event.dest_host}</span></span>
                          )}
                          {event.actor && !event.source_host && (
                            <span className="text-white/50">Actor: <span className="text-sift-green">{event.actor.slice(0, 50)}</span></span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {filtered.length === 0 && (
                <div className="text-center py-20 text-sift-muted font-mono text-xs">
                  {timeline.length === 0
                    ? 'No timeline events for this case. Upload evidence and run the pipeline.'
                    : 'No events matched the current filters.'}
                </div>
              )}
            </div>
          </div>
        )}
      </GlassPanel>
    </div>
  );
}
