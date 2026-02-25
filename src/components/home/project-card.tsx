"use client";

import { PlusIcon, FileImageIcon, StarIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";

function formatRelativeTime(timestamp: number | null | undefined): string {
  if (!timestamp) return "";
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

interface ProjectCardProps {
  type: "project" | "new";
  name?: string;
  pageCount?: number;
  thumbnail?: string | null;
  starred?: boolean;
  lastEditedAt?: number | null;
  onToggleStar?: (e: React.MouseEvent) => void;
  onClick: () => void;
}

export function ProjectCard({
  type,
  name,
  pageCount,
  thumbnail,
  starred,
  lastEditedAt,
  onToggleStar,
  onClick,
}: ProjectCardProps) {
  const t = useTranslations("home");

  if (type === "new") {
    return (
      <button
        onClick={onClick}
        className="group flex w-full flex-col overflow-hidden rounded-2xl border-2 border-dashed border-outline-variant/30 bg-surface-variant/10 transition-all hover:border-primary/40 hover:bg-primary-container/10"
      >
        {/* Thumbnail area — same structure as project card */}
        <div className="flex aspect-4/3 w-full items-center justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-variant/30 transition-colors group-hover:bg-primary-container/40">
            <PlusIcon
              weight="bold"
              className="h-7 w-7 text-on-surface-variant/40 transition-colors group-hover:text-primary"
            />
          </div>
        </div>
        {/* Info — matches project card layout */}
        <div className="flex items-center gap-2 px-3 py-2">
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-xs font-medium text-on-surface-variant/50 transition-colors group-hover:text-primary">
              {t("newProject")}
            </p>
          </div>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="group relative flex w-full flex-col overflow-hidden rounded-2xl border border-outline-variant/20 bg-surface transition-all hover:border-primary/40 hover:shadow-lg"
    >
      {/* Thumbnail area */}
      <div className="relative aspect-4/3 w-full overflow-hidden bg-surface-variant/20">
        {thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnail}
            alt={name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <FileImageIcon
              weight="fill"
              className="h-12 w-12 text-on-surface-variant/20"
            />
          </div>
        )}

        {/* Star button — top right of thumbnail */}
        <div
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onToggleStar?.(e);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
              onToggleStar?.(e as unknown as React.MouseEvent);
            }
          }}
          className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/30 opacity-0 backdrop-blur-sm transition-all hover:bg-black/50 group-hover:opacity-100 data-[starred=true]:opacity-100"
          data-starred={starred || undefined}
        >
          <StarIcon
            weight={starred ? "fill" : "regular"}
            className={`h-4 w-4 ${starred ? "text-amber-400" : "text-white/80"}`}
          />
        </div>
      </div>

      {/* Info — smaller text with last edited time */}
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="min-w-0 flex-1 text-left">
          <p className="truncate text-xs font-medium text-on-surface">
            {name || t("untitledProject")}
          </p>
          <p className="text-[10px] text-on-surface-variant/50">
            {pageCount ?? 0} {(pageCount ?? 0) !== 1 ? t("pages") : t("page")}
            {lastEditedAt ? ` · ${formatRelativeTime(lastEditedAt)}` : ""}
          </p>
        </div>
      </div>
    </button>
  );
}
