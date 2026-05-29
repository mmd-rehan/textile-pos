import { create } from 'zustand';

interface AppState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  
  notification: { message: string; type: 'success' | 'error' | 'info' } | null;
  showNotification: (message: string, type: 'success' | 'error' | 'info') => void;
  clearNotification: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  
  notification: null,
  showNotification: (message, type) => {
    set({ notification: { message, type } });
    setTimeout(() => {
      set({ notification: null });
    }, 4000);
  },
  clearNotification: () => set({ notification: null }),
}));
