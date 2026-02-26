import { create } from "zustand";

export type LayerKey = "original" | "cleaned" | "text" | "watermark";

interface LayerVisibilityState {
  visibility: Record<LayerKey, boolean>;
  toggle: (key: LayerKey) => void;
  setVisible: (key: LayerKey, visible: boolean) => void;
}

export const useLayerVisibilityStore = create<LayerVisibilityState>((set) => ({
  visibility: {
    original: true,
    cleaned: true,
    text: true,
    watermark: true,
  },
  toggle: (key) =>
    set((s) => ({
      visibility: { ...s.visibility, [key]: !s.visibility[key] },
    })),
  setVisible: (key, visible) =>
    set((s) => ({
      visibility: { ...s.visibility, [key]: visible },
    })),
}));
