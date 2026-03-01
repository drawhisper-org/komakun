"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  ClockCounterClockwiseIcon,
  EyeglassesIcon,
  GearSixIcon,
} from "@phosphor-icons/react";
import { Nunito } from "next/font/google";
import { useTranslations } from "next-intl";
import { UserDropdown } from "@/components/user/user-dropdown";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "700", "800", "900"],
  variable: "--font-nunito",
});

export function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const tHome = useTranslations("home");
  const tSettings = useTranslations("settings");

  const navItems = [
    {
      label: tHome("recents"),
      icon: ClockCounterClockwiseIcon,
      href: "/",
      active: pathname === "/",
    },
    {
      label: tSettings("title"),
      icon: GearSixIcon,
      href: "/settings",
      active: pathname === "/settings",
    },
  ];

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
        {navItems.map((item) => (
          <button
            key={item.href}
            onClick={() => !item.active && router.push(item.href)}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              item.active
                ? "bg-primary-container/30 text-on-surface"
                : "text-on-surface-variant/60 hover:bg-surface-variant/20"
            }`}
          >
            <item.icon
              weight="fill"
              className={`h-4.5 w-4.5 ${item.active ? "text-primary" : ""}`}
            />
            {item.label}
          </button>
        ))}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />
    </aside>
  );
}
