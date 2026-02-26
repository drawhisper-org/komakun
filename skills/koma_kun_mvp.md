# KomaKun! — AI Manga Translation IDE

**Vision:** A professional open-source AI-powered Web IDE for comic/manga translation, cleaning, and typesetting.

**Design Language:** Material Design 3 dynamic color tokens, dense Figma-style property panels, Inter + Nunito typography, Indigo accent theme.

---

## Phase 1 — Project Shell & Page Management ✅

Everything in this phase is **complete and shipped**.

### 1.1 Tech Stack (Established)

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Styling | Tailwind CSS v4, shadcn/ui |
| Icons | `@phosphor-icons/react` (`weight="fill"` / `weight="bold"`) |
| State | Zustand `persist` — `localStorage` for app config, `idb-keyval` (IndexedDB) for project data |
| Drag & Drop | `@dnd-kit/core` + `@dnd-kit/sortable` (grid-compatible, replaced framer-motion Reorder) |
| Fonts | Nunito (brand), Inter (headings + body) |
| i18n | `next-intl` — 4 locales (en, zh, zh-TW, ja) |
| License | AGPL-3.0 |
| Repo | https://github.com/drawhisper-org/komakun |

### 1.2 Completed Features

- **Landing page** — Hero with manga card showcase, feature grid, translation showcase, workflow zigzag timeline, community CTA
- **Home view** — Multi-project dashboard with grid/list views, sort (alphabetical / date-created / last-viewed), filter (all / starred), language switcher
- **Multi-project persistence** — `projects-list-store` (localStorage metadata + tiny thumbnails) + per-project IndexedDB snapshots, save/switch/create/delete
- **Editor layout** — Left sidebar (pages + layers, collapsible, flex-sharing), right sidebar (AI actions placeholder), bottom toolbar, center canvas area
- **Page management** — Add images (sorted by filename, natural ordering), 2-column sidebar grid with @dnd-kit drag reorder, full-screen Manage Pages view (4-column default, delete, drag overlay), 80-page / 5MB limits
- **Settings modal** — Theme mode (light/dark/system), accent color swatches, AI provider/model/key config (with validation), watermark upload, import/export .koma
- **i18n** — All UI strings translated across 4 locales with native-speaker quality
- **Theme system** — MD3 CSS variables, dynamic accent color, `next-themes` integration

### 1.3 Data Architecture

```
stores/
  app-config-store.ts    → localStorage (theme, AI config, watermark)
  projects-list-store.ts → localStorage (ProjectSummary[] with tiny thumbnails)
  project-store.ts       → IndexedDB via idb-keyval (active project + per-project snapshots)
  user-store.ts          → localStorage (display name, avatar)
  locale-store.ts        → localStorage (selected locale)
```

---

## Phase 2 — Canvas & Visual Editing

**Goal:** Replace the placeholder canvas with a fully interactive `react-konva` stage for viewing, panning, zooming, and text node editing.

### Step 2.1 — Install react-konva

```bash
npm install react-konva konva
```

Create `src/components/editor/canvas/konva-stage.tsx`.

### Step 2.2 — Basic Canvas Rendering

- Render the active page's `originalImageBase64` as a `Konva.Image` on the Background layer.
- Fill the center workspace area. Maintain aspect ratio.
- Show a checkerboard or dark background behind the image.

### Step 2.3 — Pan & Zoom

- Mouse wheel → zoom (min 10%, max 500%).
- Middle-click drag or Space+drag → pan.
- Display current zoom % in the bottom toolbar.
- "Fit to screen" and "100%" buttons.

### Step 2.4 — Layer System (Konva Layers)

Strictly separate `<Layer>` components, rendered in this order (bottom to top):

1. **Original Image Layer** — `Konva.Image` of `originalImageBase64`
2. **Cleaned Background Layer** — `Konva.Image` of `cleanedImageBase64` (when available, overlays original)
3. **Text Nodes Layer** — `Konva.Text` / `Konva.Group` for each `TextBlock`
4. **Watermark Layer** — `Konva.Image` pinned to bottom-right corner (if enabled)

Each layer's visibility is toggleable from the left sidebar Layers panel (`EyeIcon` toggle).

### Step 2.5 — Text Node Interaction

