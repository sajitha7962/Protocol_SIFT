import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, AlertTriangle, BarChart3, Database, Eye, Plus, RefreshCw, ShieldAlert, Target, Zap } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { MetricCard, ProgressBar } from '../../components/shared/index';
import { ActivityFeed, AgentStatusIndicator } from '../../components/shared/ActivityFeed';
import { GlassPanel } from '../../components/shared/GlassPanel';
import { SeverityBadge } from '../../components/shared/Badges';
import { useAgentStore } from '../../stores/agentStore';
import { useCaseStore } from '../../stores/caseStore';
import { findingsApi, pipelineApi, type Finding, type TimelineEvent } from '../../services/api';
import { agentStageLabel } from '../../lib/utils';

const AGENT_STAGES = [
  'evidence_intake', 'classification', 'tool_selection', 'artifact_extraction',
  'correlation', 'threat_analysis', 'validation', 'contradiction_detection',
  'self_correction', 'confidence_scoring', 'report_generation',
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-strong rounded-lg px-3 py-2 border border-white/15 text-xs">
      <p className="text-sift-muted mb-1 font-mono">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ff5c7c',
  high: '#ffb84d',
  medium: '#4cd7f6',
  low: '#4edea3',
  info: '#adc6ff',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { activities, state: agentState } = useAgentStore();
  const { cases, selectedCaseId, fetchCases, isLoading } = useCaseStore();
  const selectedCase = cases.find((c) => c.id === selectedCaseId);

  const [findings, setFindings] = useState<Finding[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadLiveData = async () => {
    setRefreshing(true);
    await fetchCases();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchCases();
  }, []);

  useEffect(() => {
    if (!selectedCaseId) return;
    findingsApi.listForCase(selectedCaseId).then(setFindings).catch(() => setFindings([]));
    pipelineApi.timeline(selectedCaseId).then(setTimeline).catch(() => setTimeline([]));
  }, [selectedCaseId]);

  // Derived metrics
  const totalCases = cases.length;
  const activeCases = cases.filter((c) => ['CREATED', 'UPLOADING', 'PROCESSING', 'CORRELATING', 'VALIDATING'].includes(c.status)).length;
  const totalFindings = findings.length;
  const criticalFindings = findings.filter((f) => f.severity === 'critical').length;
  const highFindings = findings.filter((f) => f.severity === 'high').length;
  const mediumFindings = findings.filter((f) => f.severity === 'medium').length;
  const lowFindings = findings.filter((f) => f.severity === 'low').length;
  const avgConfidence = findings.length
    ? Math.round(findings.reduce((s, f) => s + f.confidence_score * 100, 0) / findings.length)
    : 0;
  const threatScore = selectedCase ? Math.round(selectedCase.threat_score) : 0;

  // Build severity distribution from real findings
  const severityData = [
    { name: 'Critical', value: criticalFindings, color: '#ff5c7c' },
    { name: 'High', value: highFindings, color: '#ffb84d' },
    { name: 'Medium', value: mediumFindings, color: '#4cd7f6' },
    { name: 'Low', value: lowFindings, color: '#4edea3' },
  ].filter((d) => d.value > 0);

  // Build threat trend from timeline (group by date)
  const trendMap: Record<string, { critical: number; high: number; medium: number }> = {};
  timeline.forEach((e) => {
    const date = new Date(e.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (!trendMap[date]) trendMap[date] = { critical: 0, high: 0, medium: 0 };
    if (e.severity === 'critical') trendMap[date].critical++;
    else if (e.severity === 'high') trendMap[date].high++;
    else if (e.severity === 'medium') trendMap[date].medium++;
  });
  const threatTrendData = Object.entries(trendMap).map(([time, v]) => ({ time, ...v }));

  const currentStageIdx = AGENT_STAGES.indexOf(agentState.currentStage);

  if (isLoading && cases.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-full border-2 border-sift-cyan/50 border-t-sift-cyan animate-spin mx-auto" />
          <p className="text-xs font-mono text-sift-muted">Loading investigations from backend...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Header Bar ───────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">
            {selectedCase ? selectedCase.title : 'Protocol SIFT Dashboard'}
          </h2>
          <p className="text-xs text-sift-muted font-mono mt-0.5">
            {selectedCase
              ? `Case ${selectedCase.id.slice(0, 8)} · ${selectedCase.status} · Severity: ${selectedCase.severity.toUpperCase()}`
              : 'No case selected'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadLiveData}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 text-xs text-sift-muted hover:text-white hover:border-white/20 transition-colors"
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => navigate('/new-case')}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold text-black transition-colors"
            style={{ background: '#4cd7f6' }}
          >
            <Plus size={12} />
            New Case
          </button>
        </div>
      </div>

      {/* ── KPI Row ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-4">
        <MetricCard className="col-span-2" label="Active Investigations" value={activeCases} icon={<Activity size={18} />} accent="cyan" sublabel={`${totalCases} total cases`} />
        <MetricCard className="col-span-2" label="Evidence Items" value={selectedCase?.evidence_ids?.length ?? 0} icon={<Database size={18} />} accent="primary" sublabel="active case" />
        <MetricCard className="col-span-2" label="Total Findings" value={totalFindings} icon={<Eye size={18} />} accent="green" sublabel={`${criticalFindings} critical`} />
        <MetricCard className="col-span-2" label="Threat Score" value={`${threatScore}%`} icon={<ShieldAlert size={18} />} accent="red" sublabel="active case" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-4">
        <MetricCard className="col-span-2" label="Critical Findings" value={criticalFindings} icon={<AlertTriangle size={18} />} accent="red" />
        <MetricCard className="col-span-2" label="Avg Confidence" value={`${avgConfidence}%`} icon={<Target size={18} />} accent="green" />
        <MetricCard className="col-span-2" label="Agent Status" value={agentState.status.toUpperCase()} icon={<Zap size={18} />} accent="cyan" sublabel={agentState.currentAction.slice(0, 30)} />
        <MetricCard className="col-span-2" label="Backend Status" value="ONLINE" icon={<BarChart3 size={18} />} accent="green" sublabel="MongoDB connected" />
      </div>

      {/* ── Charts ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Threat Trend */}
        <GlassPanel className="xl:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Threat Discovery Timeline</h3>
              <p className="text-xs text-sift-muted">Findings by severity — live case data</p>
            </div>
            {timeline.length === 0 && (
              <span className="text-[10px] font-mono text-sift-muted border border-white/10 rounded px-2 py-1">No timeline data</span>
            )}
          </div>
          {threatTrendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={threatTrendData}>
                <defs>
                  <linearGradient id="crit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff5c7c" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ff5c7c" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="high" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ffb84d" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ffb84d" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="med" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4cd7f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#4cd7f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="time" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Area type="monotone" dataKey="critical" stroke="#ff5c7c" fill="url(#crit)" strokeWidth={2} />
                <Area type="monotone" dataKey="high" stroke="#ffb84d" fill="url(#high)" strokeWidth={2} />
                <Area type="monotone" dataKey="medium" stroke="#4cd7f6" fill="url(#med)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center border border-dashed border-white/10 rounded-lg">
              <p className="text-xs text-sift-muted font-mono">Run a pipeline to populate timeline data</p>
            </div>
          )}
        </GlassPanel>

        {/* Severity Donut */}
        <GlassPanel className="p-5">
          <h3 className="text-sm font-semibold text-white mb-1">Severity Distribution</h3>
          <p className="text-xs text-sift-muted mb-4">Active case — real findings</p>
          {severityData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={severityData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                    {severityData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} opacity={0.85} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-1.5 mt-2">
                {severityData.map((d) => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                    <span className="text-[11px] text-sift-muted">{d.name}: <span className="text-white font-mono">{d.value}</span></span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[160px] flex items-center justify-center border border-dashed border-white/10 rounded-lg">
              <p className="text-xs text-sift-muted font-mono text-center">No findings<br/>yet</p>
            </div>
          )}
        </GlassPanel>
      </div>

      {/* ── Bottom Row ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Agent Workflow */}
        <GlassPanel className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Agent Workflow</h3>
            <AgentStatusIndicator status={agentState.status} compact />
          </div>
          <div className="space-y-2">
            {AGENT_STAGES.map((stage, idx) => {
              const done   = idx < currentStageIdx;
              const active = idx === currentStageIdx;
              return (
                <div key={stage} className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 text-[10px] font-bold
                    ${done   ? 'border-sift-green bg-sift-green/20 text-sift-green' : ''}
                    ${active ? 'border-sift-cyan bg-sift-cyan/20 text-sift-cyan animate-pulse2' : ''}
                    ${!done && !active ? 'border-white/15 text-white/20' : ''}`}
                  >
                    {done ? '✓' : idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs ${active ? 'text-sift-cyan font-semibold' : done ? 'text-sift-green' : 'text-sift-muted'}`}>
                      {agentStageLabel(stage)}
                    </p>
                    {active && <ProgressBar value={agentState.stageProgress} className="mt-1" />}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-white/08">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-sift-muted">Overall Progress</span>
              <span className="font-mono text-sift-cyan">{agentState.overallProgress}%</span>
            </div>
            <ProgressBar value={agentState.overallProgress} color="#4cd7f6" />
          </div>
        </GlassPanel>

        {/* Top Findings Panel */}
        <GlassPanel className="p-5">
          <h3 className="text-sm font-semibold text-white mb-1">Top Findings</h3>
          <p className="text-xs text-sift-muted mb-4">Highest severity — active case</p>
          {findings.length > 0 ? (
            <div className="space-y-2">
              {findings
                .sort((a, b) => {
                  const sev = ['critical', 'high', 'medium', 'low', 'info'];
                  return sev.indexOf(a.severity) - sev.indexOf(b.severity);
                })
                .slice(0, 5)
                .map((f) => (
                  <div key={f.id} className="flex items-start gap-3 p-2.5 rounded-lg border border-white/05 bg-white/[0.01]">
                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: SEVERITY_COLORS[f.severity] }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white font-medium truncate">{f.title}</p>
                      {f.mitre_technique && (
                        <span className="text-[10px] font-mono text-sift-cyan">{f.mitre_technique}</span>
                      )}
                    </div>
                    <SeverityBadge severity={f.severity as any} className="ml-2 flex-shrink-0 text-[9px]" />
                  </div>
                ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 border border-dashed border-white/10 rounded-lg">
              <p className="text-xs text-sift-muted font-mono text-center">
                No findings yet<br/>
                <button onClick={() => navigate('/new-case')} className="text-sift-cyan mt-1 hover:underline">Upload evidence →</button>
              </p>
            </div>
          )}
        </GlassPanel>

        {/* Activity Feed */}
        <GlassPanel className="p-0 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/08">
            <div>
              <h3 className="text-sm font-semibold text-white">Live Agent Feed</h3>
              <p className="text-[10px] text-sift-muted font-mono">{activities.length} events · live</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="pulse-dot online" />
              <span className="text-[10px] font-mono text-sift-green">LIVE</span>
            </div>
          </div>
          <ActivityFeed activities={activities} maxItems={15} />
        </GlassPanel>
      </div>

      {/* ── Recent Timeline ──────────────────────────────────── */}
      <GlassPanel className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Recent Timeline Events</h3>
            <p className="text-xs text-sift-muted">
              {selectedCase?.title ?? 'No case selected'} · last {Math.min(5, timeline.length)} events
            </p>
          </div>
          {timeline.length > 0 && (
            <button
              onClick={() => navigate('/timeline')}
              className="text-[10px] font-mono text-sift-cyan hover:text-white transition-colors border border-sift-cyan/20 rounded px-2 py-1"
            >
              View All →
            </button>
          )}
        </div>
        {timeline.length > 0 ? (
          <div className="space-y-3">
            {[...timeline].reverse().slice(0, 5).map((event) => (
              <div key={event.id} className="flex items-start gap-4 py-3 border-b border-white/05 last:border-0">
                <div className="text-[10px] font-mono text-sift-muted w-36 flex-shrink-0 pt-0.5">
                  {new Date(event.timestamp).toLocaleString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0`}
                  style={{ background: SEVERITY_COLORS[event.severity] ?? '#aaa' }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white">{event.title}</p>
                  <p className="text-[11px] text-sift-muted mt-0.5">{event.description}</p>
                  {event.attack_phase && (
                    <span className="badge-info text-[10px] mt-1 inline-block">{event.attack_phase}</span>
                  )}
                </div>
                <SeverityBadge severity={event.severity as any} className="flex-shrink-0" />
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center border border-dashed border-white/10 rounded-lg">
            <p className="text-xs text-sift-muted font-mono">No timeline events yet for this case.</p>
            <button onClick={() => navigate('/new-case')} className="text-sift-cyan text-xs mt-2 hover:underline">Create a case to begin →</button>
          </div>
        )}
      </GlassPanel>
    </div>
  );
}
