import { get, set, del } from "idb-keyval";
import type { StateStorage } from "zustand/middleware";

/**
 * Custom Zustand storage engine backed by IndexedDB via idb-keyval.
 * Used for heavyweight project data (Skill 4).
 */
export const idbStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return (await get(name)) ?? null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await set(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await del(name);
  },
};

/**
 * Debounced PersistStorage for zustand persist middleware.
 *
 * Both JSON.stringify and the IDB write only run after the debounce
 * period, so rapid store updates (e.g. typing, dragging) don't trigger
 * expensive serialisation of large base64 image data on every keystroke.
 */
export function createDebouncedPersistStorage<S>(
  base: StateStorage,
  delay = 1500
): {
  getItem: (name: string) => Promise<{ state: S; version?: number } | null>;
  setItem: (name: string, value: { state: S; version?: number }) => void;
  removeItem: (name: string) => Promise<void>;
} {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: { name: string; value: unknown } | null = null;

  return {
    getItem: async (name) => {
      const raw = await base.getItem(name);
      return raw ? JSON.parse(raw) : null;
    },
    setItem: (name, value) => {
      pending = { name, value };
      if (timer) clearTimeout(timer);
      timer = setTimeout(async () => {
        if (pending) {
          await base.setItem(pending.name, JSON.stringify(pending.value));
          pending = null;
        }
        timer = null;
      }, delay);
    },
    removeItem: async (name) => {
      await base.removeItem(name);
    },
  };
}
