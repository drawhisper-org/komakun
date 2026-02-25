"use client";

import { EditorLeftSidebar } from "@/components/editor/editor-left-sidebar";
import { EditorRightSidebar } from "@/components/editor/editor-right-sidebar";
import { EditorCanvas } from "@/components/editor/editor-canvas";
import { BottomToolbar } from "@/components/editor/bottom-toolbar";

interface EditorLayoutProps {
  projectId: string;
}

export function EditorLayout({ projectId }: EditorLayoutProps) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Left sidebar — sticky, not floating */}
      <EditorLeftSidebar projectId={projectId} />

      {/* Center — canvas + bottom toolbar */}
      <div className="relative flex-1">
        <EditorCanvas />
        <BottomToolbar />
      </div>

      {/* Right sidebar — sticky, not floating */}
      <EditorRightSidebar />
    </div>
  );
}
