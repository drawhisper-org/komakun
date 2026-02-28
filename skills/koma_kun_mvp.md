# KomaKun! — AI Manga Translation IDE

**Vision:** A professional open-source AI-powered Web IDE for comic/manga translation, cleaning, and typesetting.

**Design Language:** Material Design 3 dynamic color tokens, dense Figma-style property panels, Inter + Nunito typography, dynamic accent theme.

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
| Canvas | `react-konva` + `konva` |
| Drag & Drop | `@dnd-kit/core` + `@dnd-kit/sortable` (grid-compatible) |
| AI | LangChain (structured output, Zod schema), Google Cloud Vision, Replicate (LaMa) |
| PSD Export | `ag-psd` |
| Fonts | Nunito (brand), Inter (headings + body), 45+ manga/CJK fonts via Google Fonts CDN |
| i18n | `next-intl` — 4 locales (en, zh, zh-TW, ja) |
| License | AGPL-3.0 |
| Repo | https://github.com/drawhisper-org/komakun |

### 1.2 Completed Features

- **Landing page** — Hero with manga card showcase, feature grid, translation showcase, workflow zigzag timeline, community CTA, Ko-fi button, email collection (Resend API)
- **Home view** — Multi-project dashboard with grid/list views, sort (alphabetical / date-created / last-viewed), filter (all / starred), language switcher
- **Multi-project persistence** — `projects-list-store` (localStorage metadata + tiny thumbnails) + per-project IndexedDB snapshots, save/switch/create/delete
- **Editor layout** — Left sidebar (pages + layers, collapsible, flex-sharing), right sidebar (AI actions + design panel), bottom toolbar, center canvas area
- **Page management** — Add images (sorted by filename, natural ordering), 2-column sidebar grid with @dnd-kit drag reorder, full-screen Manage Pages view (4-column default, delete, drag overlay), 80-page / 5MB limits
- **Settings modal** — Theme mode (light/dark/system), accent color swatches, AI provider/model/key config (with validation), watermark upload, import/export .koma
- **i18n** — All UI strings translated across 4 locales with native-speaker quality
- **Theme system** — MD3 CSS variables, dynamic accent color, `next-themes` integration
- **User profile** — First/last name, avatar upload, CJK-aware display name formatting

### 1.3 Data Architecture

```
stores/
  app-config-store.ts           → localStorage (theme, AI config, watermark)
  projects-list-store.ts        → localStorage (ProjectSummary[] with tiny thumbnails)
  project-store.ts              → IndexedDB via idb-keyval (active project + per-project snapshots)
  user-store.ts                 → localStorage (first/last name, avatar)
  locale-store.ts               → localStorage (selected locale)
  editor-selection-store.ts     → ephemeral (selected block/stroke, multi-select)
  history-store.ts              → ephemeral (per-page undo/redo stacks, 30 steps)
  layer-visibility-store.ts     → ephemeral (toggled layer visibility)
  ocr-store.ts                  → ephemeral (OCR loading state, pending selection)
```

---

## Phase 2 — Canvas & Visual Editing ✅

Everything in this phase is **complete and shipped**, exceeding original spec.

### 2.1 Canvas Rendering ✅

- `react-konva` Stage with `originalImageBase64` on Background layer
- Aspect ratio maintained, auto-fit on page load
- Dark background behind the image

### 2.2 Pan & Zoom ✅

- Mouse wheel → zoom (10%–500%)
- Middle-click drag or Space+drag → pan
- Zoom % displayed in bottom toolbar
- Fit-to-screen button (auto-triggers on page change)

### 2.3 Layer System (7 Konva Layers) ✅

Exceeds original spec of 4 layers:

1. **Original Image Layer** — `Konva.Image` of `originalImageBase64`
2. **Cleaned Background Layer** — `Konva.Image` of `cleanedImageBase64`
3. **Bounding Boxes Layer** — `ResizableBlockRect` for each `TextBlock` (OCR + manual)
4. **Text Nodes Layer** — `TextBlockNode` rendered text (horizontal + vertical)
5. **Inpaint Strokes Layer** — `Line` elements for freehand brush strokes
6. **Watermark Layer** — `Konva.Image` bottom-right (size/opacity configurable)
7. **Selection Overlay Layer** — Drag-select rect, rect/lasso drawing, marching-ants

Each layer's visibility is toggleable from the left sidebar Layers panel (`EyeIcon` toggle).

### 2.4 Text Node Interaction ✅

- Click → select (Konva `Transformer` with rotation + 8 resize anchors)
- Drag to reposition, corner handles to resize
- Multi-select via drag-rectangle or Shift+click
- Bulk drag-move: dragging one block in a multi-selection moves all together
- Arrow key nudge: 1px, Shift+Arrow = 10px (all selected blocks)
- Backspace/Delete removes selected block(s) or inpaint stroke
- Selected node highlights in right sidebar text blocks list

