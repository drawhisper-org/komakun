import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/replicate/lama
 *
 * Server-side proxy for the LaMa inpainting model on Replicate.
 * Avoids CORS issues by keeping all Replicate API calls server-side.
 *
 * Expects JSON body: { apiKey, image (base64 data-URL), mask (base64 data-URL) }
 * Returns JSON: { output: "<base64 data-URL of cleaned image>" } or { error }
 *
 * @see https://replicate.com/allenhooo/lama/api
 */

const REPLICATE_MODEL_VERSION =
  "cdac78a1bec5b23c07fd29692fb70baa513ea403a39e643c48ec5edadb15fe72";

const POLL_INTERVAL = 2000; // ms
const MAX_POLL_ATTEMPTS = 150; // 5 min max

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
        { status: 400 }
      );
    }
    if (!image || !mask) {
      return NextResponse.json(
        { error: "Both image and mask are required" },
        { status: 400 }
      );
    }

    const headers = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };

    // 1. Create prediction with "Prefer: wait" for synchronous response
    const createRes = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: { ...headers, Prefer: "wait" },
      body: JSON.stringify({
        version: REPLICATE_MODEL_VERSION,
        input: { image, mask },
      }),
    });

    if (!createRes.ok) {
      const text = await createRes.text();
      return NextResponse.json(
        { error: `Replicate create prediction failed (${createRes.status}): ${text}` },
        { status: 502 }
      );
    }

    let prediction = await createRes.json();

    // 2. Poll until completed (if "Prefer: wait" didn't finish it)
    let attempts = 0;
    while (
      prediction.status !== "succeeded" &&
      prediction.status !== "failed" &&
      prediction.status !== "canceled" &&
      attempts < MAX_POLL_ATTEMPTS
    ) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL));
      attempts++;

      const pollRes = await fetch(prediction.urls.get, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!pollRes.ok) {
        return NextResponse.json(
          { error: `Replicate poll failed (${pollRes.status})` },
          { status: 502 }
        );
      }
      prediction = await pollRes.json();
    }

    if (prediction.status === "failed") {
      return NextResponse.json(
        { error: `Prediction failed: ${prediction.error || "unknown error"}` },
        { status: 502 }
      );
    }

    if (prediction.status !== "succeeded") {
      return NextResponse.json(
        { error: `Prediction timed out (status: ${prediction.status})` },
        { status: 504 }
      );
    }

    // 3. Fetch the output image and convert to base64 data URL
    const outputUrl: string = Array.isArray(prediction.output)
      ? prediction.output[0]
      : prediction.output;

    if (!outputUrl) {
      return NextResponse.json(
        { error: "No output URL in prediction result" },
        { status: 502 }
      );
    }

    const imgRes = await fetch(outputUrl);
    if (!imgRes.ok) {
      return NextResponse.json(
        { error: `Failed to fetch output image (${imgRes.status})` },
        { status: 502 }
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
      { status: 500 }
    );
  }
}
