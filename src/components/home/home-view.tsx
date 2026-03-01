"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  StarIcon,
  SquaresFourIcon,
  ListIcon,
  SortAscendingIcon,
  CaretDownIcon,
  CheckIcon,
  FileImageIcon,
} from "@phosphor-icons/react";
import { ProjectCard } from "@/components/home/project-card";
import { useProjectStore } from "@/stores/project-store";
import { useProjectsListStore } from "@/stores/projects-list-store";
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

export function HomeView() {
  const t = useTranslations("home");
  const router = useRouter();
  const addPages = useProjectStore((s) => s.addPages);
  const createNewProject = useProjectStore((s) => s.createNewProject);
  const importProject = useProjectStore((s) => s.importProject);
  const switchProject = useProjectStore((s) => s.switchProject);
  const allProjects = useProjectsListStore((s) => s.projects);
  const toggleStarInList = useProjectsListStore((s) => s.toggleStar);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [filter, setFilter] = useState<FilterMode>("all");
  const [sortBy, setSortBy] = useState<SortBy>("last-viewed");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [viewStyle, setViewStyle] = useState<ViewStyle>("grid");

  const handleNewProject = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const navigateToProject = useCallback(
    async (id: string) => {
      await switchProject(id);
      router.push(`/p/${id}`);
    },
    [switchProject, router]
  );

  const handleFiles = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) { e.target.value = ""; return; }

      // Check if any file is a .koma project
      const komaFile = files.find((f) => f.name.endsWith(".koma") || f.name.endsWith(".json"));
      if (komaFile) {
        // Import .koma project
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const data = JSON.parse(reader.result as string);
            importProject(data);
            const state = useProjectStore.getState();
            if (state.projectId) {
              await state.saveCurrentProject();
              router.push(`/p/${state.projectId}`);
            }
          } catch {
            // silently ignore invalid files
          }
        };
        reader.readAsText(komaFile);
      } else {
        // Image files — create new project
        await createNewProject();
        const result = await addPages(files);
        if (result?.skippedOversize) {
          toast.error("File too large", { description: `${result.skippedOversize} image(s) exceeded the 10 MB limit and were skipped.` });
        }
        const state = useProjectStore.getState();
        if (state.projectId) {
          await state.saveCurrentProject();
          router.push(`/p/${state.projectId}`);
        }
      }
      e.target.value = "";
    },
    [addPages, createNewProject, importProject, router]
  );

  const handleToggleStar = useCallback(
    (projectId: string) => {
      toggleStarInList(projectId);
      // Also toggle in the active project store if it matches
      if (useProjectStore.getState().projectId === projectId) {
        useProjectStore.getState().toggleStar();
      }
    },
    [toggleStarInList]
  );

  // Build filtered & sorted project list from the projects-list store
  const projects = useMemo(() => {
    let list = [...allProjects];
    if (filter === "starred") list = list.filter((p) => p.starred);

    list.sort((a, b) => {
      switch (sortBy) {
        case "alphabetical":
          return a.name.localeCompare(b.name, undefined, { numeric: true });
        case "date-created":
          return (a.createdAt ?? 0) - (b.createdAt ?? 0);
        case "last-viewed":
        default:
          return (a.lastEditedAt ?? 0) - (b.lastEditedAt ?? 0);
      }
    });

    if (sortOrder === "newest") list.reverse();
    return list;
  }, [allProjects, filter, sortBy, sortOrder]);

  const sortLabel: Record<SortBy, string> = {
    "last-viewed": t("lastViewed"),
    alphabetical: t("alphabetical"),
    "date-created": t("dateCreated"),
  };

  return (
    <>
      <div className="px-6 py-6">
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
                  key={p.id}
                  type="project"
                  name={p.name}
                  pageCount={p.pageCount}
                  thumbnail={p.thumbnailBase64}
                  starred={p.starred}
                  lastEditedAt={p.lastEditedAt}
                  onToggleStar={(e) => {
                    e.stopPropagation();
                    handleToggleStar(p.id);
                  }}
                  onClick={() => navigateToProject(p.id)}
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
                <div className="min-w-0 flex-1 text-left">
                  <span className="text-xs font-medium text-on-surface-variant/50 group-hover:text-primary">
                    {t("newProject")}
                  </span>
                  <p className="text-[10px] text-on-surface-variant/35">
                    {t("supportedFiles")}
                  </p>
                </div>
              </button>

              {/* Project rows */}
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => navigateToProject(p.id)}
                  className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-surface-variant/20"
                >
                  {/* Thumbnail */}
                  <div className="h-10 w-14 shrink-0 overflow-hidden rounded-lg bg-surface-variant/20">
                    {p.thumbnailBase64 ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.thumbnailBase64}
                        alt={p.name}
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
                      {p.name || t("untitledProject")}
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
                      handleToggleStar(p.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.stopPropagation();
                        handleToggleStar(p.id);
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

      {/* Hidden file input for new project */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.koma,.json"
        className="hidden"
        onChange={handleFiles}
      />
    </>
  );
}
