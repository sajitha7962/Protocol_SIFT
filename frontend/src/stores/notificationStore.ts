import { create } from 'zustand';
import type { Notification } from '../types';

let _id = 1;

interface NotificationStore {
  notifications: Notification[];
  unreadCount: number;
  add: (n: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  remove: (id: string) => void;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [
    { id: 'n1', type: 'error', title: 'Critical Finding', message: 'LSASS credential dumping confirmed in case-001', timestamp: '2026-06-12T14:42:00Z', read: false, caseId: 'case-001' },
    { id: 'n2', type: 'warning', title: 'Contradiction Detected', message: 'Process discrepancy between logs and memory (case-001)', timestamp: '2026-06-12T14:50:00Z', read: false, caseId: 'case-001' },
    { id: 'n3', type: 'success', title: 'Evidence Verified', message: 'Memory dump ev-001 integrity confirmed', timestamp: '2026-06-12T09:05:00Z', read: true, caseId: 'case-001' },
    { id: 'n4', type: 'info', title: 'Agent Update', message: 'Correlation analysis in progress for case-001', timestamp: '2026-06-12T14:45:00Z', read: true },
  ],
  unreadCount: 2,
  add: (n) => {
    const notification: Notification = { ...n, id: `n${_id++}`, timestamp: new Date().toISOString(), read: false };
    set((s) => ({ notifications: [notification, ...s.notifications], unreadCount: s.unreadCount + 1 }));
  },
  markRead: (id) => set((s) => ({ notifications: s.notifications.map((n) => n.id === id ? { ...n, read: true } : n), unreadCount: Math.max(0, s.unreadCount - 1) })),
  markAllRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })), unreadCount: 0 })),
  remove: (id) => set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),
}));
