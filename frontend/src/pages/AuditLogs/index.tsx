import React, { useState } from 'react';
import { ScrollText, ShieldCheck } from 'lucide-react';
import { PageHeader, SearchInput } from '../../components/shared/index';
import { GlassPanel } from '../../components/shared/GlassPanel';
import { StatusBadge } from '../../components/shared/Badges';
import { mockAuditLogs } from '../../mocks';
import { formatDateTime } from '../../lib/utils';

export default function AuditLogs() {
  const [search, setSearch] = useState('');

  const filtered = mockAuditLogs.filter(log => 
    log.userName.toLowerCase().includes(search.toLowerCase()) || 
    log.action.toLowerCase().includes(search.toLowerCase()) ||
    log.details.toLowerCase().includes(search.toLowerCase()) ||
    log.ipAddress.includes(search)
  );

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Audit Logs" 
        description="Tamper-proof log of user operations, database configurations, and evidence access events for SOC compliance" 
        icon={<ScrollText size={20} />} 
      />

      <div className="flex items-center gap-3">
        <SearchInput 
          value={search} 
          onChange={setSearch} 
          placeholder="Search audit events, users, or IP addresses..." 
          className="flex-1 min-w-48 max-w-sm" 
        />
      </div>

      <GlassPanel className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-white/08 bg-white/[0.01]">
                <th className="px-4 py-3 font-mono uppercase text-[9px] text-sift-muted tracking-widest">Timestamp</th>
                <th className="px-4 py-3 font-mono uppercase text-[9px] text-sift-muted tracking-widest">User</th>
                <th className="px-4 py-3 font-mono uppercase text-[9px] text-sift-muted tracking-widest">Action</th>
                <th className="px-4 py-3 font-mono uppercase text-[9px] text-sift-muted tracking-widest">Resource</th>
                <th className="px-4 py-3 font-mono uppercase text-[9px] text-sift-muted tracking-widest">Details</th>
                <th className="px-4 py-3 font-mono uppercase text-[9px] text-sift-muted tracking-widest">IP Address</th>
                <th className="px-4 py-3 font-mono uppercase text-[9px] text-sift-muted tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(log => (
                <tr key={log.id} className="border-b border-white/05 hover:bg-white/02 transition-colors">
                  <td className="px-4 py-3 font-mono text-sift-muted">{formatDateTime(log.timestamp)}</td>
                  <td className="px-4 py-3 text-white font-semibold">{log.userName}</td>
                  <td className="px-4 py-3 font-mono text-sift-cyan uppercase">{log.action.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 font-mono text-sift-muted">{log.resourceType} ({log.resourceId})</td>
                  <td className="px-4 py-3 text-white/80">{log.details}</td>
                  <td className="px-4 py-3 font-mono text-sift-muted">{log.ipAddress}</td>
                  <td className="px-4 py-3">
                    <StatusBadge 
                      status={log.status.toUpperCase()} 
                      variant={log.status === 'success' ? 'success' : 'danger'} 
                      className="text-[8px]"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="py-20 text-center text-sift-muted font-mono">No audit events matched.</div>
        )}
      </GlassPanel>
    </div>
  );
}
