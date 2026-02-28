import { create } from "zustand";

/**
 * Ephemeral UI store tracking which canvas element is currently selected.
 * Supports single text block, multiple text blocks (drag-select), and inpaint strokes.
 */
interface EditorSelectionState {
  /** Currently selected text block id (from OCR bounding boxes). */
  selectedBlockId: string | null;
  /** Set of selected block ids for multi-select (drag-select). */
  selectedBlockIds: Set<string>;
  /** Currently selected inpaint stroke id. */
  selectedStrokeId: string | null;

  /** Select a single block (clears multi-select). */
  selectBlock: (id: string | null) => void;
  /** Select multiple blocks at once. */
  selectBlocks: (ids: string[]) => void;
  /** Toggle a block in/out of multi-selection (Shift+click). */
  toggleBlock: (id: string) => void;
  selectStroke: (id: string | null) => void;
  clearAll: () => void;
}

export const useEditorSelectionStore = create<EditorSelectionState>((set) => ({
  selectedBlockId: null,
  selectedBlockIds: new Set<string>(),
  selectedStrokeId: null,

  selectBlock: (id) =>
    set({
      selectedBlockId: id,
      selectedBlockIds: id ? new Set([id]) : new Set(),
      selectedStrokeId: null,
    }),

  selectBlocks: (ids) =>
    set({
      selectedBlockId: ids.length === 1 ? ids[0] : null,
      selectedBlockIds: new Set(ids),
      selectedStrokeId: null,
    }),

  toggleBlock: (id) =>
    set((state) => {
      const next = new Set(state.selectedBlockIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return {
        selectedBlockId: next.size === 1 ? [...next][0] : null,
        selectedBlockIds: next,
        selectedStrokeId: null,
      };
    }),

  selectStroke: (id) =>
    set({
      selectedStrokeId: id,
      selectedBlockId: null,
      selectedBlockIds: new Set(),
    }),

  clearAll: () =>
    set({
      selectedBlockId: null,
      selectedBlockIds: new Set(),
      selectedStrokeId: null,
    }),
}));
