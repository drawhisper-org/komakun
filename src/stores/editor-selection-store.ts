import { create } from "zustand";

/**
 * Ephemeral UI store tracking which canvas element is currently selected.
 * Supports text blocks (from OCR) and inpaint strokes.
 */
interface EditorSelectionState {
  /** Currently selected text block id (from OCR bounding boxes). */
  selectedBlockId: string | null;
  /** Currently selected inpaint stroke id. */
  selectedStrokeId: string | null;

  selectBlock: (id: string | null) => void;
  selectStroke: (id: string | null) => void;
  clearAll: () => void;
}

export const useEditorSelectionStore = create<EditorSelectionState>((set) => ({
  selectedBlockId: null,
  selectedStrokeId: null,

  selectBlock: (id) =>
    set({ selectedBlockId: id, selectedStrokeId: null }),

  selectStroke: (id) =>
    set({ selectedStrokeId: id, selectedBlockId: null }),

  clearAll: () =>
    set({ selectedBlockId: null, selectedStrokeId: null }),
}));
