/**
 * Vertical manga text utilities — normalization, tokenization, and punctuation constants.
 * Shared between konva-stage.tsx (Konva rendering) and export-utils.ts (Canvas 2D export).
 */

/**
 * Normalize text for manga-style vertical typesetting:
 * - Replace sequences of periods/dots with proper ellipsis character (…)
 * - Keep punctuation pairs (like !?) intact for combined rendering
 */
export function normalizeMangaText(text: string): string {
  let s = text;
  // Normalize various dot sequences to ellipsis
  s = s.replace(/\.{3,}/g, "…");   // ... or more → …
  s = s.replace(/。{2,}/g, "…");    // 。。。 → …
  s = s.replace(/…{2,}/g, "……");   // Cap at double ellipsis (manga standard)
  // Remove spaces between adjacent punctuation marks (!?！？) so pairs combine.
  // Lookahead keeps the second mark unconsumed, so chained marks (！ ？ ！) fully collapse.
  s = s.replace(/([!?！？])\s+(?=[!?！？])/g, "$1");
  return s;
}

/** Punctuation pairs that should be rendered as tate-chu-yoko (横組み in vertical) */
export const COMBINED_PUNCT_RE = /^[!?！？]{2}$/;

/** Em-dash characters that should render as a vertical line in vertical layout */
export const EM_DASH_CHARS = new Set(["—", "─", "―", "ー"]);

/** Middle dot / interpunct characters used for manga ellipsis */
export const MIDDLE_DOT_CHARS = new Set(["·", "・", "‧", "⋅", "•"]);

/** Ellipsis character — each one expands to 3 dots in vertical layout */
export const ELLIPSIS_CHARS = new Set(["…", "⋯"]);

/** Wave dash characters that should be rotated 90° in vertical layout */
export const WAVE_DASH_CHARS = new Set(["~", "～", "〜"]);

/** Parentheses/brackets that should be rotated 90° in vertical layout */
export const PAREN_CHARS = new Set(["(", ")", "（", "）"]);

/** Single fullwidth punctuation that should be centered in its cell */
export const SINGLE_CENTER_PUNCT = new Set(["！", "？", "!", "?"]);

/** Fullwidth exclamation/question marks — need tighter rendering in pairs */
export const FULLWIDTH_PUNCT = new Set(["！", "？"]);

/** Convert fullwidth ！？ to halfwidth !? for rendering (removes glyph padding) */
export function toHalfwidthPunct(ch: string): string {
  if (ch === "！") return "!";
  if (ch === "？") return "?";
  return ch;
}

/**
 * Token types for vertical manga layout rendering.
 * - "char": normal single character
 * - "combined": punctuation pair rendered as tate-chu-yoko (!?, !!, etc.)
 * - "dots": consecutive middle dots rendered with tight spacing
 * - "dash": em-dash rendered as a continuous vertical line
 * - "wave": wave dash rotated 90°
 * - "paren": parentheses rotated 90°
 */
export type VToken =
  | { type: "char"; text: string }
  | { type: "combined"; text: string }
  | { type: "dots"; text: string; count: number }
  | { type: "dash"; count: number }
  | { type: "wave"; text: string }
  | { type: "paren"; text: string };

/**
 * Tokenize a string for vertical manga layout.
 * Groups punctuation pairs, consecutive middle dots, and em-dashes.
 */
export function tokenizeVertical(text: string): VToken[] {
  const chars = Array.from(text);
  const tokens: VToken[] = [];
  let i = 0;
  while (i < chars.length) {
    // Check for combined punctuation pairs
    if (i + 1 < chars.length) {
      const pair = chars[i] + chars[i + 1];
      if (COMBINED_PUNCT_RE.test(pair)) {
        tokens.push({ type: "combined", text: pair });
        i += 2;
        continue;
      }
    }
    // Check for consecutive em-dashes (——)
    if (EM_DASH_CHARS.has(chars[i])) {
      let count = 0;
      while (i < chars.length && EM_DASH_CHARS.has(chars[i])) { count++; i++; }
      tokens.push({ type: "dash", count });
      continue;
    }
    // Check for ellipsis characters (… each = 3 dots)
    if (ELLIPSIS_CHARS.has(chars[i])) {
      let dotCount = 0;
      while (i < chars.length && ELLIPSIS_CHARS.has(chars[i])) { dotCount += 3; i++; }
      tokens.push({ type: "dots", text: "·", count: dotCount });
      continue;
    }
    // Check for consecutive middle dots (···)
    if (MIDDLE_DOT_CHARS.has(chars[i])) {
      let count = 0;
      while (i < chars.length && MIDDLE_DOT_CHARS.has(chars[i])) { count++; i++; }
      tokens.push({ type: "dots", text: "·", count });
      continue;
    }
    // Check for wave dash (~, 〜) — rotated 90° in vertical
    if (WAVE_DASH_CHARS.has(chars[i])) {
      tokens.push({ type: "wave", text: chars[i] });
      i++;
      continue;
    }
    // Check for parentheses — rotated 90° in vertical
    if (PAREN_CHARS.has(chars[i])) {
      tokens.push({ type: "paren", text: chars[i] });
      i++;
      continue;
    }
    tokens.push({ type: "char", text: chars[i] });
    i++;
  }
  return tokens;
}

/** Count how many vertical cells a token occupies */
export function tokenCellCount(t: VToken): number {
  if (t.type === "dash") return t.count;
  if (t.type === "dots") return Math.ceil(t.count / 3); // 3 dots per cell (manga standard)
  return 1;
}
