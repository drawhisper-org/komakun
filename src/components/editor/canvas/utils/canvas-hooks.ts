"use client";

import { useEffect, useState } from "react";

/* ── Image loading hook ── */
export function useImage(src: string | null): HTMLImageElement | null {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!src) { setImage(null); return; }
    const img = new window.Image();
    img.onload = () => setImage(img);
    img.onerror = () => setImage(null);
    img.src = src;
    return () => { img.onload = null; img.onerror = null; };
  }, [src]);
  return image;
}

/* ── Marching ants animation hook ── */
export function useMarchingAnts(active: boolean) {
  const [dashOffset, setDashOffset] = useState(0);
  useEffect(() => {
    if (!active) return;
    let raf: number;
    let last = 0;
    const tick = (time: number) => {
      if (time - last > 50) {
        setDashOffset((o) => (o + 1) % 200);
        last = time;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active]);
  return dashOffset;
}

/* ── Font-ready hook ── */
/** Bumps a counter each time a new font face finishes loading, causing Konva text nodes to re-render. */
export function useFontGeneration() {
  const [gen, setGen] = useState(0);
  useEffect(() => {
    const bump = () => setGen((g) => g + 1);
    // Re-render once all initially-queued fonts are ready
    document.fonts.ready.then(bump);
    // Re-render each time a new font loads (user picks a Google Font)
    document.fonts.addEventListener("loadingdone", bump);
    return () => document.fonts.removeEventListener("loadingdone", bump);
  }, []);
  return gen;
}
