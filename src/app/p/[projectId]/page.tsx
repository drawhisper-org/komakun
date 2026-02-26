"use client";

import { use } from "react";
import { EditorLayout } from "@/components/editor/editor-layout";
import { useThemeSync } from "@/hooks/use-theme-sync";

interface EditorPageProps {
  params: Promise<{ projectId: string }>;
}

export default function EditorPage({ params }: EditorPageProps) {
  const { projectId } = use(params);

  useThemeSync();

  return <EditorLayout projectId={projectId} />;
}
