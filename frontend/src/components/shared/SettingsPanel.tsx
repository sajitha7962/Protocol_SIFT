import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Monitor, Bell, Globe, Info, ChevronRight, User,
  Moon, Sun, Zap, Shield, Database, RefreshCw, Key
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

type Tab = 'profile' | 'appearance' | 'notifications' | 'backend' | 'about';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'profile',       label: 'Profile',       icon: <User size={14} /> },
  { id: 'appearance',    label: 'Appearance',    icon: <Monitor size={14} /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell size={14} /> },
  { id: 'backend',       label: 'Backend / API', icon: <Globe size={14} /> },
  { id: 'about',         label: 'About',         icon: <Info size={14} /> },
];

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        'relative w-9 h-5 rounded-full transition-colors duration-200 flex-shrink-0',
        enabled ? 'bg-[#4cd7f6]' : 'bg-white/15'
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200',
          enabled ? 'translate-x-4' : 'translate-x-0.5'
        )}
      />
    </button>
  );
}

function Row({
  label, description, children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-white/06">
      <div className="min-w-0">
        <p className="text-xs font-medium text-white">{label}</p>
        {description && <p className="text-[11px] text-white/40 mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3 mt-5 first:mt-0">
      <span className="text-[#4cd7f6]">{icon}</span>
      <p className="text-[10px] font-mono uppercase tracking-widest text-white/40">{title}</p>
    </div>
  );
}

export function SettingsPanel({ open, onClose, defaultTab = 'appearance' }: SettingsPanelProps & { defaultTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(defaultTab);

  useEffect(() => {
    if (open) setTab(defaultTab);
  }, [open, defaultTab]);

  // Pref state
  const [theme, setTheme] = useState<'dark' | 'darker'>('dark');
  const [accentColor, setAccentColor] = useState<'cyan' | 'green' | 'purple'>('cyan');
  const [compactMode, setCompactMode] = useState(false);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [notifSound, setNotifSound] = useState(false);
  const [notifDesktop, setNotifDesktop] = useState(true);
  const [notifCriticalOnly, setNotifCriticalOnly] = useState(false);
  const [apiUrl, setApiUrl] = useState('http://127.0.0.1:8000');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState('30');

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const ACCENTS = [
    { id: 'cyan',   color: '#4cd7f6', label: 'Cyan' },
    { id: 'green',  color: '#4edea3', label: 'Green' },
    { id: 'purple', color: '#a78bfa', label: 'Purple' },
  ] as const;

  return createPortal(
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          'fixed top-0 right-0 h-full z-50 flex flex-col transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
        style={{ width: '500px', background: '#000000', borderLeft: '1px solid rgba(255,255,255,0.12)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Shield size={15} className="text-[#4cd7f6]" />
            <p className="text-sm font-semibold text-white">Settings</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content area with vertical tabs */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* Vertical Tab bar */}
          <div className="w-32 flex flex-col border-r border-white/10 flex-shrink-0 bg-white/[0.02]">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-xs font-mono transition-colors text-left border-l-2',
                  tab === t.id
                    ? 'text-[#4cd7f6] border-[#4cd7f6] bg-[#4cd7f6]/5'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/5 border-transparent'
                )}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto px-5 py-4">

            {/* ── PROFILE ── */}
            {tab === 'profile' && (
              <>
                <SectionHeader icon={<User size={13} />} title="Account Details" />
                <div className="flex items-center gap-4 mb-5 p-3 rounded-lg border border-white/08" style={{ background: '#0a0a0a' }}>
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#4cd7f6]/50 to-[#4edea3]/30 border border-white/20 flex items-center justify-center text-lg font-bold text-white">
                    SC
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Security Chief</p>
                    <p className="text-xs font-mono text-sift-muted">admin@protocolsift.io</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium text-black bg-[#4edea3]">
                      Administrator
                    </span>
                  </div>
                </div>

                <Row label="Change Password" description="Update your login credentials">
                  <button className="px-3 py-1.5 rounded-lg border border-white/10 text-xs text-white/70 hover:text-white hover:bg-white/05 transition-colors">
                    Update
                  </button>
                </Row>
                
                <SectionHeader icon={<Key size={13} />} title="API Keys" />
                <Row label="SIFT-Agent Key" description="Agent orchestration token">
                  <button className="px-3 py-1.5 rounded-lg border border-white/10 text-xs text-white/70 hover:text-white hover:bg-white/05 transition-colors">
                    Regenerate
                  </button>
                </Row>
              </>
            )}

            {/* ── APPEARANCE ── */}
          {tab === 'appearance' && (
            <>
              <SectionHeader icon={<Moon size={13} />} title="Theme" />
              <div className="flex gap-2 mb-1">
                {(['dark', 'darker'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-mono transition-colors',
                      theme === t
                        ? 'border-[#4cd7f6] text-[#4cd7f6] bg-[#4cd7f6]/10'
                        : 'border-white/10 text-white/40 hover:border-white/25'
                    )}
                  >
                    {t === 'dark' ? <Sun size={12} /> : <Moon size={12} />}
                    {t === 'dark' ? 'Dark' : 'Darker'}
                  </button>
                ))}
              </div>

              <SectionHeader icon={<Zap size={13} />} title="Accent Color" />
              <div className="flex gap-2 mb-1">
                {ACCENTS.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setAccentColor(a.id)}
                    title={a.label}
                    className={cn(
                      'flex-1 h-8 rounded-lg border-2 transition-all',
                      accentColor === a.id ? 'border-white scale-105' : 'border-transparent opacity-60 hover:opacity-90'
                    )}
                    style={{ background: a.color }}
                  />
                ))}
              </div>
              <p className="text-[11px] text-white/30 mb-3">
                Accent: <span className="text-white/60 font-mono">{ACCENTS.find(a => a.id === accentColor)?.label}</span>
              </p>

              <SectionHeader icon={<Monitor size={13} />} title="Interface" />
              <Row label="Compact Mode" description="Reduce padding for denser layouts">
                <Toggle enabled={compactMode} onToggle={() => setCompactMode(v => !v)} />
              </Row>
              <Row label="Animations" description="Enable micro-animations and transitions">
                <Toggle enabled={animationsEnabled} onToggle={() => setAnimationsEnabled(v => !v)} />
              </Row>
            </>
          )}

          {/* ── NOTIFICATIONS ── */}
          {tab === 'notifications' && (
            <>
              <SectionHeader icon={<Bell size={13} />} title="Alerts" />
              <Row label="Desktop Notifications" description="Show browser push notifications">
                <Toggle enabled={notifDesktop} onToggle={() => setNotifDesktop(v => !v)} />
              </Row>
              <Row label="Sound Alerts" description="Play a sound for new alerts">
                <Toggle enabled={notifSound} onToggle={() => setNotifSound(v => !v)} />
              </Row>
              <Row label="Critical Only" description="Only notify for critical-severity events">
                <Toggle enabled={notifCriticalOnly} onToggle={() => setNotifCriticalOnly(v => !v)} />
              </Row>

              <SectionHeader icon={<Zap size={13} />} title="Alert Types" />
              {[
                { label: 'New Findings', desc: 'When the engine detects a threat finding' },
                { label: 'Pipeline Complete', desc: 'When a pipeline run finishes' },
                { label: 'High Confidence IOC', desc: 'IOC with confidence ≥ 80%' },
                { label: 'Agent Errors', desc: 'Background task failures' },
              ].map((item) => (
                <Row key={item.label} label={item.label} description={item.desc}>
                  <Toggle enabled={true} onToggle={() => {}} />
                </Row>
              ))}
            </>
          )}

          {/* ── BACKEND ── */}
          {tab === 'backend' && (
            <>
              <SectionHeader icon={<Globe size={13} />} title="API Connection" />
              <div className="mb-4">
                <label className="text-[10px] font-mono text-white/40 uppercase tracking-wider block mb-1.5">Backend URL</label>
                <input
                  type="text"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-xs font-mono text-white outline-none border border-white/10 focus:border-[#4cd7f6]/50 transition-colors"
                  style={{ background: '#111' }}
                />
              </div>

              <Row label="Auto Refresh" description="Poll pipeline status automatically">
                <Toggle enabled={autoRefresh} onToggle={() => setAutoRefresh(v => !v)} />
              </Row>
              <Row label="Refresh Interval" description="Polling interval in seconds">
                <select
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(e.target.value)}
                  className="text-xs font-mono text-white rounded-lg px-2 py-1 border border-white/10 outline-none"
                  style={{ background: '#111' }}
                >
                  {['10', '30', '60', '120'].map(v => (
                    <option key={v} value={v}>{v}s</option>
                  ))}
                </select>
              </Row>

              <SectionHeader icon={<Database size={13} />} title="MongoDB" />
              <div className="rounded-lg p-3 border border-white/08 mb-3" style={{ background: '#0a0a0a' }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3]" />
                  <p className="text-[11px] font-mono text-white/60">mongodb://localhost:27017/protocol_sift</p>
                </div>
                <p className="text-[10px] text-white/30">Status: <span className="text-[#4edea3]">Connected</span></p>
              </div>

              <button className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-white/10 text-xs text-white/50 hover:text-white hover:border-white/25 transition-colors">
                <RefreshCw size={12} />
                Test Connection
              </button>
            </>
          )}

          {/* ── ABOUT ── */}
          {tab === 'about' && (
            <>
              <div className="flex flex-col items-center py-6 gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#4cd7f6]/20 to-[#4edea3]/20 border border-white/10 flex items-center justify-center">
                  <Shield size={22} className="text-[#4cd7f6]" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-white">Protocol SIFT</p>
                  <p className="text-[11px] text-white/40 font-mono">v1.0.0 — MVP Release</p>
                </div>
              </div>

              <div className="space-y-1 mb-4">
                {[
                  ['Stack',     'FastAPI · MongoDB · React'],
                  ['Pipeline',  'BackgroundTasks (no Celery)'],
                  ['Graph',     'MongoDB relationships collection'],
                  ['Frontend',  'React + Zustand + Tailwind'],
                  ['Python',    '3.11+'],
                  ['Node',      '20+'],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between py-2 border-b border-white/06">
                    <span className="text-[11px] font-mono text-white/35">{k}</span>
                    <span className="text-[11px] text-white/60">{v}</span>
                  </div>
                ))}
              </div>

              <div className="rounded-lg p-3 border border-white/08 text-[11px] text-white/35 leading-relaxed" style={{ background: '#0a0a0a' }}>
                Autonomous cybersecurity incident response agent.<br />
                Evidence → Normalization → Entity Extraction →<br />
                Relationship Graph → Findings → Timeline → Report.
              </div>
            </>
          )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-white/10 flex-shrink-0">
          <button
            className="text-[11px] text-white/30 hover:text-white/60 transition-colors font-mono"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-black transition-colors"
            style={{ background: '#4cd7f6' }}
            onClick={onClose}
          >
            <ChevronRight size={13} />
            Save Changes
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}
