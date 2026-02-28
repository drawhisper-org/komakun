import { create } from "zustand";
import type { TextBlock, InpaintStroke } from "./project-store";

/**
 * Snapshot of the undoable parts of a page.
 * Tracks textBlocks, inpaintStrokes, and the cleaned background image.
 */
interface PageSnapshot {
  pageId: string;
  textBlocks: TextBlock[];
  inpaintStrokes: InpaintStroke[];
  cleanedImageBase64: string | null;
}

/** Per-page undo/redo stacks. */
interface PageHistory {
  past: PageSnapshot[];
  future: PageSnapshot[];
}

interface HistoryState {
  /** Per-page history stacks keyed by pageId. */
  pages: Record<string, PageHistory>;
  /** Max number of undo steps to keep per page. */
  maxSteps: number;
}

interface HistoryActions {
  /**
   * Push the current state as a snapshot before mutating.
   * Call this BEFORE applying the change to project-store.
   * The pageId is extracted from the snapshot.
   */
  pushSnapshot: (snapshot: PageSnapshot) => void;
  /** Undo: pop from past, push current into future, return snapshot to restore. */
  undo: (currentSnapshot: PageSnapshot) => PageSnapshot | null;
  /** Redo: pop from future, push current into past, return snapshot to restore. */
  redo: (currentSnapshot: PageSnapshot) => PageSnapshot | null;
  /** Clear history for all pages (e.g. when switching projects). */
  clearHistory: () => void;
  /** Clear history for a specific page. */
  clearPageHistory: (pageId: string) => void;
  /** Whether undo is available for a given page. */
  canUndo: (pageId: string) => boolean;
  /** Whether redo is available for a given page. */
  canRedo: (pageId: string) => boolean;
}

export type HistoryStore = HistoryState & HistoryActions;

const EMPTY_PAGE_HISTORY: PageHistory = { past: [], future: [] };

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  pages: {},
  maxSteps: 30,

  pushSnapshot: (snapshot) => {
    const { pages, maxSteps } = get();
    const pageId = snapshot.pageId;
    const ph = pages[pageId] ?? EMPTY_PAGE_HISTORY;

    // Dedup: skip if identical to last snapshot for this page
    if (ph.past.length > 0) {
      const last = ph.past[ph.past.length - 1];
      if (
        last.textBlocks.length === snapshot.textBlocks.length &&
        last.inpaintStrokes.length === snapshot.inpaintStrokes.length &&
        last.cleanedImageBase64 === snapshot.cleanedImageBase64 &&
        JSON.stringify(last.textBlocks) === JSON.stringify(snapshot.textBlocks) &&
        JSON.stringify(last.inpaintStrokes) === JSON.stringify(snapshot.inpaintStrokes)
      ) {
        return;
      }
    }

    set((s) => ({
      pages: {
        ...s.pages,
        [pageId]: {
          past: [...ph.past.slice(-(maxSteps - 1)), snapshot],
          future: [], // new action invalidates redo
        },
      },
    }));
  },

  undo: (currentSnapshot) => {
    const pageId = currentSnapshot.pageId;
    const ph = get().pages[pageId] ?? EMPTY_PAGE_HISTORY;
    if (ph.past.length === 0) return null;

    const prev = ph.past[ph.past.length - 1];
    set((s) => ({
      pages: {
        ...s.pages,
        [pageId]: {
          past: ph.past.slice(0, -1),
          future: [...ph.future, currentSnapshot],
        },
      },
    }));
    return prev;
  },

  redo: (currentSnapshot) => {
    const pageId = currentSnapshot.pageId;
    const ph = get().pages[pageId] ?? EMPTY_PAGE_HISTORY;
    if (ph.future.length === 0) return null;

    const next = ph.future[ph.future.length - 1];
    set((s) => ({
      pages: {
        ...s.pages,
        [pageId]: {
          future: ph.future.slice(0, -1),
          past: [...ph.past, currentSnapshot],
        },
      },
    }));
    return next;
  },

  clearHistory: () => set({ pages: {} }),

  clearPageHistory: (pageId) =>
    set((s) => {
      const { [pageId]: _, ...rest } = s.pages;
      return { pages: rest };
    }),

  canUndo: (pageId) => (get().pages[pageId]?.past.length ?? 0) > 0,

  canRedo: (pageId) => (get().pages[pageId]?.future.length ?? 0) > 0,
}));
