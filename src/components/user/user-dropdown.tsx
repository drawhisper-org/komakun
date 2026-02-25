"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  GearSixIcon,
  SignOutIcon,
  PencilSimpleIcon,
  CaretDownIcon,
  PaletteIcon,
} from "@phosphor-icons/react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useUserStore } from "@/stores/user-store";
import { useTranslations } from "next-intl";
import { AvatarUploadDialog } from "@/components/user/avatar-upload-dialog";

interface UserDropdownProps {
  onOpenSettings: () => void;
}

export function UserDropdown({ onOpenSettings }: UserDropdownProps) {
  const t = useTranslations("user");
  const router = useRouter();
  const userName = useUserStore((s) => s.userName);
  const email = useUserStore((s) => s.email);
  const avatarBase64 = useUserStore((s) => s.avatarBase64);
  const logout = useUserStore((s) => s.logout);
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);

  const initials = userName
    ? userName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition-colors hover:bg-surface-variant/30">
            {/* Avatar */}
            {avatarBase64 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarBase64}
                alt={userName}
                className="h-7 w-7 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {initials}
              </div>
            )}
            <span className="max-w-[100px] truncate text-xs font-medium text-on-surface">
              {userName}
            </span>
            <CaretDownIcon weight="fill" className="h-3 w-3 text-on-surface-variant/50" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-64 p-0">
          {/* User header */}
          <div className="flex flex-col items-center gap-2 px-4 py-5">
            {/* Editable avatar */}
            <button
              onClick={() => setAvatarDialogOpen(true)}
              className="group relative"
            >
              {avatarBase64 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarBase64}
                  alt={userName}
                  className="h-16 w-16 rounded-full object-cover ring-2 ring-primary/30"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground ring-2 ring-primary/30">
                  {initials}
                </div>
              )}
              <div className="absolute -right-0.5 -bottom-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-surface-variant text-on-surface-variant shadow-sm ring-1 ring-outline-variant/30">
                <PencilSimpleIcon weight="fill" className="h-2.5 w-2.5" />
              </div>
            </button>
            <div className="text-center">
              <p className="text-sm font-semibold text-on-surface">{userName}</p>
              <p className="text-[11px] text-on-surface-variant/60">{email}</p>
            </div>
          </div>

          <DropdownMenuSeparator />

          {/* Menu items */}
          <div className="py-1">
            <DropdownMenuItem
              onClick={() => setAvatarDialogOpen(true)}
              className="mx-1 gap-2.5 rounded-lg px-3 py-2 text-xs"
            >
              <PaletteIcon weight="fill" className="h-4 w-4 text-on-surface-variant/60" />
              {t("changeAvatar")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onOpenSettings}
              className="mx-1 gap-2.5 rounded-lg px-3 py-2 text-xs"
            >
              <GearSixIcon weight="fill" className="h-4 w-4 text-on-surface-variant/60" />
              {t("settings")}
            </DropdownMenuItem>
          </div>

          <DropdownMenuSeparator />

          {/* Logout */}
          <div className="p-2">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20"
            >
              <SignOutIcon weight="fill" className="h-4 w-4" />
              {t("logOut")}
            </button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <AvatarUploadDialog open={avatarDialogOpen} onOpenChange={setAvatarDialogOpen} />
    </>
  );
}
