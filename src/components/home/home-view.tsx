"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  StackIcon,
  StarIcon,
  SquaresFourIcon,
  ListIcon,
  SortAscendingIcon,
  CaretDownIcon,
  CheckIcon,
  FileImageIcon,
  GlobeIcon,
} from "@phosphor-icons/react";
import { HomeSidebar } from "@/components/home/home-sidebar";
import { ProjectCard } from "@/components/home/project-card";
import { useProjectStore } from "@/stores/project-store";
import { useLocaleStore, type Locale } from "@/stores/locale-store";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useTranslations } from "next-intl";

type FilterMode = "all" | "starred";
type SortBy = "last-viewed" | "alphabetical" | "date-created";
type SortOrder = "newest" | "oldest";
type ViewStyle = "grid" | "list";

const LOCALE_OPTIONS: { value: Locale; label: string; short: string }[] = [
  { value: "en", label: "English", short: "EN" },
  { value: "zh", label: "简体中文", short: "简" },
  { value: "zh-TW", label: "繁體中文", short: "繁" },
  { value: "ja", label: "日本語", short: "JP" },
];

function HomeLanguageSwitcher() {
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const current = LOCALE_OPTIONS.find((o) => o.value === locale) ?? LOCALE_OPTIONS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex h-8 items-center gap-1.5 rounded-full px-2.5 text-on-surface-variant/60 transition-colors hover:bg-surface-variant/20 hover:text-on-surface-variant">
          <GlobeIcon weight="bold" className="h-4 w-4" />
          <span className="text-[11px] font-medium">{current.short}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        {LOCALE_OPTIONS.map(({ value, label }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => setLocale(value)}
            className="flex items-center justify-between text-xs"
          >
            {label}
            {locale === value && (
              <CheckIcon weight="bold" className="h-3.5 w-3.5 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface HomeViewProps {
  onOpenSettings: () => void;
}

export function HomeView({ onOpenSettings }: HomeViewProps) {
  const t = useTranslations("home");
  const router = useRouter();
  const projectId = useProjectStore((s) => s.projectId);
  const projectName = useProjectStore((s) => s.projectName);
  const pages = useProjectStore((s) => s.pages);
  const starred = useProjectStore((s) => s.starred);
  const lastEditedAt = useProjectStore((s) => s.lastEditedAt);
  const addPages = useProjectStore((s) => s.addPages);
  const clearProject = useProjectStore((s) => s.clearProject);
  const toggleStar = useProjectStore((s) => s.toggleStar);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [filter, setFilter] = useState<FilterMode>("all");
  const [sortBy, setSortBy] = useState<SortBy>("last-viewed");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [viewStyle, setViewStyle] = useState<ViewStyle>("grid");

  const thumbnail = pages[0]?.originalImageBase64 ?? null;

  const handleNewProject = useCallback(() => {
    clearProject();
    fileInputRef.current?.click();
  }, [clearProject]);

  const navigateToProject = useCallback(
    (id: string) => {
      router.push(`/p/${id}`);
    },
    [router]
  );

  const handleFiles = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) {
        await addPages(files);
        const id = useProjectStore.getState().projectId;
        if (id) navigateToProject(id);
      }
      e.target.value = "";
    },
    [addPages, navigateToProject]
  );

  // Build filtered project list (currently single-project, but array-ready)
  const projects = useMemo(() => {
    if (!projectId) return [];
    const p = { projectId, projectName, pageCount: pages.length, thumbnail, starred, lastEditedAt };
    if (filter === "starred" && !starred) return [];
    return [p];
  }, [projectId, projectName, pages.length, thumbnail, starred, lastEditedAt, filter]);

  const sortLabel: Record<SortBy, string> = {
    "last-viewed": t("lastViewed"),
    alphabetical: t("alphabetical"),
    "date-created": t("dateCreated"),
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Left sidebar */}
      <HomeSidebar onOpenSettings={onOpenSettings} />

      {/* Main content */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar — logo only */}
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-outline-variant/10 px-6">
          <div className="flex items-center">
            <div className="flex items-center gap-2 md:hidden">
              <StackIcon weight="fill" className="h-5 w-5 text-primary" />
              <span className="text-sm font-bold text-on-surface">{t("brand")}</span>
            </div>
            <h1 className="hidden text-sm font-semibold text-on-surface md:block">
              {t("recents")}
            </h1>
          </div>
          <HomeLanguageSwitcher />
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* Toolbar: filter tabs (left) + sort dropdown & view toggle (right) */}
          <div className="mb-5 flex items-center justify-between">
            {/* Filter tabs */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setFilter("all")}
                className={`rounded-md px-4 py-1.5 text-xs font-medium transition-colors ${
                  filter === "all"
                    ? "bg-surface-variant/40 text-on-surface"
                    : "text-on-surface-variant/50 hover:text-on-surface"
                }`}
              >
                {t("allProjects")}
              </button>
              <button
                onClick={() => setFilter("starred")}
                className={`rounded-md px-4 py-1.5 text-xs font-medium transition-colors ${
                  filter === "starred"
                    ? "bg-surface-variant/40 text-on-surface"
                    : "text-on-surface-variant/50 hover:text-on-surface"
                }`}
              >
                {t("starredProjects")}
              </button>
            </div>

            {/* Sort dropdown + view toggle */}
            <div className="flex items-center gap-1.5">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 rounded-lg border border-outline-variant/20 px-2.5 py-1 text-xs text-on-surface-variant transition-colors hover:bg-surface-variant/20">
                    <SortAscendingIcon weight="fill" className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{sortLabel[sortBy]}</span>
                    <CaretDownIcon weight="fill" className="h-3 w-3 opacity-50" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel className="text-[11px] text-on-surface-variant/60">
                    {t("sortBy")}
                  </DropdownMenuLabel>
                  {(["alphabetical", "date-created", "last-viewed"] as SortBy[]).map(
                    (option) => (
                      <DropdownMenuItem
                        key={option}
                        onClick={() => setSortBy(option)}
                        className="flex items-center justify-between text-xs"
                      >
                        {sortLabel[option]}
                        {sortBy === option && (
                          <CheckIcon weight="bold" className="h-3.5 w-3.5 text-primary" />
                        )}
                      </DropdownMenuItem>
                    )
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-[11px] text-on-surface-variant/60">
                    {t("order")}
                  </DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => setSortOrder("oldest")}
                    className="flex items-center justify-between text-xs"
                  >
                    {t("oldestFirst")}
                    {sortOrder === "oldest" && (
                      <CheckIcon weight="bold" className="h-3.5 w-3.5 text-primary" />
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setSortOrder("newest")}
                    className="flex items-center justify-between text-xs"
                  >
                    {t("newestFirst")}
                    {sortOrder === "newest" && (
                      <CheckIcon weight="bold" className="h-3.5 w-3.5 text-primary" />
                    )}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* View toggle */}
              <div className="flex items-center gap-0 rounded-lg border border-outline-variant/20">
                <button
                  onClick={() => setViewStyle("grid")}
                  className={`flex h-7 w-7 items-center justify-center rounded-l-lg transition-colors ${
                    viewStyle === "grid"
                      ? "bg-surface-variant/40 text-on-surface"
                      : "text-on-surface-variant/40 hover:text-on-surface-variant"
                  }`}
                >
                  <SquaresFourIcon weight="fill" className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setViewStyle("list")}
                  className={`flex h-7 w-7 items-center justify-center rounded-r-lg transition-colors ${
                    viewStyle === "list"
                      ? "bg-surface-variant/40 text-on-surface"
                      : "text-on-surface-variant/40 hover:text-on-surface-variant"
                  }`}
                >
                  <ListIcon weight="fill" className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
          {viewStyle === "grid" ? (
            /* ===== Grid view ===== */
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {/* New project card — always first */}
              <ProjectCard type="new" onClick={handleNewProject} />

              {/* Existing project cards */}
              {projects.map((p) => (
                <ProjectCard
                  key={p.projectId}
                  type="project"
                  name={p.projectName}
                  pageCount={p.pageCount}
                  thumbnail={p.thumbnail}
                  starred={p.starred}
                  lastEditedAt={p.lastEditedAt}
                  onToggleStar={(e) => {
                    e.stopPropagation();
                    toggleStar();
                  }}
                  onClick={() => navigateToProject(p.projectId!)}
                />
              ))}
            </div>
          ) : (
            /* ===== List view ===== */
            <div className="flex flex-col gap-1">
              {/* New project row — always first */}
              <button
                onClick={handleNewProject}
                className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-surface-variant/20"
              >
                <div className="flex h-10 w-14 shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-outline-variant/30 bg-surface-variant/10 transition-colors group-hover:border-primary/40">
                  <span className="text-lg font-light text-on-surface-variant/40 group-hover:text-primary">
                    +
                  </span>
                </div>
                <span className="text-xs font-medium text-on-surface-variant/50 group-hover:text-primary">
                  {t("newProject")}
                </span>
              </button>

              {/* Project rows */}
              {projects.map((p) => (
                <button
                  key={p.projectId}
                  onClick={() => navigateToProject(p.projectId!)}
                  className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-surface-variant/20"
                >
                  {/* Thumbnail */}
                  <div className="h-10 w-14 shrink-0 overflow-hidden rounded-lg bg-surface-variant/20">
                    {p.thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.thumbnail}
                        alt={p.projectName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <FileImageIcon
                          weight="fill"
                          className="h-5 w-5 text-on-surface-variant/20"
                        />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1 text-left">
                    <p className="truncate text-xs font-medium text-on-surface">
                      {p.projectName || t("untitledProject")}
                    </p>
                    <p className="text-[10px] text-on-surface-variant/50">
                      {p.pageCount} page{p.pageCount !== 1 ? "s" : ""}
                    </p>
                  </div>

                  {/* Last edited */}
                  <span className="shrink-0 text-[10px] text-on-surface-variant/40">
                    {p.lastEditedAt
                      ? new Date(p.lastEditedAt).toLocaleDateString()
                      : ""}
                  </span>

                  {/* Star toggle */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStar();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.stopPropagation();
                        toggleStar();
                      }
                    }}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-surface-variant/30"
                  >
                    <StarIcon
                      weight={p.starred ? "fill" : "regular"}
                      className={`h-4 w-4 ${p.starred ? "text-amber-400" : "text-on-surface-variant/30"}`}
                    />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Hidden file input for new project */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={handleFiles}
      />
    </div>
  );
}
