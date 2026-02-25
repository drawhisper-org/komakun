import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { idbStorage } from "@/lib/idb-storage";

export interface TextBlock {
  id: string;
  type: "speech" | "narration" | "sfx";
  originalText: string;
  translatedText: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
}

export interface PageState {
  id: string;
  fileName: string;
  originalImageBase64: string;
  cleanedImageBase64: string | null;
  textBlocks: TextBlock[];
}

interface ProjectState {
  projectId: string | null;
  projectName: string;
  pages: PageState[];
  activePageId: string | null;
  starred: boolean;
  lastEditedAt: number | null; // epoch ms
  createdAt: number | null; // epoch ms
}

interface ProjectActions {
  setProjectName: (name: string) => void;
  addPages: (files: File[]) => Promise<void>;
  removePage: (pageId: string) => void;
  setActivePage: (pageId: string) => void;
  reorderPages: (newOrder: PageState[]) => void;
  updateTextBlock: (
    pageId: string,
    blockId: string,
    updates: Partial<TextBlock>
  ) => void;
  toggleStar: () => void;
  clearProject: () => void;
  importProject: (data: ProjectState) => void;
  exportProject: () => ProjectState;
}

export type ProjectStore = ProjectState & ProjectActions;

const MAX_PAGES = 80;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set, get) => ({
      // State
      projectId: null,
      projectName: "Untitled Project",
      pages: [],
      activePageId: null,
      starred: false,
      lastEditedAt: null,
      createdAt: null,

      // Actions
      setProjectName: (name) => set({ projectName: name, lastEditedAt: Date.now() }),

      addPages: async (files) => {
        const state = get();
        const remainingSlots = MAX_PAGES - state.pages.length;
        if (remainingSlots <= 0) return;

        const validFiles = files
          .filter((f) => f.type.startsWith("image/") && f.size <= MAX_FILE_SIZE)
          .slice(0, remainingSlots);

        const newPages: PageState[] = await Promise.all(
          validFiles.map(async (file) => ({
            id: generateId(),
            fileName: file.name,
            originalImageBase64: await fileToBase64(file),
            cleanedImageBase64: null,
            textBlocks: [],
          }))
        );

        const now = Date.now();
        set((s) => ({
          projectId: s.projectId || generateId(),
          pages: [...s.pages, ...newPages],
          activePageId: s.activePageId || newPages[0]?.id || null,
          lastEditedAt: now,
          createdAt: s.createdAt || now,
        }));
      },

      removePage: (pageId) =>
        set((s) => {
          const pages = s.pages.filter((p) => p.id !== pageId);
          const activePageId =
            s.activePageId === pageId
              ? pages[0]?.id || null
              : s.activePageId;
          return { pages, activePageId };
        }),

      setActivePage: (pageId) => set({ activePageId: pageId }),

      reorderPages: (newOrder) => set({ pages: newOrder, lastEditedAt: Date.now() }),

      toggleStar: () => set((s) => ({ starred: !s.starred })),

      updateTextBlock: (pageId, blockId, updates) =>
        set((s) => ({
          pages: s.pages.map((page) =>
            page.id === pageId
              ? {
                  ...page,
                  textBlocks: page.textBlocks.map((block) =>
                    block.id === blockId ? { ...block, ...updates } : block
                  ),
                }
              : page
          ),
        })),

      clearProject: () =>
        set({
          projectId: null,
          projectName: "Untitled Project",
          pages: [],
          activePageId: null,
          starred: false,
          lastEditedAt: null,
          createdAt: null,
        }),

      importProject: (data) =>
        set({
          projectId: data.projectId,
          projectName: data.projectName,
          pages: data.pages,
          activePageId: data.activePageId,
          starred: data.starred ?? false,
          lastEditedAt: data.lastEditedAt ?? Date.now(),
          createdAt: data.createdAt ?? Date.now(),
        }),

      exportProject: () => {
        const { projectId, projectName, pages, activePageId, starred, lastEditedAt, createdAt } = get();
        return { projectId, projectName, pages, activePageId, starred, lastEditedAt, createdAt };
      },
    }),
    {
      name: "komaflip-project",
      // CRITICAL: Use IndexedDB for heavyweight project data (Skill 4)
      storage: createJSONStorage(() => idbStorage),
    }
  )
);
