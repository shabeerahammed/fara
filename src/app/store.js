// ============================================================
// ZUSTAND GLOBAL STORE — auth, UI, notifications
// ============================================================
import { create } from 'zustand';

export const useAppStore = create((set, get) => ({
  // Auth
  user: { name: 'Alex Morgan', role: 'admin', avatar: 'AM' },
  isAdmin: () => get().user.role === 'admin',

  setRole: (role) => set(state => ({ user: { ...state.user, role } })),

  // UI state
  sidebarOpen: true,
  toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen })),

  // Notifications
  notifications: [
    { id: 1, type: 'danger', message: 'Legal threat detected on call C-007', time: '2m ago', read: false },
    { id: 2, type: 'warning', message: 'Low confidence score on call C-003', time: '15m ago', read: false },
    { id: 3, type: 'info', message: 'Agent Sarah Chen flagged 2 calls today', time: '1h ago', read: true },
  ],
  markAllRead: () => set(state => ({
    notifications: state.notifications.map(n => ({ ...n, read: true }))
  })),
  addNotification: (notif) => set(state => ({
    notifications: [{ id: Date.now(), read: false, ...notif }, ...state.notifications]
  })),
  unreadCount: () => get().notifications.filter(n => !n.read).length,

  // Live simulation toggle
  liveMode: true,
  setLiveMode: (v) => set({ liveMode: v }),

  // Selected call for modal
  selectedCall: null,
  setSelectedCall: (call) => set({ selectedCall: call }),
}));