### 2.5 Bottom Toolbar ✅

- **Tool selector** with grouped dropdowns (Figma-style):
  - Move group: Select (`V`), Hand (`H`)
  - Selection group: Rect Select (`M`), Lasso Select (`L`)
  - Inpaint Brush (`I`) with brush size popover (2–80px)
  - Text Tool (`T`) — drag-to-create manual blocks
- **Zoom controls** — zoom in/out buttons, zoom %, fit-to-screen
- **Page navigation** — prev/next buttons, "Page N / Total" indicator
- **Single-letter shortcuts** (Photoshop/Figma convention, no modifier key needed)

---

## Phase 3 — AI Pipeline Integration ✅

Core pipeline is **complete and shipped**. Batch processing is the remaining item.

### 3.1 OCR (Google Cloud Vision) ✅

- `DOCUMENT_TEXT_DETECTION` with language hints (ja/zh/ko/en)
- Full-page OCR: detects all text regions with bounding polygons
- Region OCR: rect-select or lasso-select a canvas area → crop + mask → OCR just that region
- Creates `TextBlock` entries automatically with detected text and positions
- Progress spinner, success/failure toast
- Vercel Analytics tracking for OCR events

### 3.2 Background Cleaning (LaMa Inpainting) ✅

- **Cloud:** Replicate API (LaMa model)
- **Local:** User-configurable local endpoint (OpenAI-compatible)
- Mask generation from OCR bounding boxes + freehand inpaint strokes
- Iterative cleaning: re-clean from already-cleaned image when cleaned layer is visible
- Stores result as `cleanedImageBase64` on the page
- Inpaint strokes persisted per-page, selectable and deletable
- Undo/redo captures cleaned image state

### 3.3 Auto Translation ✅

- LangChain structured output with Zod schema validation
- Manga-specific system prompt (preserves tone, honorifics, SFX conventions)
- Text type classification by LLM: `speech` / `narration` / `sfx`
- Auto vertical text direction for CJK target languages
- 24 target languages supported

| Provider | Models |
|---|---|
| Google (Gemini) | Gemini 3 Flash Preview, Gemini 2.5 Flash, Gemini 3.1 Pro Preview |
| OpenAI | GPT-5.2, GPT-5 Mini, GPT-4.1, GPT-5.2 Pro |
| OpenRouter | Dynamic top-50 weekly (structured output filter) |
| Replicate | DeepSeek V3.1, GPT-5.2, GPT-4.1, Gemini 2.5 Flash, Kimi K2.5 |
| Local (OpenAI-compatible) | User-specified model at localhost endpoint |

### 3.4 Batch Processing ❌

- "Process All Pages" button: **not started**
- Sequential OCR → Clean → Translate pipeline: **not started**
- Batch progress bar + cancel: **not started**

---

## Phase 4 — Typography & Typesetting ✅

Font system and typography controls far exceed the original spec.

### 4.1 Font System ✅

5 local bundled fonts (woff2) + 45+ Google Fonts CDN fonts across 6 categories:

| Category | Fonts |
|---|---|
| **Local (bundled)** | Comic Neue Regular/Bold, Bangers, Permanent Marker, Patrick Hand |
| **Comic** | Bangers, Comic Neue, Permanent Marker, Bungee, Luckiest Guy, Rubik Bubbles, Fredoka |
| **Handwriting** | Patrick Hand, Caveat, Indie Flower, Shadows Into Light, Gloria Hallelujah |
| **Japanese (13)** | Noto Sans JP, Klee One, Yuji Syuku, Kaisei Decol, Reggae One, RocknRoll One, Noto Serif JP, Zen Maru Gothic, M PLUS Rounded 1c, Kosugi Maru, Zen Kaku Gothic New, Zen Old Mincho, Hachi Maru Pop |
| **Chinese (12)** | Noto Sans SC/TC, Noto Serif SC/TC, ZCOOL QingKe HuangYou, Ma Shan Zheng, LXGW WenKai TC, LXGW WenKai, Zhi Mang Xing, Long Cang, ZCOOL KuaiLe, ZCOOL XiaoWei |
| **Korean (11)** | Noto Sans KR, Noto Serif KR, Black Han Sans, Jua, Do Hyeon, Sunflower, Gamja Flower, Gaegu, Hi Melody, Poor Story, Cute Font |
| **System** | sans-serif, serif |

Recent fonts tracking for quick access.

### 4.2 Typography Controls ✅

Full Design Panel in right sidebar — per-text-block controls:

