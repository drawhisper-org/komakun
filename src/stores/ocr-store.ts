import { create } from "zustand";

export interface PendingSelection {
  /** Bounding rect (always computed, even for lasso). */
  x: number;
  y: number;
  width: number;
  height: number;
  /** "rect" or "lasso" — controls masking strategy. */
  mode: "rect" | "lasso";
  /** For lasso selections, the raw polygon points [x0,y0,x1,y1,...]. */
  lassoPoints?: number[];
}

interface OcrUiState {
  /** Region drawn by Rect / Lasso tool, awaiting manual OCR trigger. */
  pendingSelection: PendingSelection | null;
  setPendingSelection: (sel: PendingSelection | null) => void;
  clearSelection: () => void;
}

export const useOcrUiStore = create<OcrUiState>((set) => ({
  pendingSelection: null,
  setPendingSelection: (sel) => set({ pendingSelection: sel }),
  clearSelection: () => set({ pendingSelection: null }),
}));
