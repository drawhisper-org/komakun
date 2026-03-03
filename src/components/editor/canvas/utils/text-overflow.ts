/**
 * Text overflow detection and auto-fit font size utilities.
 * Used by ResizableBlockRect (overflow warning) and the right sidebar (auto-fit).
 */

import type { TextBlock } from "@/stores/project-store";
import { normalizeMangaText, tokenizeVertical, tokenCellCount } from "./vertical-text";

/* ── Off-screen measurement ── */

/** Shared off-screen canvas for text measurement */
let _measureCanvas: HTMLCanvasElement | null = null;
function getMeasureCtx(): CanvasRenderingContext2D {
  if (!_measureCanvas) _measureCanvas = document.createElement("canvas");
  return _measureCanvas.getContext("2d")!;
}

/**
 * CJK-aware word-wrap for off-screen measurement — mirrors export-utils wrapText.
 */
const CJK_RANGE_RE =
  /[\u2E80-\u2FFF\u3000-\u303F\u3040-\u309F\u30A0-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFFEF]/;

function tokeniseForWrap(text: string): string[] {
  const tokens: string[] = [];
  let buf = "";
  for (const ch of text) {
    if (CJK_RANGE_RE.test(ch)) {
      if (buf) { tokens.push(buf); buf = ""; }
      tokens.push(ch);
    } else if (/\s/.test(ch)) {
      if (buf) { tokens.push(buf); buf = ""; }
      tokens.push(ch);
    } else if (ch === "-") {
      buf += ch;
      tokens.push(buf);
      buf = "";
    } else {
      buf += ch;
    }
  }
  if (buf) tokens.push(buf);
  return tokens;
}

function measureWrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): number {
  const paragraphs = text.split("\n");
  let lineCount = 0;
  for (const para of paragraphs) {
    const tokens = tokeniseForWrap(para);
    let currentLine = "";
    for (const token of tokens) {
      if (!currentLine && /^\s+$/.test(token)) continue;
      const testLine = currentLine + token;
      if (ctx.measureText(testLine).width > maxWidth && currentLine) {
        lineCount++;
        currentLine = /^\s+$/.test(token) ? "" : token;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine && ctx.measureText(currentLine).width > maxWidth) {
      let charLine = "";
      for (const ch of currentLine) {
        const test = charLine + ch;
        if (ctx.measureText(test).width > maxWidth && charLine) {
          lineCount++;
          charLine = ch;
        } else {
          charLine = test;
        }
      }
      lineCount++;
    } else {
      lineCount++;
    }
  }
  return lineCount;
}

/**
 * Determine whether a TextBlock's content overflows its bounding box.
 * Returns true if text doesn't fit.
 */
export function isTextOverflowing(block: TextBlock): boolean {
  const displayText = block.translatedText || block.originalText;
  if (!displayText) return false;

  const pad = block.padding ?? 0;
  const innerW = Math.max(1, block.width - pad * 2);
  const innerH = Math.max(1, block.height - pad * 2);
  const fontSize = block.fontSize || 14;
  const lineH = block.lineHeight ?? 1.2;
  const letterSpacing = block.letterSpacing ?? 0;

  if (block.textDirection === "vertical") {
    const charH = fontSize * 1.15 + letterSpacing;
    const colW = fontSize * lineH;
    const charsPerCol = Math.max(1, Math.floor(innerH / charH));

    const normalizedText = normalizeMangaText(displayText);
    const segments = normalizedText.split("\n");
    let totalCols = 0;
    for (const seg of segments) {
      const tokens = tokenizeVertical(seg);
      if (tokens.length === 0) {
        totalCols++;
      } else {
        let cells = 0;
        let colCount = 0;
        for (const tok of tokens) {
          const c = tokenCellCount(tok);
          if (cells + c > charsPerCol && colCount > 0) {
            totalCols++;
            cells = 0;
          }
          if (cells === 0) colCount = 1;
          cells += c;
        }
        if (cells > 0) totalCols++;
      }
    }
    return totalCols * colW > innerW;
  }

  // Horizontal: measure text wrapping
  const ctx = getMeasureCtx();
  const fontFamily = block.fontFamily || "Comic Neue, sans-serif";
  const fontWeight = block.fontWeight || "normal";
  const fontStyle = block.fontStyle || "normal";
  ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
  // Always reset letterSpacing — the shared ctx retains the previous value
  if ("letterSpacing" in ctx) {
    (ctx as unknown as Record<string, string>).letterSpacing = `${letterSpacing}px`;
  }
  const lineCount = measureWrapLines(ctx, normalizeMangaText(displayText), innerW);
  const totalTextH = lineCount * fontSize * lineH;
  return totalTextH > innerH;
}

/**
 * Binary-search for the largest font size (integer) that fits the block
 * without overflowing. Returns the optimal fontSize, clamped to [4, currentFontSize].
 */
export function computeAutoFitFontSize(block: TextBlock): number {
  const MAX_FONT = 200;
  const MIN_FONT = 4;
  // Binary-search the largest font size that doesn't overflow.
  let lo = MIN_FONT;
  let hi = MAX_FONT;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const test = { ...block, fontSize: mid };
    if (isTextOverflowing(test)) {
      hi = mid - 1;
    } else {
      lo = mid;
    }
  }
  return lo;
}