- Font family (grouped dropdown with recent fonts, comic, handwriting, JP, CN, KR, system)
- Bold / Italic toggles
- Font size (6–200)
- Line height / Column gap (0.5–4.0)
- Letter spacing (-10–50)
- Font color (color picker + hex input)
- Rotation (-360°–360°)
- Stroke enabled + stroke width (1–20)
- Text direction: Horizontal / Vertical
- Text alignment: Left / Center / Right (contextual icons for vertical mode)
- Content alignment: Top / Middle / Bottom (vertical positioning within bounding box)

Bulk editing: all controls apply to multi-selected blocks simultaneously.

### 4.3 Vertical Text Rendering ✅

Special handling for Japanese/Chinese vertical typesetting:

- Tate-chu-yoko (vertical text in horizontal lines)
- Em-dash rotation and centering
- Ellipsis (…) vertical stacking with special dot rendering
- Wave dash (〜) rotation
- Fullwidth punctuation positioning
- Mixed CJK + Latin character handling

### 4.4 Content Alignment ✅

- **Top / Middle / Bottom** positioning of text within the bounding box
- Works for both horizontal and vertical text
- Applied consistently on canvas rendering and in export

### 4.5 Custom Font Upload ❌

- `.ttf` / `.otf` upload UI: **not started**

---

## Phase 5 — Export & Distribution ✅

Core export capabilities are **complete and shipped**.

### 5.1 PNG Export ✅

- `exportPageAsPng()` — single page as flattened PNG (all visible layers composited + watermark)
- `exportProjectAsZip()` — all pages as numbered PNGs in ZIP
- Watermark compositing with configurable position, size, and opacity
- WYSIWYG rendering (horizontal + vertical text, content alignment, stroke, all typography)

### 5.2 Layered PSD Export ✅

- `exportPageAsPsd()` — single page PSD with separated layers:
  - Original Image → Cleaned Background → Inpaint Strokes → Text Layer
- `exportProjectAsPsdZip()` — all pages as layered PSDs in ZIP
- Text rendered as rasterized layer (preserving all typography)

### 5.3 Project File (.koma) ✅

- JSON serialization of full project state
- Import/export via right sidebar dropdown
- Re-import restores all pages, text blocks, cleaned images, and inpaint strokes

### 5.4 Resolution Options ❌

- Export at custom DPI / resolution multiplier: **not started**

---

## Phase 6 — Polish & Community (Partial)

### 6.1 Keyboard Shortcuts ✅

**Tool shortcuts** — single letter, no modifier (Photoshop/Figma convention):

| Tool | Key |
|---|---|
| Select | `V` |
| Hand | `H` |
| Rect Select | `M` |
| Lasso Select | `L` |
| Inpaint | `I` |
| Text | `T` |

**Editor shortcuts:**

| Action | Shortcut |
|---|---|
| Undo | `⌘Z` / `Ctrl+Z` |
| Redo | `⌘⇧Z` / `Ctrl+Shift+Z` / `Ctrl+Y` |
| Delete selected | `Backspace` / `Delete` |
| Nudge 1px | Arrow keys |
| Nudge 10px | Shift + Arrow keys |
| Pan (hold) | `Space` |
| Zoom in/out | Mouse wheel |
| Next/prev page | Bottom toolbar buttons |

### 6.2 Drag & Drop Import ❌

- Global dropzone (drag images onto window): **not started**
- Folder bulk-import: **not started**

### 6.3 Performance Optimization ❌

- Virtual scrolling for pages list: **not started**
- Web Worker for image processing: **not started**
- Offscreen thumbnail generation: **not started**
- Lazy-load page thumbnails: **not started**

### 6.4 Accessibility & PWA ❌

- PWA manifest + service worker: **not started**
- Installable desktop app: **not started**
- Comprehensive ARIA labels: **not started**

---

## TextBlock Data Model

```typescript
interface TextBlock {
  id: string;
  type: "speech" | "narration" | "sfx";
  source?: "ocr" | "manual";
  originalText: string;
  translatedText: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  rotation?: number;                          // degrees, default 0
  fontFamily?: string;                        // default "Comic Neue"
  fontColor?: string;                         // default "#000000"
  textAlign?: "left" | "center" | "right";    // default "center"
  lineHeight?: number;                        // default 1.2
  textDirection?: "horizontal" | "vertical";  // default "horizontal"
  fontWeight?: "normal" | "bold";
  fontStyle?: "normal" | "italic";
  letterSpacing?: number;                     // pixels, default 0
  strokeEnabled?: boolean;                    // white outline, default false
  strokeWidth?: number;                       // pixels, default 4
  contentAlign?: "top" | "middle" | "bottom"; // default "middle"
  boundingPoly?: { x: number; y: number }[];
}
```

---

## Settings Architecture

