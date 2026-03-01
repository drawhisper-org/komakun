"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useUserStore } from "@/stores/user-store";

declare global {
  interface Window {
    kofiWidgetOverlay?: {
      draw: (
        slug: string,
        options: Record<string, string>
      ) => void;
    };
  }
}

const KOFI_SLUG = "gongqing";
const KOFI_OPTS: Record<string, string> = {
  type: "floating-chat",
  "floating-chat.donateButton.text": "Support me",
  "floating-chat.donateButton.background-color": "#00b9fe",
  "floating-chat.donateButton.text-color": "#fff",
};

/**
 * Ko-fi floating overlay widget.
 * Loads the overlay-widget.js script once and draws a floating donate
 * chat button. Auto-hides on editor (/p/*) and landing page (/ without user).
 */
export function KofiOverlay() {
  const pathname = usePathname();
  const userId = useUserStore((s) => s.userId);
  const scriptLoaded = useRef(false);

  const isEditor = pathname.startsWith("/p/");
  const isLanding = pathname === "/" && !userId;
  const shouldShow = !isEditor && !isLanding;

  // Load script & draw widget once
  useEffect(() => {
    if (scriptLoaded.current) return;
    if (!shouldShow) return;

    const init = () => {
      scriptLoaded.current = true;
      window.kofiWidgetOverlay?.draw(KOFI_SLUG, KOFI_OPTS);
    };

    if (window.kofiWidgetOverlay) {
      init();
      return;
    }

    const existing = document.querySelector(
      'script[src*="overlay-widget.js"]'
    );
    if (existing) {
      existing.addEventListener("load", init);
      return;
    }

    const script = document.createElement("script");
    script.src =
      "https://storage.ko-fi.com/cdn/scripts/overlay-widget.js";
    script.async = true;
    script.onload = init;
    document.head.appendChild(script);
  }, [shouldShow]);

  // Toggle visibility of the widget's injected DOM
  useEffect(() => {
    const style = document.createElement("style");
    style.setAttribute("data-kofi-toggle", "");
    if (!shouldShow) {
      style.textContent =
        ".floatingchat-container-wrap,.floatingchat-container-wrap-mo498{display:none!important}";
    }
    document.head.appendChild(style);
    return () => {
      style.remove();
    };
  }, [shouldShow]);

  return null;
}

/* eslint-disable @next/next/no-img-element */

/**
 * Simple Ko-fi link button for inline placement (e.g. landing topbar).
 */
export function KofiButton({ className = "" }: { className?: string }) {
  return (
    <a
      href="https://ko-fi.com/C1C01V0RKD"
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex transition-opacity hover:opacity-85 ${className}`}
    >
      <img
        src="/images/kofi.webp"
        alt="Buy Me a Coffee"
        className="h-7 border-0"
      />
    </a>
  );
}
