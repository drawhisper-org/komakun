"use client";

import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import {
  EyeglassesIcon,
  GlobeIcon,
  CheckIcon,
} from "@phosphor-icons/react";
import { Nunito } from "next/font/google";
import { useLocaleStore, type Locale } from "@/stores/locale-store";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "700", "800", "900"],
  variable: "--font-nunito",
});

const LOCALE_OPTIONS: { value: Locale; label: string; short: string }[] = [
  { value: "en", label: "English", short: "EN" },
  { value: "zh", label: "简体中文", short: "简" },
  { value: "zh-TW", label: "繁體中文", short: "繁" },
  { value: "ja", label: "日本語", short: "JP" },
];

function GitHubIcon() {
  const { resolvedTheme } = useTheme();
  return (
    <img
      src={resolvedTheme === "dark" ? "/images/Github-Symbol-Dark.svg" : "/images/Github-Symbol.svg"}
      alt="GitHub"
      className="h-4 w-4"
    />
  );
}

export function DashboardTopbar() {
  const pathname = usePathname();
  const tHome = useTranslations("home");
  const tSettings = useTranslations("settings");

  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const current = LOCALE_OPTIONS.find((o) => o.value === locale) ?? LOCALE_OPTIONS[0];

  const title = pathname === "/settings" ? tSettings("title") : tHome("recents");

  return (
    <div className="flex h-12 shrink-0 items-center justify-between border-b border-outline-variant/10 px-6">
      <div className="flex items-center">
        {/* Mobile brand (sidebar hidden on small screens) */}
        <div className="flex items-center gap-2 md:hidden">
          <EyeglassesIcon weight="bold" className="h-5 w-5 text-primary" />
          <span className={`text-base font-black tracking-tight text-on-surface ${nunito.className}`}>
            KomaKun<span className="text-primary">!</span>
          </span>
        </div>
        <h1 className="hidden text-sm font-semibold text-on-surface md:block">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-1">
        {/* Language switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex h-8 items-center gap-1.5 rounded-full px-2.5 text-on-surface-variant/60 transition-colors hover:bg-surface-variant/20 hover:text-on-surface-variant">
              <GlobeIcon weight="bold" className="h-4 w-4" />
              <span className="text-[11px] font-medium">{current.short}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-35">
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

        {/* GitHub */}
        <a
          href="https://github.com/drawhisper-org/komakun"
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant/50 transition-colors hover:bg-surface-variant/20 hover:text-on-surface-variant"
        >
          <GitHubIcon />
        </a>

        {/* Discord */}
        <a
          href="https://discord.gg/dazJmnpJCw"
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant/50 transition-colors hover:bg-surface-variant/20 hover:text-on-surface-variant"
        >
          <img src="/images/Discord-Symbol-Blurple.svg" alt="Discord" className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}