- Click a text node on canvas → select it (show transform handles via `Konva.Transformer`).
- Drag to reposition. Corner handles to resize.
- Double-click → open inline text editing (or populate the right sidebar's text editor).
- Selected node highlights in the right sidebar text blocks list.

### Step 2.6 — Bottom Toolbar Enhancements

- Tool selector: **Select** (arrow cursor), **Hand** (pan), **Text** (add new text node).
- Undo / Redo buttons (zustand middleware or manual history stack).
- Current page indicator: "Page 3 / 24".

---

## Phase 3 — AI Pipeline Integration

**Goal:** Wire up OCR, background cleaning, and translation via user-provided API keys.

### Step 3.1 — OCR (Text Detection + Recognition)

- **Trigger:** "Run OCR" button in right sidebar AI actions panel.
- **Input:** Active page's `originalImageBase64`.
- **Provider:** Google Cloud Vision API (or user-selected provider from settings).
- **Output:** Array of detected text regions with bounding boxes.
- **Action:** Create `TextBlock` entries in the page state for each detected region. Position them on canvas.
- **UX:** Show progress spinner during OCR. Toast on success/failure.

### Step 3.2 — Background Cleaning (Inpainting)

- **Trigger:** "Clean Background" button.
- **Input:** Original image + text region masks (from OCR bounding boxes).
- **Provider:** OpenAI DALL-E inpainting or Stability AI.
- **Output:** Cleaned image with text regions filled in.
- **Action:** Store as `cleanedImageBase64` on the page. Render on the Cleaned Background layer.
- **UX:** Before/after toggle. Ability to revert.

### Step 3.3 — Auto Translation

- **Trigger:** "Auto Translate" button.
- **Input:** All `TextBlock.originalText` values for the active page.
- **Provider:** OpenAI GPT / Anthropic Claude / Google Gemini (from settings).
- **Prompt:** System prompt with manga translation context (preserve tone, honorifics, SFX conventions).
- **Output:** Translated text for each block.
- **Action:** Populate `TextBlock.translatedText`. Render on canvas text nodes.
- **UX:** Side-by-side original/translated in right sidebar. Editable after auto-fill.

### Step 3.4 — Batch Processing

- "Process All Pages" button that runs OCR → Clean → Translate sequentially for every page.
- Progress bar showing current page / total.
- Ability to cancel mid-batch.

---

## Phase 4 — Typography & Typesetting

**Goal:** Professional text rendering suitable for scanlation release.

### Step 4.1 — Font System

- Bundle 3-5 common manga fonts (e.g., CC Wild Words, Anime Ace, Back Issues).
- Allow custom font upload (`.ttf` / `.otf`).
- Font picker dropdown in the right sidebar Typography Inspector.

### Step 4.2 — Typography Controls

Per-text-block controls in the right sidebar:

- Font family, size, line height, letter spacing
- Color (with eyedropper from canvas)
- Alignment (left / center / right)
- Bold, italic, outline/stroke
- Text orientation (horizontal / vertical — critical for Japanese)

### Step 4.3 — Smart Text Fitting

- Auto-size text to fit within the detected bubble bounding box.
- Respect padding and margins.
- Handle overflow gracefully (shrink font or show warning).

---

## Phase 5 — Export & Distribution

**Goal:** Generate publication-ready output files.

### Step 5.1 — PNG Export

- Export current page as flattened PNG (all visible layers composited).
- "Export All Pages" → ZIP of numbered PNGs.
- Resolution options: 1x, 2x, custom DPI.

### Step 5.2 — Layered PSD Export

- Use `ag-psd` library to generate Photoshop files.
- Preserve layer separation: Original, Cleaned, Text, Watermark.
- Each text node as an editable text layer.

```bash
npm install ag-psd
```

### Step 5.3 — Project File (.koma)

- JSON serialization of the full project state.
- Import/export via Settings modal (already scaffolded).
- Consider compression (pako/gzip) for large projects with many pages.

---

## Phase 6 — Polish & Community

### Step 6.1 — Keyboard Shortcuts

| Action | Shortcut |
|---|---|
| Zoom in / out | `Ctrl +` / `Ctrl -` |
| Fit to screen | `Ctrl 0` |
| Pan (hold) | `Space` |
| Undo / Redo | `Ctrl Z` / `Ctrl Shift Z` |
| Delete selected | `Delete` / `Backspace` |
| Next / prev page | `→` / `←` |
| Save project | `Ctrl S` |

### Step 6.2 — Drag & Drop Import

- Global dropzone: drag images onto the app window to add pages.
- Drag a folder to bulk-import all images inside.

### Step 6.3 — Performance Optimization

- Lazy-load page thumbnails (only render visible ones in sidebar).
- Offscreen canvas for thumbnail generation.
- Web Worker for image processing (base64 encoding, resizing).
- Virtual scrolling for the pages list when > 20 pages.

### Step 6.4 — Accessibility & PWA

- ARIA labels on all interactive elements.
- Keyboard navigation for sidebar, canvas tools.
- PWA manifest + service worker for offline use.
- Installable as desktop app via Chrome/Edge.

---

## Coding Conventions

These rules apply to ALL phases:

1. **Phosphor Icons only.** Never use lucide-react. Always `weight="fill"` or `weight="bold"`. Import with `Icon` suffix.
2. **MD3 color tokens.** Use CSS variables (`--primary`, `--on-surface`, etc.) mapped in `globals.css`. Never hardcode colors like `bg-zinc-900`.
3. **IndexedDB for project data.** `useProjectStore` persists via `idb-keyval`. `useAppConfigStore` and `useProjectsListStore` use `localStorage`.
4. **`@dnd-kit/sortable` for grid drag-and-drop.** The framer-motion `Reorder` API does not support 2D grid layouts.
5. **`next-intl` for all user-facing strings.** Every new UI string must be added to all 4 locale files (`en.json`, `zh.json`, `zh-TW.json`, `ja.json`).
6. **`"use client"` for interactive components.** Keep server components minimal (layout, page shells).
7. **File sort by name.** When adding images, sort by `localeCompare` with `{ numeric: true }` before creating pages.
8. **Debounced auto-save.** The active project auto-syncs to IndexedDB and the projects list every 2 seconds via zustand subscribe.