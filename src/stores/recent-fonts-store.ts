import { create } from "zustand";
import { persist } from "zustand/middleware";

const MAX_RECENT = 3;

interface RecentFontsState {
  /** Most-recently used fonts, newest first. Max 3 entries. */
  recentFonts: string[];
  /** Record a font as recently used. Moves it to front if already present. */
  trackFont: (fontValue: string) => void;
}

export const useRecentFontsStore = create<RecentFontsState>()(
  persist(
    (set) => ({
      recentFonts: [],
      trackFont: (fontValue) =>
        set((s) => {
          const filtered = s.recentFonts.filter((f) => f !== fontValue);
          return { recentFonts: [fontValue, ...filtered].slice(0, MAX_RECENT) };
        }),
    }),
    { name: "komakun-recent-fonts" }
  )
);
