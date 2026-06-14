import { useState, useRef, useEffect } from 'react';
import { Bell, Search, Settings, ChevronDown, Menu, X } from 'lucide-react';
import { cn, formatRelativeTime } from '../lib/utils';
import { useUIStore } from '../stores/uiStore';
import { useNotificationStore } from '../stores/notificationStore';
import { useCaseStore } from '../stores/caseStore';
import { AgentStatusIndicator } from '../components/shared/ActivityFeed';
import { useAgentStore } from '../stores/agentStore';
import { SettingsPanel } from '../components/shared/SettingsPanel';

export function Topbar() {
  const { toggleSidebar, activePageTitle, toggleNotificationPanel, notificationPanelOpen } = useUIStore();
  const { unreadCount, notifications, markRead, markAllRead } = useNotificationStore();
  const { cases, selectedCaseId, selectCase, fetchCases } = useCaseStore();

  // Load real investigations on mount
  useEffect(() => { fetchCases(); }, []);
  const { state: agentState } = useAgentStore();
  const [caseDropdownOpen, setCaseDropdownOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'profile' | 'appearance' | 'notifications' | 'backend' | 'about'>('appearance');
  const [avatarDropdownOpen, setAvatarDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  // Focus input when search opens
  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  // Close search on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setSearchOpen(false); setSearchQuery(''); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setSearchOpen((v) => !v); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const selectedCase = cases.find((c) => c.id === selectedCaseId);

  return (
    <header className="fixed top-0 right-0 z-20 flex items-center gap-4 px-5 h-14 border-b border-white/[0.08] bg-[#0b1020]/90 backdrop-blur-xl transition-all duration-300"
      style={{ left: 'var(--sidebar-width, 240px)' }}>

      {/* Mobile menu */}
      <button onClick={toggleSidebar} className="lg:hidden text-sift-muted hover:text-white">
        <Menu size={20} />
      </button>

      {/* Page title */}
      <h2 className="text-sm font-semibold text-white hidden md:block">{activePageTitle}</h2>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Agent status – compact */}
      <AgentStatusIndicator status={agentState.status} compact />

      {/* Case selector */}
      <div className="relative">
        <button
          onClick={() => setCaseDropdownOpen((v) => !v)}
          className="flex items-center gap-2 glass rounded-lg px-3 py-1.5 text-xs font-mono text-white hover:border-sift-cyan/30 transition-colors max-w-[180px]"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-sift-green flex-shrink-0" />
          <span className="truncate">{selectedCase?.title ?? 'No Case'}</span>
          <ChevronDown size={12} className="flex-shrink-0 text-sift-muted" />
        </button>

        {caseDropdownOpen && (
          <div className="absolute right-0 top-full mt-1 w-64 rounded-xl border border-white/15 shadow-2xl z-50 overflow-hidden" style={{ background: '#000000' }}>
            <div className="px-3 py-2 border-b border-white/10">
              <p className="text-[10px] font-mono uppercase tracking-widest text-sift-muted">Select Case</p>
            </div>
            {cases.map((c) => (
              <button
                key={c.id}
                onClick={() => { selectCase(c.id); setCaseDropdownOpen(false); }}
                className={cn('w-full text-left px-3 py-2.5 hover:bg-white/08 transition-colors', c.id === selectedCaseId && 'bg-sift-cyan/10')}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-white truncate">{c.title}</p>
                    <p className="text-[10px] font-mono text-sift-muted mt-0.5">{c.id.slice(0, 16)}… · {c.status}</p>
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-white/10 text-sift-muted flex-shrink-0">{c.severity.toUpperCase()}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative flex items-center">
        {searchOpen ? (
          <div className="flex items-center gap-2 rounded-lg border border-sift-cyan/40 px-2.5 py-1 transition-all duration-200" style={{ background: '#000000', width: '220px' }}>
            <Search size={13} className="text-sift-cyan flex-shrink-0" />
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search cases, entities..."
              className="flex-1 bg-transparent text-xs text-white placeholder:text-sift-muted outline-none font-mono"
            />
            <button onClick={() => { setSearchOpen(false); setSearchQuery(''); }} className="text-sift-muted hover:text-white transition-colors flex-shrink-0">
              <X size={13} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-1.5 text-sift-muted hover:text-white transition-colors group"
            aria-label="Global search (Ctrl+K)"
          >
            <Search size={16} />
            <span className="hidden lg:inline text-[10px] font-mono border border-white/15 rounded px-1 py-0.5 text-white/30 group-hover:text-white/60 transition-colors">⌘K</span>
          </button>
        )}
      </div>

      {/* Notifications */}
      <div className="relative">
        <button
          onClick={toggleNotificationPanel}
          className="relative text-sift-muted hover:text-white transition-colors"
          aria-label="Notifications"
        >
          <Bell size={16} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-sift-danger text-[9px] font-bold text-white flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>

        {notificationPanelOpen && (
          <div className="absolute right-0 top-full mt-1 w-80 rounded-xl border border-white/15 shadow-2xl z-50 overflow-hidden" style={{ background: '#000000' }}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <p className="text-xs font-semibold text-white">Notifications</p>
              <button onClick={markAllRead} className="text-[10px] text-sift-cyan hover:text-white transition-colors">Mark all read</button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className={cn('px-4 py-3 border-b border-white/08 cursor-pointer hover:bg-white/05 transition-colors', !n.read && 'bg-sift-cyan/05')}
                >
                  <div className="flex items-start gap-2">
                    <div className={cn('w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0', { 'bg-sift-danger': n.type === 'error', 'bg-sift-warning': n.type === 'warning', 'bg-sift-green': n.type === 'success', 'bg-sift-cyan': n.type === 'info' })} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white">{n.title}</p>
                      <p className="text-[11px] text-sift-muted mt-0.5 leading-snug">{n.message}</p>
                      <p className="text-[10px] font-mono text-white/25 mt-1">{formatRelativeTime(n.timestamp)}</p>
                    </div>
                    {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-sift-cyan mt-1.5 flex-shrink-0" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Settings */}
      <button 
        className="text-sift-muted hover:text-white transition-colors" 
        aria-label="Settings"
        onClick={() => { setSettingsTab('appearance'); setSettingsOpen(true); }}
      >
        <Settings size={16} />
      </button>

      {/* Avatar / Profile */}
      <div className="relative">
        <button
          onClick={() => setAvatarDropdownOpen(v => !v)}
          className="w-7 h-7 rounded-full bg-gradient-to-br from-sift-primary/50 to-sift-cyan/30 border border-white/20 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-[#4cd7f6]/50"
        >
          SC
        </button>

        {avatarDropdownOpen && (
          <div className="absolute right-0 top-full mt-1 w-56 rounded-xl border border-white/15 shadow-2xl z-50 overflow-hidden" style={{ background: '#000000' }}>
            <div className="flex flex-col px-4 py-3 border-b border-white/10 gap-1">
              <p className="text-xs font-semibold text-white">Security Chief</p>
              <p className="text-[10px] font-mono text-sift-muted">admin@protocolsift.io</p>
              <p className="text-[10px] font-mono text-[#4edea3]">Role: Administrator</p>
            </div>
            
            <div className="py-1 border-b border-white/10">
              <button 
                onClick={() => { setAvatarDropdownOpen(false); setSettingsTab('profile'); setSettingsOpen(true); }}
                className="w-full text-left px-4 py-2 text-xs text-white/70 hover:text-white hover:bg-white/05 transition-colors"
              >
                Profile Settings
              </button>
              <button 
                onClick={() => { setAvatarDropdownOpen(false); setSettingsTab('profile'); setSettingsOpen(true); }}
                className="w-full text-left px-4 py-2 text-xs text-white/70 hover:text-white hover:bg-white/05 transition-colors"
              >
                API Keys
              </button>
            </div>

            <div className="py-1">
              <button className="w-full text-left px-4 py-2 text-xs text-sift-danger hover:bg-sift-danger/10 transition-colors font-medium">
                Log Out
              </button>
            </div>
          </div>
        )}
      </div>

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} defaultTab={settingsTab} />
    </header>
  );
}
