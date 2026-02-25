import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface UserState {
  userId: string | null;
  userName: string;
  email: string;
  avatarBase64: string | null;
}

interface UserActions {
  login: (name: string, email: string) => void;
  setAvatar: (base64: string | null) => void;
  setUserName: (name: string) => void;
  logout: () => void;
}

export type UserStore = UserState & UserActions;

function generateUserId(): string {
  return `u-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      userId: null,
      userName: "",
      email: "",
      avatarBase64: null,

      login: (name, email) =>
        set({
          userId: generateUserId(),
          userName: name,
          email,
        }),

      setAvatar: (base64) => set({ avatarBase64: base64 }),

      setUserName: (name) => set({ userName: name }),

      logout: () =>
        set({
          userId: null,
          userName: "",
          email: "",
          avatarBase64: null,
        }),
    }),
    { name: "komaflip-user" }
  )
);
