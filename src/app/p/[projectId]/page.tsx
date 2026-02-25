"use client";

import { use } from "react";
import { useState } from "react";
import { EditorLayout } from "@/components/editor/editor-layout";
import { SettingsModal } from "@/components/settings/settings-modal";
import { useThemeSync } from "@/hooks/use-theme-sync";

interface EditorPageProps {
  params: Promise<{ projectId: string }>;
}

export default function EditorPage({ params }: EditorPageProps) {
  const { projectId } = use(params);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useThemeSync();

  return (
    <>
      <EditorLayout projectId={projectId} />
      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
