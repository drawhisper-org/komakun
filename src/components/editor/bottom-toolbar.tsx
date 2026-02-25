"use client";

import {
  CursorIcon,
  HandIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

export function BottomToolbar() {
  return (
    <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-2xl border border-outline-variant/30 bg-surface/90 px-2 py-1.5 shadow-2xl backdrop-blur-xl">
      {/* Pointer / Hand tools */}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 rounded-xl p-0 text-primary"
      >
        <CursorIcon weight="fill" className="h-4.5 w-4.5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 rounded-xl p-0 text-on-surface-variant hover:text-on-surface"
      >
        <HandIcon weight="fill" className="h-4.5 w-4.5" />
      </Button>

      <div className="mx-1 h-5 w-px bg-outline-variant/30" />

      {/* Zoom controls */}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 rounded-xl p-0 text-on-surface-variant hover:text-on-surface"
      >
        <MagnifyingGlassMinusIcon weight="fill" className="h-4.5 w-4.5" />
      </Button>
      <span className="min-w-[3rem] text-center text-xs font-medium text-on-surface-variant">
        100%
      </span>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 rounded-xl p-0 text-on-surface-variant hover:text-on-surface"
      >
        <MagnifyingGlassPlusIcon weight="fill" className="h-4.5 w-4.5" />
      </Button>
    </div>
  );
}
