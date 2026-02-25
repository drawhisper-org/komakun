"use client";

import { useState } from "react";
import { HomeView } from "@/components/home/home-view";
import { LandingPage } from "@/components/landing/landing-page";
import { SettingsModal } from "@/components/settings/settings-modal";
import { useThemeSync } from "@/hooks/use-theme-sync";
import { useUserStore } from "@/stores/user-store";

export default function HomePage() {
  const userId = useUserStore((s) => s.userId);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useThemeSync();

  if (!userId) {
    return <LandingPage />;
  }

  return (
    <>
      <HomeView onOpenSettings={() => setSettingsOpen(true)} />
      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
