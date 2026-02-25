# KomaFlip MVP (Open Source Edition)

**Vision:** A professional AI-powered Web IDE for comic/manga translation, cleaning, and typesetting.
**Design Language:** A tri-blend aesthetic combining the modern AI vibe of **Krea.ai** (floating glassmorphism), the elegance of **Kling AI** (refined typography and smooth transitions), and the professional utility of **Figma** (dense, functional property panels), powered by **Material Design 3 (MD3)** dynamic color tokens.

## 1. Tech Stack (Strict Requirements)

- **Framework:** Next.js (App Router), React 18+ (or latest stable version)
- **Styling:** Tailwind CSS, shadcn/ui, `next-themes` (for color mode switching)
- **State Management:** Zustand with `persist` middleware. **Dual-Store Strategy:** `localStorage` for app configs, and `idb-keyval` (IndexedDB) for heavy project data.
- **Canvas Engine:** `react-konva` (Strict requirement for 2D rendering, layered editing)
- **Drag & Drop Reordering:** `framer-motion` (Use `<Reorder.Group>` and `<Reorder.Item>` strictly. Do NOT use dnd-kit).
- **Icons:** `@phosphor-icons/react` (Mandatory: Always use `weight="fill"`)
- **Exporting:** `ag-psd` (To generate layered PSD files) & native Canvas `toDataURL` for PNG.

## 2. Core Layout & UI Architecture (Krea x Kling x Figma)

The UI must feel like a native desktop design application. Full-bleed canvas background with floating, elegantly blurred tool panels.

### 2.1 Top Navbar (The Control Bar - Figma Style)

- **Vibe:** Compact, functional, horizontally aligned.
- **Left:** * Logo / Brand (Elegant typography).
    - **Project Title:** An inline-editable text input.
    - **"New Project" Button:** Ghost button style, clears the current project state.
- **Center:** Viewport controls (Zoom %, Hand Tool, Select Tool). Segmented control style.
- **Right:** * **Export Current Page:** (Dropdown: PNG, Layered PSD). Primary button styling.

### 2.2 Center Workspace (The Canvas & Dropzone - Kling Style)

- **Empty State (No Project):** Vibe: Pure elegance. A massive, visually appealing Dropzone area. Prompt: "Drag & Drop comic pages here to start (Max 80 pages, 5MB/page)".
- **Active State (Project Created):** * The `react-konva` Stage takes over the full screen (rendered behind the floating sidebars).
    - Dropping new images onto the active canvas appends them sequentially.
    - Supports mouse wheel to zoom, middle-click to pan.
    - Text nodes are freely draggable and selectable.
    - **Watermark overlay:** Auto-render the watermark image at the bottom-right corner if configured.

### 2.3 Left Sidebar (Pages, Layers & Nav - Krea Style)

- **Vibe:** A floating glassmorphism panel (`absolute z-10 m-4 rounded-2xl backdrop-blur-xl bg-surface/80 border border-outlineVariant/50 shadow-2xl`).
- **Top Navigation Icons:**
    - Icons for "Workspace" (Active) and **"Settings"** (Triggers Settings View).
- **Middle: Pages / Thumbnails**
    - Displays uploaded images as PDF-like thumbnails. Maximum 80 pages allowed.
    - Must use `framer-motion`'s `Reorder.Group`. Active page has a sleek, glowing border accent (`border-primary`).
- **Bottom: Layers (For active page)**
    - Professional layer stack (Figma-like density).
    - `[Watermark Layer]` -> `[Text Nodes Layer]` -> `[Cleaned Background]` -> `[Original Image]`.

### 2.4 Right Sidebar (Inspector & Translation Panel)

- **Vibe:** Floating glassmorphism panel on the right. Dense but readable.
- **Top Section: AI Actions**
    - Premium, glowing buttons: "Run OCR", "Clean Background", "Auto Translate".
- **Middle Section: Text Blocks List**
    - Categories: Speech Bubbles, Narration, SFX.
    - Each card has: `Original Text` (Read-only), `Translated Text` (Textarea).
- **Bottom Section: Typography Inspector**
    - Controls: Font Family, Font Size, Line Height, Color, Alignment.

### 2.5 Settings View (Full Page Overlay / Modal)

Accessed via the Left Sidebar. This is the control center for API keys and appearance.

- **Appearance Section:**
    - **Color Mode:** Toggle between Dark, Light, and System.
    - **Theme Accent:** Provide color swatches (e.g., Yellow `#FBC02D`, Amber `#FFA000`, Purple, etc.) that instantly apply MD3 color tokens globally.
