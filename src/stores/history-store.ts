import { create } from "zustand";
import type { TextBlock, InpaintStroke } from "./project-store";

/**
 * Snapshot of the undoable parts of a page.
 * We only track textBlocks + inpaintStrokes — not images or OCR status,
 * since those are "main process" actions (OCR / Clean BG / Translate).
 */
interface PageSnapshot {
  pageId: string;
  textBlocks: TextBlock[];
  inpaintStrokes: InpaintStroke[];
}

interface HistoryState {
  /** Past snapshots (most recent last). */
  past: PageSnapshot[];
  /** Future snapshots for redo (most recent last). */
  future: PageSnapshot[];
  /** Max number of undo steps to keep. */
  maxSteps: number;
}

interface HistoryActions {
  /**
   * Push the current state as a snapshot before mutating.
   * Call this BEFORE applying the change to project-store.
   */
  pushSnapshot: (snapshot: PageSnapshot) => void;
  /** Undo: pop from past, push current into future, return snapshot to restore. */
  undo: (currentSnapshot: PageSnapshot) => PageSnapshot | null;
  /** Redo: pop from future, push current into past, return snapshot to restore. */
  redo: (currentSnapshot: PageSnapshot) => PageSnapshot | null;
  /** Clear all history (e.g. when switching pages or projects). */
  clearHistory: () => void;
  /** Whether undo is available. */
  canUndo: () => boolean;
  /** Whether redo is available. */
  canRedo: () => boolean;
}

export type HistoryStore = HistoryState & HistoryActions;

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  past: [],
  future: [],
  maxSteps: 50,

  pushSnapshot: (snapshot) => {
    const { past } = get();
    // Dedup: skip if identical to last snapshot
    if (past.length > 0) {
      const last = past[past.length - 1];
      if (
        last.pageId === snapshot.pageId &&
        last.textBlocks.length === snapshot.textBlocks.length &&
        last.inpaintStrokes.length === snapshot.inpaintStrokes.length &&
        JSON.stringify(last.textBlocks) === JSON.stringify(snapshot.textBlocks) &&
        JSON.stringify(last.inpaintStrokes) === JSON.stringify(snapshot.inpaintStrokes)
      ) {
        return;
      }
    }
    set((s) => ({
      past: [...s.past.slice(-(s.maxSteps - 1)), snapshot],
      // Any new action invalidates the redo stack
      future: [],
    }));
  },

  undo: (currentSnapshot) => {
    const { past } = get();
    if (past.length === 0) return null;
    const prev = past[past.length - 1];
    set((s) => ({
      past: s.past.slice(0, -1),
      future: [...s.future, currentSnapshot],
    }));
    return prev;
  },

  redo: (currentSnapshot) => {
    const { future } = get();
    if (future.length === 0) return null;
    const next = future[future.length - 1];
    set((s) => ({
      future: s.future.slice(0, -1),
      past: [...s.past, currentSnapshot],
    }));
    return next;
  },

  clearHistory: () => set({ past: [], future: [] }),

  canUndo: () => get().past.length > 0,

  canRedo: () => get().future.length > 0,
}));