| Tab | Settings |
|---|---|
| **Appearance** | Language (4 locales), Color mode (light/dark/system), Theme accent (8+ color swatches) |
| **AI** | Translation provider + model + API key (with validation), Vision API key, Replicate API key, Inpaint mode (Replicate/Local), Local inpaint URL, Local LLM URL + model, Target language (24 languages) |
| **Watermark** | Enable/disable, image upload (base64), size (small/default/large), opacity slider |

---

## Completion Summary

| Phase | Status | Done | Not Started |
|---|---|---|---|
| **Phase 1** — Shell & Pages | ✅ Complete | 9/9 | 0 |
| **Phase 2** — Canvas & Editing | ✅ Complete | 6/6 | 0 |
| **Phase 3** — AI Pipeline | ✅ Mostly | 3/4 | 1 |
| **Phase 4** — Typography | ✅ Mostly | 4/5 | 1 |
| **Phase 5** — Export | ✅ Mostly | 3/4 | 1 |
| **Phase 6** — Polish | ⚠️ Partial | 1/4 | 3 |

**Overall: ~26/32 items complete, 6 remaining.**

---

## Phase 7 — Future Improvements

Prioritized improvements for the next development cycle.

### 🔴 High Priority

#### 7.1 Batch Processing Pipeline
- "Process All Pages" button in right sidebar
- Sequential OCR → Clean → Translate for every page
- Progress bar with current page / total
- Cancel mid-batch support
- Per-page error handling (skip failures, continue)

#### 7.2 Global Drag & Drop Import
- Global dropzone overlay when dragging files onto the browser window
- Support multiple images and folder drag
- Show preview of files before import
- Auto-sort by filename (existing `localeCompare` logic)

#### 7.3 Smart Text Fitting
- Auto-size font to fit within detected bubble bounding box
- Configurable padding/margins within bounding box
- Overflow indicator (warning icon when text exceeds box)
- Optional auto-shrink mode: reduce font size until text fits

#### 7.4 Custom Font Upload ✅
- Upload `.ttf` / `.otf` / `.woff2` files via settings or design panel
- Store font data in IndexedDB (persists across sessions)
- Register uploaded fonts in the font picker under "Custom" category
- Font file size limit (e.g., 5MB per font)

### 🟡 Medium Priority

#### 7.5 Export Resolution Options
- Resolution multiplier selector: 1×, 2×, 3× in export dropdown
- Custom DPI input for print-ready output
- Apply to both PNG and PSD exports

#### 7.6 Bubble Detection & Auto-Layout
- AI-powered speech bubble boundary detection (separate from text OCR)
- Auto-size text blocks to fit bubble contours
- Smart text reflow within irregular bubble shapes
- Bubble-aware font size suggestion

#### 7.7 SFX Preservation Mode
- Option to keep SFX in original language (common in scanlation)
- "Skip SFX" toggle during translation
- SFX-specific font presets (impact, bold, rotated)

#### 7.8 Project Templates
- Save typesetting presets (font, size, color, direction) as named templates
- Apply template to all blocks on a page or project-wide
- Share templates via exportable JSON

#### 7.9 Collaboration & Sharing
- Shareable project links (read-only or editable)
- Real-time collaborative editing (WebSocket/CRDT)
- Comment system for translation review

### 🟢 Low Priority (Polish)

#### 7.10 Performance Optimization
- Virtual scrolling for pages list (> 20 pages)
- Web Worker for image processing (base64 encoding, resizing, mask generation)
- Offscreen canvas for sidebar thumbnail generation
- Lazy-load page thumbnails (only render visible ones)
- Canvas rendering optimization: viewport culling for off-screen blocks

#### 7.11 PWA & Offline
- PWA manifest + service worker for offline capability
- Installable as desktop app via Chrome/Edge
- Offline-capable for typesetting (no AI, but editing works)
- Background sync for AI operations when back online

#### 7.12 Accessibility
- Comprehensive ARIA labels on all interactive elements
- Full keyboard navigation for sidebar, canvas tools, panels
- Screen reader announcements for tool changes and operations
- High-contrast mode support

#### 7.13 Advanced Typography
- Rich text within a single block (mixed bold/italic/color spans)
- Text-on-path for curved bubble text
- Furigana / ruby text support for Japanese
- Auto-hyphenation for long English words in narrow bubbles

#### 7.14 Version History
- Named checkpoints / save points per project
- Visual diff between versions (overlay comparison)
- Restore any previous checkpoint

#### 7.15 Plugin / Extension System
- User-installable plugins for custom AI providers
- Custom export formats (EPUB, CBZ, PDF)
- Community plugin marketplace

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
9. **Single-letter tool shortcuts.** Photoshop/Figma convention — `V`, `H`, `M`, `L`, `I`, `T`. No modifier key.
10. **Per-page undo/redo.** Each page maintains its own history stack (30 steps max). Snapshots include text blocks, inpaint strokes, and cleaned image.