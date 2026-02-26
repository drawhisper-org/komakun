"use client";

import { SettingsView } from "@/components/settings/settings-view";
import { LandingPage } from "@/components/landing/landing-page";
import { useThemeSync } from "@/hooks/use-theme-sync";
import { useUserStore } from "@/stores/user-store";

export default function SettingsPage() {
  const userId = useUserStore((s) => s.userId);
  useThemeSync();

  if (!userId) {
    return <LandingPage />;
  }

  return <SettingsView />;
}
