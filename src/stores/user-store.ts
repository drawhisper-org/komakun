import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface UserState {
  userId: string | null;
  firstName: string;
  lastName: string;
  email: string;
  avatarBase64: string | null;
}

interface UserActions {
  login: (firstName: string, lastName: string, email: string) => void;
  setAvatar: (base64: string | null) => void;
  setFirstName: (name: string) => void;
  setLastName: (name: string) => void;
  logout: () => void;
}

export type UserStore = UserState & UserActions;

/**
 * Format display name based on locale.
 * CJK (zh, zh-TW, ja): lastName + firstName (no space)
 * Western (en, etc.): firstName + lastName (space-separated)
 */
export function formatDisplayName(
  firstName: string,
  lastName: string,
  locale: string
): string {
  const f = firstName.trim();
  const l = lastName.trim();
  if (!f && !l) return "";
  if (!l) return f;
  if (!f) return l;
  const isCJK = ["zh", "zh-TW", "ja"].includes(locale);
  return isCJK ? `${l}${f}` : `${f} ${l}`;
}

function generateUserId(): string {
  return `u-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      userId: null,
      firstName: "",
      lastName: "",
      email: "",
      avatarBase64: null,

      login: (firstName, lastName, email) =>
        set({
          userId: generateUserId(),
          firstName,
          lastName,
          email,
        }),

      setAvatar: (base64) => set({ avatarBase64: base64 }),

      setFirstName: (name) => set({ firstName: name }),
      setLastName: (name) => set({ lastName: name }),

      logout: () =>
        set({
          userId: null,
          firstName: "",
          lastName: "",
          email: "",
          avatarBase64: null,
        }),
    }),
    {
      name: "komaflip-user",
      // Migrate old single-field userName to firstName
      migrate: (persisted: unknown) => {
        const state = persisted as Record<string, unknown>;
        if (typeof state.userName === "string" && state.userName) {
          state.firstName = state.userName;
          state.lastName = "";
          delete state.userName;
        }
        if (!state.firstName) state.firstName = "";
        if (!state.lastName) state.lastName = "";
        return state;
      },
      version: 1,
    }
  )
);
