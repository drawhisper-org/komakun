"use client";

import { useState, useCallback, useEffect } from "react";
import { StackIcon } from "@phosphor-icons/react";
import { EditorLeftSidebar } from "@/components/editor/editor-left-sidebar";
import { EditorRightSidebar } from "@/components/editor/editor-right-sidebar";
import { EditorCanvas } from "@/components/editor/editor-canvas";
import { ManagePagesView } from "@/components/editor/manage-pages-view";
import { BottomToolbar } from "@/components/editor/bottom-toolbar";
import { hydrateCustomFonts } from "@/stores/custom-fonts-store";
import type { ActiveTool } from "@/components/editor/canvas/konva-stage";

interface EditorLayoutProps {
  projectId: string;
}

export function EditorLayout({ projectId }: EditorLayoutProps) {
  const [managingPages, setManagingPages] = useState(false);
  const [activeTool, setActiveTool] = useState<ActiveTool>("select");
  const [viewport, setViewport] = useState({ x: 0, y: 0, scale: 1 });
  const [fitSignal, setFitSignal] = useState(0);
  const [brushSize, setBrushSize] = useState(20);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);

  // Hydrate custom fonts from IDB on mount
  useEffect(() => { hydrateCustomFonts(); }, []);

  const handleZoomIn = useCallback(() => {
    setViewport((v) => {
      const newScale = Math.min(v.scale + 0.05, 5);
      return { ...v, scale: newScale };
    });
  }, []);

  const handleZoomOut = useCallback(() => {
    setViewport((v) => {
      const newScale = Math.max(v.scale - 0.05, 0.1);
      return { ...v, scale: newScale };
    });
  }, []);

  const handleFitToScreen = useCallback(() => {
    setFitSignal((s) => s + 1);
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Left sidebar — collapsible */}
      {leftSidebarOpen && (
        <EditorLeftSidebar
          projectId={projectId}
          onManagePages={() => setManagingPages(true)}
          onCollapse={() => setLeftSidebarOpen(false)}
        />
      )}

      {/* Center — canvas or manage-pages view + bottom toolbar */}
      <div className="relative flex-1">
        {managingPages ? (
          <ManagePagesView onDone={() => setManagingPages(false)} />
        ) : (
          <>
            <EditorCanvas
              viewport={viewport}
              onViewportChange={setViewport}
              activeTool={activeTool}
              fitSignal={fitSignal}
              brushSize={brushSize}
            />
            <BottomToolbar
              activeTool={activeTool}
              onToolChange={setActiveTool}
              zoomPercent={Math.round(viewport.scale * 100)}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onFitToScreen={handleFitToScreen}
              brushSize={brushSize}
              onBrushSizeChange={setBrushSize}
            />

            {/* Expand sidebar button — shown when left sidebar is collapsed */}
            {!leftSidebarOpen && (
              <button
                onClick={() => setLeftSidebarOpen(true)}
                className="absolute bottom-4 left-4 z-20 flex h-7 w-7 items-center justify-center rounded-lg border border-outline-variant/30 bg-surface/90 text-on-surface-variant shadow-2xl backdrop-blur-xl transition-colors hover:bg-surface-variant/30 hover:text-on-surface"
              >
                <StackIcon weight="fill" className="h-3 w-3" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Right sidebar — sticky, not floating */}
      <EditorRightSidebar />
    </div>
  );
}
