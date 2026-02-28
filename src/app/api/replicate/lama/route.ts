import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";

/**
 * POST /api/replicate/lama
 *
 * Server-side proxy for the LaMa inpainting model on Replicate.
 * Uses the official Replicate SDK which handles polling automatically.
 *
 * Expects JSON body: { apiKey, image (base64 data-URL), mask (base64 data-URL) }
 * Returns JSON: { output: "<base64 data-URL of cleaned image>" } or { error }
 *
 * @see https://replicate.com/allenhooo/lama/api
 */

const REPLICATE_MODEL =
  "allenhooo/lama:cdac78a1bec5b23c07fd29692fb70baa513ea403a39e643c48ec5edadb15fe72" as const;

export async function POST(req: NextRequest) {
  try {
    const { apiKey, image, mask } = (await req.json()) as {
      apiKey?: string;
      image?: string;
      mask?: string;
    };

    if (!apiKey?.trim()) {
      return NextResponse.json(
        { error: "Replicate API key is required" },
        { status: 400 },
      );
    }
    if (!image || !mask) {
      return NextResponse.json(
        { error: "Both image and mask are required" },
        { status: 400 },
      );
    }

    const replicate = new Replicate({ auth: apiKey });

    // replicate.run() handles creation + polling automatically
    const output = await replicate.run(REPLICATE_MODEL, {
      input: { image, mask },
    });

    // Output is a ReadableStream (FileOutput) — get its URL
    let outputUrl: string | undefined;
    if (output && typeof output === "object" && "url" in output && typeof (output as { url: () => string }).url === "function") {
      outputUrl = (output as { url: () => string }).url();
    } else if (typeof output === "string") {
      outputUrl = output;
    } else if (Array.isArray(output) && output.length > 0) {
      const first = output[0];
      if (first && typeof first === "object" && "url" in first && typeof (first as { url: () => string }).url === "function") {
        outputUrl = (first as { url: () => string }).url();
      } else if (typeof first === "string") {
        outputUrl = first;
      }
    }

    if (!outputUrl) {
      return NextResponse.json(
        { error: `No output URL in prediction result (${JSON.stringify(output)?.slice(0, 200)})` },
        { status: 502 },
      );
    }

    // Fetch the output image and convert to base64 data URL
    const imgRes = await fetch(outputUrl, {
      signal: AbortSignal.timeout(30_000),
    });
    if (!imgRes.ok) {
      return NextResponse.json(
        { error: `Failed to fetch output image (${imgRes.status})` },
        { status: 502 },
      );
    }

    const arrayBuffer = await imgRes.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const contentType = imgRes.headers.get("content-type") || "image/png";
    const dataUrl = `data:${contentType};base64,${base64}`;

    return NextResponse.json({ output: dataUrl });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
