import { create } from "zustand";
import { persist } from "zustand/middleware";
import { get, set, del } from "idb-keyval";

/* ── Types ── */

export interface CustomFont {
  /** Display label (derived from filename) */
  label: string;
  /** CSS font-family value (unique, based on label) */
  value: string;
  /** Base64-encoded font data (data URL) */
  dataUrl: string;
  /** Original file name for reference */
  fileName: string;
  /** Timestamp of import */
  addedAt: number;
}

interface CustomFontsState {
  /** All imported custom fonts, newest first */
  fonts: CustomFont[];
  /** Whether fonts have been hydrated from IDB on this session */
  hydrated: boolean;
  /** Add a new custom font. Returns the font entry. */
  addFont: (font: CustomFont) => void;
  /** Remove a custom font by value (CSS family name) */
  removeFont: (value: string) => void;
  /** Mark store as hydrated after loading from IDB */
  _setHydrated: () => void;
}

/* ── IDB key for raw font data ── */
const IDB_KEY = "komakun-custom-fonts";

/* ── Store ── */

export const useCustomFontsStore = create<CustomFontsState>()((set, get) => ({
  fonts: [],
  hydrated: false,

  addFont: (font) => {
    set((s) => {
      // Prevent duplicates by value
      const filtered = s.fonts.filter((f) => f.value !== font.value);
      const next = [font, ...filtered];
      // Persist to IDB (fire-and-forget)
      persistToIdb(next);
      return { fonts: next };
    });
  },

  removeFont: (value) => {
    set((s) => {
      const next = s.fonts.filter((f) => f.value !== value);
      persistToIdb(next);
      return { fonts: next };
    });
  },

  _setHydrated: () => set({ hydrated: true }),
}));

/* ── IDB persistence helpers ── */

async function persistToIdb(fonts: CustomFont[]) {
  try {
    await set(IDB_KEY, JSON.stringify(fonts));
  } catch {
    console.warn("[custom-fonts] Failed to persist to IDB");
  }
}

/**
 * Hydrate custom fonts from IDB and register them with the browser.
 * Call once at app startup (e.g., in a provider or layout effect).
 */
export async function hydrateCustomFonts() {
  const store = useCustomFontsStore.getState();
  if (store.hydrated) return;

  try {
    const raw = await get(IDB_KEY);
    if (raw) {
      const fonts: CustomFont[] = JSON.parse(raw as string);
      useCustomFontsStore.setState({ fonts, hydrated: true });
      // Register each font with the browser
      for (const font of fonts) {
        await registerFontFace(font);
      }
    } else {
      useCustomFontsStore.setState({ hydrated: true });
    }
  } catch {
    console.warn("[custom-fonts] Failed to hydrate from IDB");
    useCustomFontsStore.setState({ hydrated: true });
  }
}

/**
 * Register a CustomFont with the browser's FontFace API so it can be
 * used in CSS / Konva text rendering.
 */
export async function registerFontFace(font: CustomFont): Promise<void> {
  try {
    const face = new FontFace(font.value, `url(${font.dataUrl})`);
    await face.load();
    document.fonts.add(face);
  } catch (err) {
    console.warn(`[custom-fonts] Failed to register "${font.label}":`, err);
  }
}

/* ── Filename → font name parser ── */

/**
 * Parse a human-readable font name from a filename.
 *
 * Examples:
 *   "NotoSansJP-Bold.ttf"      → "NotoSansJP Bold"
 *   "my_custom_font.woff2"     → "My Custom Font"
 *   "Comic-Sans-MS.otf"        → "Comic Sans MS"
 *   "FiraCode-Regular.ttf"     → "FiraCode"
 */
export function parseFontName(fileName: string): string {
  // Strip extension
  const base = fileName.replace(/\.(ttf|otf|woff2?|eot)$/i, "");

  // Remove common weight/style suffixes (case-insensitive)
  const cleaned = base.replace(
    /[-_\s]*(Regular|Bold|Italic|Light|Medium|SemiBold|ExtraBold|Thin|Black|Heavy|Book|Condensed|Expanded)$/i,
    ""
  );

  // Replace separators with spaces
  const spaced = cleaned.replace(/[-_]+/g, " ");

  // Insert space before a capital letter that follows a lowercase letter (camelCase → Camel Case)
  const deCameled = spaced.replace(/([a-z])([A-Z])/g, "$1 $2");

  // Capitalize each word
  const titled = deCameled
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return titled || "Custom Font";
}
