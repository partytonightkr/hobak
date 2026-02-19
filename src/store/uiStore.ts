import { create } from "zustand";

interface UIState {
  isSidebarOpen: boolean;
  isMobileNavOpen: boolean;
  activeModal: string | null;
  modalData: Record<string, unknown> | null;
  theme: "light" | "dark" | "system";

  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleMobileNav: () => void;
  setMobileNavOpen: (open: boolean) => void;
  openModal: (name: string, data?: Record<string, unknown>) => void;
  closeModal: () => void;
  setTheme: (theme: "light" | "dark" | "system") => void;
}

export const useUIStore = create<UIState>((set) => ({
  isSidebarOpen: true,
  isMobileNavOpen: false,
  activeModal: null,
  modalData: null,
  theme: "system",

  toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
  toggleMobileNav: () => set((s) => ({ isMobileNavOpen: !s.isMobileNavOpen })),
  setMobileNavOpen: (open) => set({ isMobileNavOpen: open }),
  openModal: (name, data) => set({ activeModal: name, modalData: data ?? null }),
  closeModal: () => set({ activeModal: null, modalData: null }),
  setTheme: (theme) => {
    set({ theme });
    if (typeof window !== "undefined") {
      const root = document.documentElement;
      root.classList.remove("light", "dark");
      if (theme === "system") {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        root.classList.add(prefersDark ? "dark" : "light");
      } else {
        root.classList.add(theme);
      }
    }
  },
}));