- **AI Configuration Section:**
    - Provider Dropdown (Google, OpenAI, Anthropic).
    - Model Dropdown (dynamically populated based on Provider).
    - API Key Input (Password field format).
    - **"Validate & Save" Button:** *Crucial Logic.* Before applying a new API key or switching models, the app MUST make a lightweight validation request (e.g., a 1-token generation or model list fetch). If it fails, show an error toast and revert the change. If it succeeds, save to `AppConfigStore`.
- **Watermark Settings:** Upload group logo, set size.
- **Project Management:** Import / Export `.koma` project files here.

## 3. Data Model (Dual Zustand Stores)

**Store 1: App Config Store (Lightweight, uses standard `localStorage`)**

```
type ThemeConfig = {
  mode: 'light' | 'dark' | 'system';
  accentColor: string; // e.g., '#FBC02D'
}

type WatermarkConfig = {
  enabled: boolean;
  imageBase64: string | null;
  size: 'small' | 'default' | 'large';
}

type AppConfigStore = {
  theme: ThemeConfig;
  aiProvider: string;
  aiModel: string;
  apiKeys: Record<string, string>;
  watermark: WatermarkConfig;

  // Actions
  setTheme: (theme: Partial<ThemeConfig>) => void;
  // Must perform async validation before actually updating state
  validateAndSetAIConfig: (provider: string, model: string, key: string) => Promise<boolean>;
}
```

**Store 2: Project Store (Heavyweight, MUST use `idb-keyval` IndexedDB)**

```
type TextBlock = {
  id: string; type: 'speech' | 'narration' | 'sfx';
  originalText: string; translatedText: string;
  x: number; y: number; width: number; height: number; fontSize: number;
}

type PageState = {
  id: string; fileName: string;
  originalImageBase64: string; cleanedImageBase64: string | null;
  textBlocks: TextBlock[];
}

type ProjectStore = {
  projectId: string | null; projectName: string;
  pages: PageState[]; activePageId: string | null;

  addPages: (files: File[]) => Promise<void>;
  reorderPages: (newOrder: PageState[]) => void;
}
```

## 4. AI Coding Skills & Instructions (For Vibe-Coding)

When generating code, the AI agent MUST adhere to these skills:

- **[Skill 1] The Tri-Blend Aesthetic:** Sidebars MUST be floating over the canvas (`absolute z-10 m-4 rounded-2xl backdrop-blur-xl bg-surface/80 border border-outlineVariant/50 shadow-2xl`). Use elegant, high-contrast typography (`text-onSurface` for primary). Figma Vibe (Inputs & Density): Inside panels, use compact margins and minimal radiuses.
- **[Skill 2] Phosphor Icons Strictly:** NEVER use lucide-react. Install `@phosphor-icons/react` and use `weight="fill"`. Always import icons with the `Icon` suffix (e.g., `import { CloudArrowUpIcon, StackIcon } from "@phosphor-icons/react"`).
- **[Skill 3] Custom Scrollbars:** Implement sleek, minimal custom scrollbars for sidebars.
- **[Skill 4] IndexedDB Persistence (CRITICAL):** Do NOT use standard `localStorage` for `useProjectStore`. You MUST implement a custom storage engine using `idb-keyval` for Zustand's `persist`.
- **[Skill 5] Framer Motion Reorder:** Use `import { Reorder } from "framer-motion"` strictly for the left sidebar page thumbnails. Do NOT use dnd-kit.
- **[Skill 6] Global Dropzone & Project Init:** Implement a global drag-and-drop listener. Enforce a hard limit of 80 pages per project and 5MB per image file.
- **[Skill 7] Async Collaboration via JSON (.koma):** Implement JSON serialization/deserialization in the Settings view to export and import the **Project Store** state.
- **[Skill 8] Watermark Rendering:** Add a `Konva.Image` node on the Canvas bound to the bottom-right corner.
- **[Skill 9] Konva Layer Separation:** Strictly separate Konva `<Layer>` components (Background, Text, Watermark).
- **[Skill 10] Dynamic Theming (MD3 CSS Variables):** Do not hardcode colors like `bg-zinc-900`. Use CSS variables in `globals.css` mapped to Tailwind config. Generate RGB variables for `primary`, `onPrimary`, `primaryContainer`, `surface`, `onSurface`, `surfaceVariant`, etc., according to Material Design 3 specs. When a user changes the `accentColor` in settings, update the CSS variables on the `:root` element programmatically to switch themes dynamically. Use `next-themes` to handle the `.dark` class toggling.