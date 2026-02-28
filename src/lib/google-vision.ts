/**
 * Google Cloud Vision API client for OCR text detection.
 * Uses DOCUMENT_TEXT_DETECTION for structural block-level detection.
 *
 * Docs: https://cloud.google.com/vision/docs/ocr
 */

/* ── Public types ── */

export interface OcrTextBlock {
  text: string;
  type: "speech" | "narration" | "sfx";
  x: number;
  y: number;
  width: number;
  height: number;
  boundingPoly: { x: number; y: number }[];
}

export interface OcrResult {
  blocks: OcrTextBlock[];
  fullText: string;
}

/* ── Main API ── */

/**
 * Validate a Vision API key by making a minimal annotate request.
 */
export async function validateVisionKey(
  apiKey: string
): Promise<{ valid: boolean; error?: string }> {
  if (!apiKey.trim()) return { valid: false, error: "API key is required" };
  try {
    const res = await fetch("/api/vision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey, mode: "validate" }),
    });
    if (res.ok) return { valid: true };
    let data: Record<string, unknown> | null = null;
    try { data = await res.json(); } catch { /* non-JSON response */ }
    return {
      valid: false,
      error: (data?.error as string) || `HTTP ${res.status}`,
    };
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}

/**
 * Detect text in an image using Google Cloud Vision API.
 * Returns structured text blocks with bounding boxes.
 */
export async function detectText(
  imageBase64: string,
  apiKey: string
): Promise<OcrResult> {
  if (!apiKey) throw new Error("Vision API key is not configured");

  const response = await fetch("/api/vision", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey, imageBase64, mode: "detect" }),
  });

  // Safe JSON parsing — platform may return non-JSON errors (e.g. 413)
  const text = await response.text();
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      response.status === 413
        ? "Image is too large for the server. Try using a smaller image."
        : `Vision API error: ${response.status} — ${text.slice(0, 120)}`
    );
  }

  if (!response.ok) {
    throw new Error((data.error as string) || `Vision API error: ${response.status}`);
  }

  return parseVisionResponse(data);
}

/**
 * Crop a rectangular region from a base64 image.
 * Returns a new base64 PNG of the cropped area.
 */
export function cropImageRegion(
  imageBase64: string,
  x: number,
  y: number,
  width: number,
  height: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas context failed"));
      ctx.drawImage(img, x, y, width, height, 0, 0, width, height);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = imageBase64;
  });
}

/**
 * Crop and mask a region from a base64 image using a polygon.
 * Pixels outside the polygon (but inside the bounding box) are filled white.
 * lassoPoints is a flat array [x0,y0,x1,y1,...] in image-space coords.
 */
export function cropAndMaskRegion(
  imageBase64: string,
  x: number,
  y: number,
  width: number,
  height: number,
  lassoPoints: number[]
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas context failed"));

      // Fill background white (masked area)
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, width, height);

      // Clip to the lasso polygon then draw the image
      ctx.save();
      ctx.beginPath();
      for (let i = 0; i < lassoPoints.length; i += 2) {
        const px = lassoPoints[i] - x;
        const py = lassoPoints[i + 1] - y;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.clip();

      // Draw the cropped portion of the image inside the clipped region
      ctx.drawImage(img, x, y, width, height, 0, 0, width, height);
      ctx.restore();

      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = imageBase64;
  });
}

/* ── Response parsing ── */

/**
 * All OCR blocks default to "speech" — classification happens during
 * translation so the LLM can use full context (neighbouring blocks,
 * sentence boundary, etc.) instead of heuristic katakana-ratio checks
 * that mis-classify vertical-column text fragments as SFX.
 */
function classifyBlock(_text: string): "speech" | "narration" | "sfx" {
  return "speech";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseVisionResponse(data: any): OcrResult {
  const blocks: OcrTextBlock[] = [];
  const fullTextAnnotation = data.responses?.[0]?.fullTextAnnotation;
  const fullText: string = fullTextAnnotation?.text ?? "";

  const pageBlocks = fullTextAnnotation?.pages?.[0]?.blocks;
  if (!pageBlocks) return { blocks, fullText };

  for (const block of pageBlocks) {
    if (block.blockType && block.blockType !== "TEXT") continue;

    const vertices = block.boundingBox?.vertices;
    if (!vertices || vertices.length < 4) continue;

    // Concatenate: blocks → paragraphs → words → symbols
    const text = (block.paragraphs ?? [])
      .map((p: { words?: { symbols?: { text?: string }[] }[] }) =>
        (p.words ?? [])
          .map((w) => (w.symbols ?? []).map((s) => s.text ?? "").join(""))
          .join("")
      )
      .join("\n");

    if (!text.trim()) continue;

    const xs = vertices.map((v: { x?: number }) => v.x ?? 0);
    const ys = vertices.map((v: { y?: number }) => v.y ?? 0);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);

    blocks.push({
      text,
      type: classifyBlock(text),
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      boundingPoly: vertices.map((v: { x?: number; y?: number }) => ({
        x: v.x ?? 0,
        y: v.y ?? 0,
      })),
    });
  }

  // Group nearby blocks that likely belong to the same speech bubble.
  // Vertical text gets split into per-column blocks by the OCR engine;
  // grouping those back together avoids SFX misclassification and keeps
  // the translation context intact.
  const grouped = groupNearbyBlocks(blocks);

  // Sort by manga reading order: right-to-left, top-to-bottom
  grouped.sort((a, b) => {
    const yTolerance = 50;
    if (Math.abs(a.y - b.y) < yTolerance) {
      return b.x - a.x; // Right to left
    }
    return a.y - b.y; // Top to bottom
  });

  return { blocks: grouped, fullText };
}

