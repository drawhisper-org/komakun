import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ProjectSummary {
  id: string;
  name: string;
  pageCount: number;
  thumbnailBase64: string | null;
  starred: boolean;
  lastEditedAt: number | null;
  createdAt: number | null;
}

interface ProjectsListState {
  projects: ProjectSummary[];
}

interface ProjectsListActions {
  upsertProject: (summary: ProjectSummary) => void;
  removeProject: (id: string) => void;
  toggleStar: (id: string) => void;
}

export type ProjectsListStore = ProjectsListState & ProjectsListActions;

export const useProjectsListStore = create<ProjectsListStore>()(
  persist(
    (set) => ({
      projects: [],

      upsertProject: (summary) =>
        set((s) => {
          const idx = s.projects.findIndex((p) => p.id === summary.id);
          if (idx >= 0) {
            const projects = [...s.projects];
            projects[idx] = summary;
            return { projects };
          }
          return { projects: [...s.projects, summary] };
        }),

      removeProject: (id) =>
        set((s) => ({
          projects: s.projects.filter((p) => p.id !== id),
        })),

      toggleStar: (id) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id ? { ...p, starred: !p.starred } : p
          ),
        })),
    }),
    { name: "komakun-projects-list" }
  )
);
