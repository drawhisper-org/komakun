"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";
import { useAppConfigStore } from "@/stores/app-config-store";
import { applyThemeColors } from "@/lib/theme-colors";

/**
 * Hook that syncs the accent color from the store with CSS variables.
 * Re-applies whenever the resolved theme or accent color changes.
 */
export function useThemeSync() {
  const { resolvedTheme } = useTheme();
  const accentColor = useAppConfigStore((s) => s.theme.accentColor);

  useEffect(() => {
    if (resolvedTheme && (resolvedTheme === "light" || resolvedTheme === "dark")) {
      applyThemeColors(accentColor, resolvedTheme);
    }
  }, [resolvedTheme, accentColor]);
}