/**
 * Decide whether two OCR blocks should be merged into one text block.
 *
 * Three filters keep false merges out:
 *  1. **Size filter** – rejects furigana / 注音 annotations where one block
 *     is much smaller than the other (area ratio < 0.2, or one dimension
 *     is disproportionately thin).
 *  2. **Proximity filter** – both horizontal and vertical gaps must be small
 *     relative to the smaller block's dimensions (GAP_RATIO = 0.35).
 *  3. **Alignment filter** – at least one axis must have ≥ 50 % overlap
 *     relative to the smaller dimension.  This rules out "stair-step"
 *     patterns where two separate bubbles sit diagonally.
 */
function shouldMergeBlocks(a: OcrTextBlock, b: OcrTextBlock): boolean {
  // ── 1. Furigana / annotation size filter ──────────────────────────
  const areaA = a.width * a.height;
  const areaB = b.width * b.height;
  const areaRatio = Math.min(areaA, areaB) / Math.max(areaA, areaB);
  if (areaRatio < 0.2) return false;

  const wRatio = Math.min(a.width, b.width) / Math.max(a.width, b.width);
  const hRatio = Math.min(a.height, b.height) / Math.max(a.height, b.height);
  // Vertical furigana: much narrower but similar height, AND small area
  if (wRatio < 0.35 && hRatio > 0.4 && areaRatio < 0.4) return false;
  // Horizontal furigana: much shorter but similar width, AND small area
  if (hRatio < 0.35 && wRatio > 0.4 && areaRatio < 0.4) return false;

  // ── 2. Proximity filter ───────────────────────────────────────────
  const overlapX =
    Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const overlapY =
    Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  const gapX = Math.max(0, -overlapX);
  const gapY = Math.max(0, -overlapY);
  const smallerW = Math.min(a.width, b.width);
  const smallerH = Math.min(a.height, b.height);

  const GAP_RATIO = 0.35;
  if (gapX > smallerW * GAP_RATIO || gapY > smallerH * GAP_RATIO) {
    return false;
  }

  // ── 3. Alignment filter (rules out diagonal stair-step) ──────────
  const alignX = overlapX > 0 ? overlapX / smallerW : 0;
  const alignY = overlapY > 0 ? overlapY / smallerH : 0;
  if (alignX < 0.5 && alignY < 0.5) return false;

  return true;
}

/**
 * Merge OCR blocks whose bounding boxes belong to the same speech bubble.
 * Uses union-find with {@link shouldMergeBlocks} as the pairwise predicate.
 */
function groupNearbyBlocks(blocks: OcrTextBlock[]): OcrTextBlock[] {
  if (blocks.length <= 1) return blocks;

  // Union-find
  const parent = blocks.map((_, i) => i);
  function find(i: number): number {
    while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; }
    return i;
  }
  function union(a: number, b: number) {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  }

  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      if (shouldMergeBlocks(blocks[i], blocks[j])) {
        union(i, j);
      }
    }
  }

  // Collect groups
  const groups = new Map<number, number[]>();
  for (let i = 0; i < blocks.length; i++) {
    const root = find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(i);
  }

  const result: OcrTextBlock[] = [];
  for (const indices of groups.values()) {
    if (indices.length === 1) {
      result.push(blocks[indices[0]]);
      continue;
    }
    // Merge: union bounding box, concatenate text in right-to-left then top-to-bottom order
    const members = indices.map((i) => blocks[i]);
    members.sort((a, b) => {
      const yTol = 30;
      if (Math.abs(a.y - b.y) < yTol) return b.x - a.x;
      return a.y - b.y;
    });
    const minX = Math.min(...members.map((b) => b.x));
    const minY = Math.min(...members.map((b) => b.y));
    const maxX = Math.max(...members.map((b) => b.x + b.width));
    const maxY = Math.max(...members.map((b) => b.y + b.height));
    result.push({
      text: members.map((b) => b.text).join(""),
      type: "speech",
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      // Use bounding rect vertices instead of original polygon
      boundingPoly: [
        { x: minX, y: minY },
        { x: maxX, y: minY },
        { x: maxX, y: maxY },
        { x: minX, y: maxY },
      ],
    });
  }
  return result;
}
