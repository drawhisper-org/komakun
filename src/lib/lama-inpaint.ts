/**
 * LaMa image inpainting service.
 *
 * Supports two backends:
 *   - Replicate (cloud):  https://replicate.com/allenhooo/lama
 *   - Local LaMa service: user‑specified localhost endpoint
 *
 * Mask generation merges OCR bounding boxes + freehand inpaint strokes
 * into a single white‑on‑black binary mask image (data‑URL PNG).
 */

import type { PageState } from "@/stores/project-store";

/* ------------------------------------------------------------------ */
/*  Replicate API key validation                                       */
/* ------------------------------------------------------------------ */

/**
 * Validate a Replicate API key via our server-side proxy route
 * to avoid CORS issues with the Replicate API.
 */
export async function validateReplicateKey(
  apiKey: string
): Promise<{ valid: boolean; error?: string }> {
  if (!apiKey.trim()) {
    return { valid: false, error: "API key is required" };
  }
  try {
    const res = await fetch("/api/replicate/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey }),
    });
    const data = await res.json();
    return { valid: !!data.valid, error: data.error };
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}

/* ------------------------------------------------------------------ */
/*  Mask generation                                                    */
/* ------------------------------------------------------------------ */

/**
 * Render a binary mask from OCR bounding boxes and inpaint strokes.
 * White (255) = area to inpaint, Black (0) = keep.
 * Returns a base64 PNG data URL.
 */
export function generateMask(
  page: PageState,
  imageWidth: number,
  imageHeight: number
): string {
  const canvas = document.createElement("canvas");
  canvas.width = imageWidth;
  canvas.height = imageHeight;
  const ctx = canvas.getContext("2d")!;

  // Fill black background (keep)
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, imageWidth, imageHeight);

  // Draw OCR bounding boxes as white (inpaint)
  // Scale each polygon outward from its centroid by MASK_EXPAND_RATIO
  // so the mask covers slightly beyond the detected text boundary.
  const MASK_EXPAND_RATIO = 1.15;

  ctx.fillStyle = "#ffffff";
  for (const block of page.textBlocks) {
    // Always use x/y/width/height rect (which the user can adjust)
    // instead of boundingPoly (which is the original OCR polygon and
    // becomes stale after the user resizes or moves the box).
    const dw = block.width * (MASK_EXPAND_RATIO - 1) / 2;
    const dh = block.height * (MASK_EXPAND_RATIO - 1) / 2;
    const rx = block.x - dw;
    const ry = block.y - dh;
    const rw = block.width + dw * 2;
    const rh = block.height + dh * 2;

    if (block.rotation) {
      // Rotate around the expanded rect center
      const cx = rx + rw / 2;
      const cy = ry + rh / 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((block.rotation * Math.PI) / 180);
      ctx.fillRect(-rw / 2, -rh / 2, rw, rh);
      ctx.restore();
    } else {
      ctx.fillRect(rx, ry, rw, rh);
    }
  }

  // Draw inpaint strokes as white
  ctx.strokeStyle = "#ffffff";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const stroke of page.inpaintStrokes ?? []) {
    if (stroke.points.length < 2) continue;
    ctx.lineWidth = stroke.brushSize;
    ctx.beginPath();
    ctx.moveTo(stroke.points[0], stroke.points[1]);
    for (let i = 2; i < stroke.points.length; i += 2) {
      ctx.lineTo(stroke.points[i], stroke.points[i + 1]);
    }
    ctx.stroke();
  }

  return canvas.toDataURL("image/png");
}

/* ------------------------------------------------------------------ */
/*  Replicate API (via server-side proxy)                              */
/* ------------------------------------------------------------------ */

/**
 * Call our server-side LaMa proxy route which handles Replicate API calls.
 * Returns the resulting image as a base64 data URL.
 */
export async function inpaintWithReplicate(
  imageBase64: string,
  maskBase64: string,
  apiToken: string
): Promise<string> {
  const res = await fetch("/api/replicate/lama", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apiKey: apiToken,
      image: imageBase64,
      mask: maskBase64,
    }),
  });

  const data = await res.json();

  if (!res.ok || data.error) {
    throw new Error(data.error || `Server returned ${res.status}`);
  }

  return data.output;
}

/* ------------------------------------------------------------------ */
/*  Local LaMa service                                                 */
/* ------------------------------------------------------------------ */

/**
 * Call a locally‑deployed LaMa endpoint.
 * Expects POST /inpaint with multipart/form-data { image, mask }.
 * Returns the inpainted image as a base64 data URL.
 */
export async function inpaintWithLocal(
  imageBase64: string,
  maskBase64: string,
  endpoint: string
): Promise<string> {
  const imageBlob = await dataURLToBlob(imageBase64);
  const maskBlob = await dataURLToBlob(maskBase64);

  const form = new FormData();
  form.append("image", imageBlob, "image.png");
  form.append("mask", maskBlob, "mask.png");

  const res = await fetch(`${endpoint.replace(/\/+$/, "")}/inpaint`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Local inpaint failed (${res.status}): ${text}`);
  }

  const blob = await res.blob();
  return blobToDataURL(blob);
}

/* ------------------------------------------------------------------ */
/*  Orchestrator                                                       */
/* ------------------------------------------------------------------ */

export interface InpaintOptions {
  mode: "replicate" | "local";
  replicateApiKey?: string;
  localEndpoint?: string;
}

/**
 * High‑level inpainting function.
 *
 * 1. Generates a binary mask from OCR boxes + inpaint strokes.
 * 2. Sends the original image + mask to the chosen backend.
 * 3. Returns the cleaned image as a base64 data URL.
 */
export async function inpaintImage(
  page: PageState,
  imageWidth: number,
  imageHeight: number,
  options: InpaintOptions
): Promise<string> {
  const maskBase64 = generateMask(page, imageWidth, imageHeight);
  const imageBase64 = page.originalImageBase64;

  if (options.mode === "replicate") {
    if (!options.replicateApiKey) {
      throw new Error("Replicate API key is required");
    }
    return inpaintWithReplicate(imageBase64, maskBase64, options.replicateApiKey);
  }

  const endpoint = options.localEndpoint || "http://localhost:8080";
  return inpaintWithLocal(imageBase64, maskBase64, endpoint);
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function dataURLToBlob(dataURL: string): Promise<Blob> {
  const res = await fetch(dataURL);
  return res.blob();
}
