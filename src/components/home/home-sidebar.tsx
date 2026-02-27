"use client";

import {
  ClockCounterClockwiseIcon,
  EyeglassesIcon,
  GearSixIcon,
} from "@phosphor-icons/react";
import { Nunito } from "next/font/google";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { UserDropdown } from "@/components/user/user-dropdown";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "700", "800", "900"],
  variable: "--font-nunito",
});

export function HomeSidebar() {
  const t = useTranslations("home");
  const tSettings = useTranslations("settings");
  const router = useRouter();
  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-outline-variant/20 bg-surface">
      {/* Brand */}
      <div className="flex items-center gap-2 px-4 py-5">
        <EyeglassesIcon weight="bold" className="h-5 w-5 text-primary" />
        <span className={`text-lg font-black tracking-tight text-on-surface ${nunito.className}`}>
          KomaKun<span className="text-primary">!</span>
        </span>
      </div>

      {/* User dropdown */}
      <div className="mx-3 mb-4">
        <UserDropdown />
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-0.5 px-3">
        <button className="flex items-center gap-2.5 rounded-lg bg-primary-container/30 px-3 py-2 text-sm font-medium text-on-surface transition-colors">
          <ClockCounterClockwiseIcon weight="fill" className="h-4.5 w-4.5 text-primary" />
          {t("recents")}
        </button>
        <button
          onClick={() => router.push("/settings")}
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-on-surface-variant/60 transition-colors hover:bg-surface-variant/20"
        >
          <GearSixIcon weight="fill" className="h-4.5 w-4.5" />
          {tSettings("title")}
        </button>
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Footer */}
      {/* <div className="px-4 py-3 text-[10px] text-on-surface-variant/30">
        {t("openSource")}
      </div> */}
    </aside>
  );
}
