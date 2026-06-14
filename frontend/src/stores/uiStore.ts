import { create } from 'zustand';
import type { BreadcrumbItem } from '../types';

interface UIStore {
  sidebarCollapsed: boolean;
  notificationPanelOpen: boolean;
  searchOpen: boolean;
  breadcrumb: BreadcrumbItem[];
  activePageTitle: string;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;
  toggleNotificationPanel: () => void;
  setNotificationPanel: (v: boolean) => void;
  setSearchOpen: (v: boolean) => void;
  setBreadcrumb: (items: BreadcrumbItem[]) => void;
  setActivePageTitle: (title: string) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarCollapsed: false,
  notificationPanelOpen: false,
  searchOpen: false,
  breadcrumb: [],
  activePageTitle: 'Dashboard',
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
  toggleNotificationPanel: () => set((s) => ({ notificationPanelOpen: !s.notificationPanelOpen })),
  setNotificationPanel: (v) => set({ notificationPanelOpen: v }),
  setSearchOpen: (v) => set({ searchOpen: v }),
  setBreadcrumb: (items) => set({ breadcrumb: items }),
  setActivePageTitle: (title) => set({ activePageTitle: title }),
}));
