"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Nunito, Inter } from "next/font/google";
import {
  motion,
  useScroll,
  useTransform,
  useInView,
  AnimatePresence,
} from "framer-motion";
import {
  TranslateIcon,
  MagicWandIcon,
  TextTIcon,
  ImagesIcon,
  ArrowRightIcon,
  SparkleIcon,
  PlayIcon,
  EyeglassesIcon,
  BracketsAngleIcon,
  UsersThreeIcon,
  GlobeIcon,
  LightningIcon,
  GithubLogoIcon,
  DiscordLogoIcon,
} from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useUserStore } from "@/stores/user-store";
import { useLocaleStore, type Locale } from "@/stores/locale-store";

/* ── Rounded bubbly sans for brand name (anime/manga feel) ──── */
const nunito = Nunito({
  subsets: ["latin"],
  weight: ["700", "800", "900"],
  display: "swap",
  variable: "--font-nunito",
});

/* ── Clean geometric sans for subtitles (Figma-style) ──────── */
const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  variable: "--font-inter",
});

/* ═══════════════════ Utility Components ═══════════════════════ */

const LOCALE_OPTIONS: { value: Locale; label: string; short: string }[] = [
  { value: "en", label: "English", short: "EN" },
  { value: "zh", label: "简体中文", short: "简" },
  { value: "zh-TW", label: "繁體中文", short: "繁" },
  { value: "ja", label: "日本語", short: "JP" },
];

/** Compact language switcher dropdown */
function LanguageSwitcher() {
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const current = LOCALE_OPTIONS.find((o) => o.value === locale) ?? LOCALE_OPTIONS[0];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 items-center gap-1 rounded-full px-2 text-on-surface-variant/50 transition-colors hover:bg-surface-variant/20 hover:text-on-surface-variant"
      >
        <GlobeIcon weight="bold" className="h-[16px] w-[16px]" />
        <span className="text-[11px] font-medium">{current.short}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-1.5 z-50 min-w-[140px] rounded-xl border border-outline-variant/20 bg-surface/95 p-1 shadow-lg backdrop-blur-xl"
          >
            {LOCALE_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => { setLocale(value); setOpen(false); }}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs transition-colors ${
                  locale === value
                    ? "bg-primary-container/30 font-medium text-on-surface"
                    : "text-on-surface-variant hover:bg-surface-variant/30"
                }`}
              >
                {label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Character-by-character stagger reveal */
function RevealText({
  text,
  className,
  delay = 0,
}: {
  text: string;
  className?: string;
  delay?: number;
}) {
  return (
    <span className={className}>
      {text.split("").map((char, i) => (
        <motion.span
          key={i}
          className="inline-block"
          initial={{ y: "120%", opacity: 0 }}
          animate={{ y: "0%", opacity: 1 }}
          transition={{
            duration: 0.8,
            delay: delay + i * 0.04,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          {char === " " ? "\u00A0" : char}
        </motion.span>
      ))}
    </span>
  );
}

/** Animated counting number */
function Counter({
  value,
  suffix = "",
  prefix = "",
}: {
  value: number;
  suffix?: string;
  prefix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    let frame: number;
    const duration = 2000;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * value));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isInView, value]);

  return (
    <span ref={ref}>
      {prefix}
      {count}
      {suffix}
    </span>
  );
}

/** Manga-style speech bubble tail — seamless curved SVG */
function BubbleTail({ className = "", fill = "rgba(255,255,255,0.9)" }: { className?: string; fill?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 10" preserveAspectRatio="none">
      <path d="M 0,0 C 3,0 7,10 10,10 C 13,10 17,0 20,0 Z" fill={fill} />
    </svg>
  );
}

/** Interactive Translation Showcase with tabs */
function TranslationShowcase() {
  const t = useTranslations("landing");
  const [activeTab, setActiveTab] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const tabs = [
    { label: t("showcase.tab1"), step: "01" },
    { label: t("showcase.tab2"), step: "02" },
    { label: t("showcase.tab3"), step: "03" },
  ];

  const descriptions = [
    {
      title: t("showcase.step1Title"),
      desc: t("showcase.step1Desc"),
    },
    {
      title: t("showcase.step2Title"),
      desc: t("showcase.step2Desc"),
    },
    {
      title: t("showcase.step3Title"),
      desc: t("showcase.step3Desc"),
    },
  ];

  useEffect(() => {
    if (!isAutoPlaying) return;
    const timer = setInterval(() => {
      setActiveTab((prev) => (prev + 1) % 3);
    }, 3500);
    return () => clearInterval(timer);
  }, [isAutoPlaying]);

  const panelContent = [
    // Tab 0: OCR — manga layout with speech bubbles integrated into panels
    <div key="ocr" className="relative h-full w-full">
      <div className="absolute inset-3 flex flex-col gap-1.5 md:inset-4">
        {/* Top panel — main scene with bubbles */}
        <div className="relative flex-[2] overflow-hidden rounded-md border border-on-surface-variant/10 bg-gradient-to-br from-indigo-900/15 to-indigo-800/8">
          {/* Character silhouettes integrated in scene */}
          <div className="absolute bottom-0 left-[8%] h-[70%] w-[30%] rounded-t-full bg-gradient-to-t from-indigo-700/15 to-indigo-600/5" />
          <div className="absolute bottom-0 right-[18%] h-[55%] w-[22%] rounded-t-full bg-gradient-to-t from-violet-700/10 to-violet-600/3" />

          {/* Narration box — top left corner */}
          <div className="absolute top-2 left-2 md:top-3 md:left-3">
            <motion.div className="absolute -inset-1.5 rounded border-2 border-dashed border-cyan-500/50" animate={{ opacity: [0.3, 1, 1, 0.3] }} transition={{ duration: 2.5, delay: 0.8, repeat: Infinity, times: [0, 0.2, 0.8, 1] }} />
            <div className="rounded bg-black/75 px-2.5 py-1 md:px-3 md:py-1.5">
              <p className="text-[7px] font-medium text-white/90 md:text-[9px]">その日の朝──</p>
            </div>
          </div>

          {/* Speech bubble A — right character, tail points down-left */}
          <div className="absolute top-[8%] right-[5%] max-w-[45%]">
            <motion.div className="absolute -inset-1.5 rounded-[16px] border-2 border-dashed border-primary/60" animate={{ opacity: [0.3, 1, 1, 0.3] }} transition={{ duration: 2.5, repeat: Infinity, times: [0, 0.2, 0.8, 1] }} />
            <div className="relative rounded-[16px] bg-white/93 px-3 py-2 shadow-sm md:px-4 md:py-2.5">
              <p className="text-[9px] font-bold leading-snug text-gray-900 md:text-[13px]">おはようございます！</p>
              <p className="mt-0.5 text-[7px] leading-snug text-gray-600 md:text-[10px]">今日はいい天気ですね。</p>
              <p className="mt-0.5 text-[6px] leading-snug text-gray-400 md:text-[9px]">散歩に行きませんか？</p>
              {/* Tail */}
              <BubbleTail className="absolute -bottom-[6px] left-[18%] h-[8px] w-5" fill="rgba(255,255,255,0.93)" />
            </div>
          </div>

          {/* Speech bubble B — left character, tail points down-right */}
          <div className="absolute top-[48%] left-[4%] max-w-[40%]">
            <motion.div className="absolute -inset-1.5 rounded-[14px] border-2 border-dashed border-violet-500/50" animate={{ opacity: [0.3, 1, 1, 0.3] }} transition={{ duration: 2.5, delay: 0.4, repeat: Infinity, times: [0, 0.2, 0.8, 1] }} />
            <div className="relative rounded-[14px] bg-white/90 px-3 py-1.5 shadow-sm md:px-3.5 md:py-2">
              <p className="text-[8px] font-bold text-gray-900 md:text-[11px]">ええ、行きましょう！</p>
              <BubbleTail className="absolute -bottom-[5px] right-[24%] h-[7px] w-4" fill="rgba(255,255,255,0.9)" />
            </div>
          </div>
        </div>

        {/* Bottom row — two panels side by side */}
        <div className="flex flex-1 gap-1.5">
          {/* Bottom-left panel */}
          <div className="relative flex-1 overflow-hidden rounded-md border border-on-surface-variant/10 bg-gradient-to-br from-violet-900/10 to-violet-800/5">
            <div className="absolute bottom-0 right-3 h-[65%] w-[35%] rounded-t-full bg-gradient-to-t from-violet-700/10 to-transparent" />
            {/* Exclamation bubble */}
            <div className="absolute top-[6%] left-[5%] max-w-[65%]">
              <motion.div className="absolute -inset-1.5 rounded-[12px] border-2 border-dashed border-primary/50" animate={{ opacity: [0.3, 1, 1, 0.3] }} transition={{ duration: 2.5, delay: 0.6, repeat: Infinity, times: [0, 0.2, 0.8, 1] }} />
              <div className="relative rounded-[12px] bg-white/90 px-2.5 py-1.5 shadow-sm md:px-3 md:py-2">
                <p className="text-[7px] font-bold text-gray-900 md:text-[10px]">待ってください！</p>
                <p className="text-[6px] text-gray-500 md:text-[8px]">まだ準備が...</p>
                <BubbleTail className="absolute -bottom-[5px] right-[28%] h-[6px] w-3.5" fill="rgba(255,255,255,0.9)" />
              </div>
            </div>
            {/* Thought bubble — round */}
            <div className="absolute right-[6%] bottom-[12%]">
              <motion.div className="absolute -inset-1.5 rounded-full border-2 border-dashed border-emerald-500/40" animate={{ opacity: [0.2, 0.8, 0.8, 0.2] }} transition={{ duration: 3, delay: 1, repeat: Infinity, times: [0, 0.2, 0.8, 1] }} />
              <div className="rounded-full bg-white/85 px-2 py-1 shadow-sm md:px-2.5 md:py-1.5">
                <p className="text-[6px] italic text-gray-600 md:text-[8px]">（どうしよう...）</p>
              </div>
            </div>
          </div>

          {/* Bottom-right panel — SFX text */}
          <div className="relative flex-1 overflow-hidden rounded-md border border-on-surface-variant/10 bg-gradient-to-br from-cyan-900/10 to-cyan-800/5">
            <div className="absolute top-[6%] left-[6%]">
              <motion.div className="absolute -inset-1.5 rounded border-2 border-dashed border-amber-500/50" animate={{ opacity: [0.3, 1, 1, 0.3] }} transition={{ duration: 2.5, delay: 1.2, repeat: Infinity, times: [0, 0.2, 0.8, 1] }} />
              <span className="text-sm font-black text-white/25 md:text-lg">ドドド</span>
            </div>
            <div className="absolute right-[8%] bottom-[12%]">
              <motion.div className="absolute -inset-1 rounded border-2 border-dashed border-rose-500/40" animate={{ opacity: [0.3, 0.9, 0.9, 0.3] }} transition={{ duration: 2.5, delay: 1.5, repeat: Infinity, times: [0, 0.2, 0.8, 1] }} />
              <span className="text-[9px] font-black text-white/20 md:text-xs">バタン！</span>
            </div>
            <div className="absolute bottom-[40%] left-[30%]">
              <motion.div className="absolute -inset-1 rounded border-2 border-dashed border-orange-500/30" animate={{ opacity: [0.2, 0.7, 0.7, 0.2] }} transition={{ duration: 3, delay: 0.9, repeat: Infinity, times: [0, 0.2, 0.8, 1] }} />
              <span className="text-[7px] font-bold text-white/15 md:text-[9px]">ザッ</span>
            </div>
          </div>
        </div>
      </div>
    </div>,

    // Tab 1: Cleaned — same layout, text emptied, sparkle FX
    <div key="clean" className="relative h-full w-full">
      <div className="absolute inset-3 flex flex-col gap-1.5 md:inset-4">
        <div className="relative flex-[2] overflow-hidden rounded-md border border-on-surface-variant/10 bg-gradient-to-br from-indigo-900/15 to-indigo-800/8">
          <div className="absolute bottom-0 left-[8%] h-[70%] w-[30%] rounded-t-full bg-gradient-to-t from-indigo-700/15 to-indigo-600/5" />
          <div className="absolute bottom-0 right-[18%] h-[55%] w-[22%] rounded-t-full bg-gradient-to-t from-violet-700/10 to-violet-600/3" />

          {/* Cleaned narration box */}
          <div className="absolute top-2 left-2 md:top-3 md:left-3">
            <div className="rounded bg-black/75 px-2.5 py-1 md:px-3 md:py-1.5">
              <div className="h-2 w-10 md:h-2.5 md:w-14" />
            </div>
            <motion.div className="absolute -top-1 -right-1" animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5] }} transition={{ duration: 2, delay: 0.7, repeat: Infinity }}>
              <SparkleIcon weight="fill" className="h-3 w-3 text-cyan-400/60" />
            </motion.div>
          </div>

          {/* Cleaned bubble A */}
          <div className="absolute top-[8%] right-[5%] max-w-[45%]">
            <div className="relative rounded-[16px] bg-white/93 px-3 py-2 shadow-sm md:px-4 md:py-2.5">
              <div className="h-3 w-20 md:h-4 md:w-28" />
              <div className="mt-1 h-2 w-16 md:h-3 md:w-22" />
              <div className="mt-1 h-2 w-12 md:h-2.5 md:w-18" />
              <BubbleTail className="absolute -bottom-[6px] left-[18%] h-[8px] w-5" fill="rgba(255,255,255,0.93)" />
            </div>
            <motion.div className="absolute -top-1 -right-1" animate={{ opacity: [0, 1, 0], scale: [0.5, 1.3, 0.5] }} transition={{ duration: 2, repeat: Infinity }}>
              <SparkleIcon weight="fill" className="h-4 w-4 text-primary/60" />
            </motion.div>
          </div>

          {/* Cleaned bubble B */}
          <div className="absolute top-[48%] left-[4%] max-w-[40%]">
            <div className="relative rounded-[14px] bg-white/90 px-3 py-1.5 shadow-sm md:px-3.5 md:py-2">
              <div className="h-2.5 w-16 md:h-3 md:w-20" />
              <BubbleTail className="absolute -bottom-[5px] right-[24%] h-[7px] w-4" fill="rgba(255,255,255,0.9)" />
            </div>
            <motion.div className="absolute -top-1 -left-1" animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5] }} transition={{ duration: 2, delay: 0.4, repeat: Infinity }}>
              <SparkleIcon weight="fill" className="h-3.5 w-3.5 text-violet-400/60" />
            </motion.div>
          </div>
        </div>

        <div className="flex flex-1 gap-1.5">
          <div className="relative flex-1 overflow-hidden rounded-md border border-on-surface-variant/10 bg-gradient-to-br from-violet-900/10 to-violet-800/5">
            <div className="absolute bottom-0 right-3 h-[65%] w-[35%] rounded-t-full bg-gradient-to-t from-violet-700/10 to-transparent" />
            {/* Cleaned exclamation bubble */}
            <div className="absolute top-[6%] left-[5%] max-w-[65%]">
              <div className="relative rounded-[12px] bg-white/90 px-2.5 py-1.5 shadow-sm md:px-3 md:py-2">
                <div className="h-2 w-14 md:h-3 md:w-18" />
                <div className="mt-0.5 h-1.5 w-10 md:h-2 md:w-12" />
                <BubbleTail className="absolute -bottom-[5px] right-[28%] h-[6px] w-3.5" fill="rgba(255,255,255,0.9)" />
              </div>
              <motion.div className="absolute -bottom-1 -right-1" animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5] }} transition={{ duration: 2, delay: 0.5, repeat: Infinity }}>
                <SparkleIcon weight="fill" className="h-3 w-3 text-primary/60" />
              </motion.div>
            </div>
            {/* Cleaned thought */}
            <div className="absolute right-[6%] bottom-[12%]">
              <div className="rounded-full bg-white/85 px-2 py-1 shadow-sm md:px-2.5 md:py-1.5">
                <div className="h-1.5 w-10 md:h-2 md:w-14" />
              </div>
            </div>
          </div>
          <div className="relative flex-1 overflow-hidden rounded-md border border-on-surface-variant/10 bg-gradient-to-br from-cyan-900/10 to-cyan-800/5">
            {/* Sparkle FX where SFX was */}
            <motion.div className="absolute top-[10%] left-[10%]" animate={{ opacity: [0, 1, 0], scale: [0.8, 1.2, 0.8] }} transition={{ duration: 2.5, delay: 0.3, repeat: Infinity }}>
              <SparkleIcon weight="fill" className="h-5 w-5 text-amber-400/40" />
            </motion.div>
            <motion.div className="absolute right-[12%] bottom-[16%]" animate={{ opacity: [0, 1, 0], scale: [0.8, 1.2, 0.8] }} transition={{ duration: 2.5, delay: 0.8, repeat: Infinity }}>
              <SparkleIcon weight="fill" className="h-4 w-4 text-rose-400/40" />
            </motion.div>
            <motion.div className="absolute bottom-[42%] left-[34%]" animate={{ opacity: [0, 1, 0], scale: [0.8, 1.2, 0.8] }} transition={{ duration: 2.5, delay: 1.1, repeat: Infinity }}>
              <SparkleIcon weight="fill" className="h-3.5 w-3.5 text-orange-400/40" />
            </motion.div>
          </div>
        </div>
      </div>
    </div>,

    // Tab 2: Translated — same layout, English text in all bubbles
    <div key="translate" className="relative h-full w-full">
      <div className="absolute inset-3 flex flex-col gap-1.5 md:inset-4">
        <div className="relative flex-[2] overflow-hidden rounded-md border border-on-surface-variant/10 bg-gradient-to-br from-indigo-900/15 to-indigo-800/8">
          <div className="absolute bottom-0 left-[8%] h-[70%] w-[30%] rounded-t-full bg-gradient-to-t from-indigo-700/15 to-indigo-600/5" />
          <div className="absolute bottom-0 right-[18%] h-[55%] w-[22%] rounded-t-full bg-gradient-to-t from-violet-700/10 to-violet-600/3" />

          {/* Translated narration box */}
          <div className="absolute top-2 left-2 md:top-3 md:left-3">
            <div className="rounded bg-black/80 px-2.5 py-1 md:px-3 md:py-1.5">
              <p className="text-[7px] font-medium text-white/95 md:text-[9px]">{t("showcase.translatedNarration")}</p>
            </div>
          </div>

          {/* Translated bubble A */}
          <div className="absolute top-[8%] right-[5%] max-w-[45%]">
            <motion.div className="absolute -inset-1.5 rounded-[16px] border-2 border-primary/20" animate={{ opacity: [0, 0.5, 0] }} transition={{ duration: 3, repeat: Infinity }} />
            <div className="relative rounded-[16px] bg-white/95 px-3 py-2 shadow-md md:px-4 md:py-2.5">
              <p className="text-[9px] font-bold leading-snug text-gray-900 md:text-[13px]">{t("showcase.translatedBubbleA1")}</p>
              <p className="mt-0.5 text-[7px] leading-snug text-gray-600 md:text-[10px]">{t("showcase.translatedBubbleA2")}</p>
              <p className="mt-0.5 text-[6px] leading-snug text-gray-400 md:text-[9px]">{t("showcase.translatedBubbleA3")}</p>
              <BubbleTail className="absolute -bottom-[6px] left-[18%] h-[8px] w-5" fill="rgba(255,255,255,0.95)" />
            </div>
          </div>

          {/* Translated bubble B */}
          <div className="absolute top-[48%] left-[4%] max-w-[40%]">
            <div className="relative rounded-[14px] bg-white/95 px-3 py-1.5 shadow-sm md:px-3.5 md:py-2">
              <p className="text-[8px] font-bold text-gray-900 md:text-[11px]">{t("showcase.translatedBubbleB")}</p>
              <BubbleTail className="absolute -bottom-[5px] right-[24%] h-[7px] w-4" fill="rgba(255,255,255,0.95)" />
            </div>
          </div>
        </div>

        <div className="flex flex-1 gap-1.5">
          <div className="relative flex-1 overflow-hidden rounded-md border border-on-surface-variant/10 bg-gradient-to-br from-violet-900/10 to-violet-800/5">
            <div className="absolute bottom-0 right-3 h-[65%] w-[35%] rounded-t-full bg-gradient-to-t from-violet-700/10 to-transparent" />
            {/* Translated exclamation */}
            <div className="absolute top-[6%] left-[5%] max-w-[65%]">
              <div className="relative rounded-[12px] bg-white/95 px-2.5 py-1.5 shadow-sm md:px-3 md:py-2">
                <p className="text-[7px] font-bold text-gray-900 md:text-[10px]">{t("showcase.translatedExclamation1")}</p>
                <p className="text-[6px] text-gray-500 md:text-[8px]">{t("showcase.translatedExclamation2")}</p>
                <BubbleTail className="absolute -bottom-[5px] right-[28%] h-[6px] w-3.5" fill="rgba(255,255,255,0.95)" />
              </div>
            </div>
            {/* Translated thought */}
            <div className="absolute right-[6%] bottom-[12%]">
              <div className="rounded-full bg-white/92 px-2 py-1 shadow-sm md:px-2.5 md:py-1.5">
                <p className="text-[6px] italic text-gray-600 md:text-[8px]">{t("showcase.translatedThought")}</p>
              </div>
            </div>
          </div>

          <div className="relative flex-1 overflow-hidden rounded-md border border-on-surface-variant/10 bg-gradient-to-br from-cyan-900/10 to-cyan-800/5">
            {/* Translated SFX */}
            <div className="absolute top-[6%] left-[6%]">
              <span className="text-sm font-black italic text-white/22 md:text-lg">{t("showcase.translatedSfx1")}</span>
            </div>
            <div className="absolute right-[8%] bottom-[12%]">
              <span className="text-[9px] font-black italic text-white/18 md:text-xs">{t("showcase.translatedSfx2")}</span>
            </div>
            <div className="absolute bottom-[40%] left-[30%]">
              <span className="text-[7px] font-bold italic text-white/14 md:text-[9px]">{t("showcase.translatedSfx3")}</span>
            </div>
          </div>
        </div>
      </div>
    </div>,
  ];

  return (
    <div>
      {/* Tab bar */}
      <div className="mb-8 flex justify-center">
        <div className="inline-flex rounded-2xl border border-outline-variant/10 bg-surface p-1.5">
          {tabs.map((tab, i) => (
            <button
              key={tab.label}
              onClick={() => {
                setActiveTab(i);
                setIsAutoPlaying(false);
              }}
              className={`relative rounded-xl px-5 py-2.5 text-xs font-medium transition-all ${
                activeTab === i
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-on-surface-variant/50 hover:text-on-surface-variant/80"
              }`}
            >
              <span className="relative z-10 flex items-center gap-2">
                <span className="text-[10px] font-bold opacity-60">
                  {tab.step}
                </span>
                {tab.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Large manga panel preview */}
      <div className="mx-auto max-w-2xl">
        <div className="aspect-[3/4] overflow-hidden rounded-3xl border border-outline-variant/10 bg-gradient-to-b from-surface-variant/20 to-surface-variant/5 shadow-2xl shadow-black/10">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="h-full w-full"
            >
              {panelContent[activeTab]}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Progress dots */}
        <div className="mt-6 flex justify-center gap-2">
          {tabs.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setActiveTab(i);
                setIsAutoPlaying(false);
              }}
              className="relative overflow-hidden rounded-full bg-on-surface-variant/10 transition-all"
              style={{
                width: activeTab === i ? 32 : 12,
                height: 6,
              }}
            >
              {activeTab === i && (
                <motion.div
                  className="absolute inset-0 rounded-full bg-primary"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{
                    duration: isAutoPlaying ? 3.5 : 0.4,
                    ease: "linear",
                  }}
                  style={{ transformOrigin: "left" }}
                />
              )}
              {activeTab !== i && i < activeTab && (
                <div className="absolute inset-0 rounded-full bg-primary/40" />
              )}
            </button>
          ))}
        </div>

        {/* Step description below */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="mt-6 text-center"
          >
            <h3 className="mb-1 text-base font-semibold text-on-surface">
              {descriptions[activeTab].title}
            </h3>
            <p className={`mx-auto max-w-md text-xs leading-relaxed text-on-surface-variant/50 ${inter.className}`}>
              {descriptions[activeTab].desc}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ═══════════════════ Glasses Logo Component ═══════════════════ */
function GlassesLogo({ className = "h-8 w-8" }: { className?: string }) {
  return <EyeglassesIcon weight="bold" className={className} />;
}

/* ═══════════════════ Main Component ═══════════════════════════ */

export function LandingPage() {
  const t = useTranslations("landing");
  const router = useRouter();
  const login = useUserStore((s) => s.login);
  const [showLogin, setShowLogin] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [translationLang, setTranslationLang] = useState<'en' | 'zh'>('en');

  /* ── Nav scroll state ── */
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  /* ── Refs ── */
  const heroRef = useRef<HTMLDivElement>(null);
  const videoSectionRef = useRef<HTMLDivElement>(null);

  /* ── Hero parallax (lightweight — no springs) ── */
  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroOpacity = useTransform(heroProgress, [0, 0.6], [1, 0]);

  /* ── Video sticky scroll transforms (no springs — direct transforms for perf) ── */
  const { scrollYProgress: videoProgress } = useScroll({
    target: videoSectionRef,
    offset: ["start end", "end start"],
  });
  const videoScale = useTransform(videoProgress, [0.1, 0.45], [0.82, 1]);
  const videoBorderRadius = useTransform(videoProgress, [0.1, 0.45], [24, 0]);
  const videoOverlayOpacity = useTransform(
    videoProgress,
    [0.1, 0.35],
    [1, 0],
  );

  const handleLogin = useCallback(() => {
    if (!name.trim()) return;
    login(name.trim(), email.trim());
    router.push("/");
  }, [name, email, login, router]);

  /* ── Data ── */
  const features = [
    {
      icon: TranslateIcon,
      title: t("features.aiTranslation"),
      desc: t("features.aiTranslationDesc"),
      gradient: "from-indigo-500/20 to-blue-500/20",
      iconBg: "bg-indigo-500/10",
      iconColor: "text-indigo-400",
      borderHover: "hover:border-indigo-500/30",
      tag: t("features.aiTranslationTag"),
    },
    {
      icon: MagicWandIcon,
      title: t("features.smartCleaning"),
      desc: t("features.smartCleaningDesc"),
      gradient: "from-violet-500/20 to-purple-500/20",
      iconBg: "bg-violet-500/10",
      iconColor: "text-violet-400",
      borderHover: "hover:border-violet-500/30",
      tag: t("features.smartCleaningTag"),
    },
    {
      icon: TextTIcon,
      title: t("features.proTypesetting"),
      desc: t("features.proTypesettingDesc"),
      gradient: "from-cyan-500/20 to-blue-500/20",
      iconBg: "bg-cyan-500/10",
      iconColor: "text-cyan-400",
      borderHover: "hover:border-cyan-500/30",
      tag: t("features.proTypesettingTag"),
    },
    {
      icon: ImagesIcon,
      title: t("features.batchProcessing"),
      desc: t("features.batchProcessingDesc"),
      gradient: "from-emerald-500/20 to-teal-500/20",
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-400",
      borderHover: "hover:border-emerald-500/30",
      tag: t("features.batchProcessingTag"),
    },
    {
      icon: BracketsAngleIcon,
      title: t("features.openSource"),
      desc: t("features.openSourceDesc"),
      gradient: "from-amber-500/20 to-orange-500/20",
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-400",
      borderHover: "hover:border-amber-500/30",
      tag: t("features.openSourceTag"),
    },
    {
      icon: UsersThreeIcon,
      title: t("features.builtForTeams"),
      desc: t("features.builtForTeamsDesc"),
      gradient: "from-rose-500/20 to-pink-500/20",
      iconBg: "bg-rose-500/10",
      iconColor: "text-rose-400",
      borderHover: "hover:border-rose-500/30",
      tag: t("features.builtForTeamsTag"),
    },
  ];

  const workflowSteps = [
    {
      num: "01",
      title: t("workflow.import"),
      desc: t("workflow.importDesc"),
      icon: ImagesIcon,
      color: "from-indigo-500 to-indigo-600",
      glowColor: "shadow-indigo-500/20",
      ringColor: "ring-indigo-500/30",
    },
    {
      num: "02",
      title: t("workflow.detect"),
      desc: t("workflow.detectDesc"),
      icon: SparkleIcon,
      color: "from-violet-500 to-violet-600",
      glowColor: "shadow-violet-500/20",
      ringColor: "ring-violet-500/30",
    },
    {
      num: "03",
      title: t("workflow.clean"),
      desc: t("workflow.cleanDesc"),
      icon: MagicWandIcon,
      color: "from-cyan-500 to-cyan-600",
      glowColor: "shadow-cyan-500/20",
      ringColor: "ring-cyan-500/30",
    },
    {
      num: "04",
      title: t("workflow.translate"),
      desc: t("workflow.translateDesc"),
      icon: TranslateIcon,
      color: "from-blue-500 to-blue-600",
      glowColor: "shadow-blue-500/20",
      ringColor: "ring-blue-500/30",
    },
    {
      num: "05",
      title: t("workflow.typesetExport"),
      desc: t("workflow.typesetExportDesc"),
      icon: TextTIcon,
      color: "from-emerald-500 to-emerald-600",
      glowColor: "shadow-emerald-500/20",
      ringColor: "ring-emerald-500/30",
    },
  ];

  return (
    <div
      className={`relative min-h-screen overflow-x-hidden bg-background ${nunito.variable} ${inter.variable}`}
      style={{ scrollBehavior: "smooth" }}
    >
      {/* ═══════════════════════ NAV ═══════════════════════ */}
      <nav
        className={`fixed top-0 right-0 left-0 z-50 flex items-center justify-between px-6 py-3 transition-all duration-300 md:px-12 ${
          scrolled
            ? "border-b border-outline-variant/10 bg-surface/80 backdrop-blur-xl"
            : ""
        }`}
      >
        <div className="flex items-center gap-2">
          <EyeglassesIcon weight="bold" className="h-6 w-6 text-primary" />
          <span
            className={`text-xl font-black tracking-tight text-on-surface ${nunito.className}`}
          >
            KomaKun<span className="text-primary">!</span>
          </span>
        </div>
        <div className="flex items-center gap-1">
          <LanguageSwitcher />
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant/50 transition-colors hover:bg-surface-variant/20 hover:text-on-surface-variant"
          >
            <GithubLogoIcon weight="fill" className="h-[18px] w-[18px]" />
          </a>
          <a
            href="https://discord.gg"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant/50 transition-colors hover:bg-surface-variant/20 hover:text-on-surface-variant"
          >
            <DiscordLogoIcon weight="fill" className="h-[18px] w-[18px]" />
          </a>
          <motion.button
            onClick={() => setShowLogin(true)}
            className="ml-1 rounded-full bg-primary px-5 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {t("nav.getStarted")}
            <ArrowRightIcon weight="bold" className="ml-1.5 inline h-3 w-3" />
          </motion.button>
        </div>
      </nav>

      {/* ═══════════════════════ HERO ═══════════════════════ */}
      <section
        ref={heroRef}
        className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6"
      >
        {/* Background effects — indigo-tinted */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-0 left-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/8 blur-[120px]" />
          <motion.div
            className="absolute top-1/4 left-[15%] h-64 w-64 rounded-full bg-gradient-to-br from-indigo-500/15 to-transparent blur-3xl"
            animate={{ y: [0, -40, 0], x: [0, 20, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute right-[10%] bottom-1/3 h-48 w-48 rounded-full bg-gradient-to-br from-violet-500/10 to-transparent blur-3xl"
            animate={{ y: [0, 30, 0], x: [0, -15, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute top-1/2 left-[60%] h-32 w-32 rounded-full bg-gradient-to-br from-cyan-500/8 to-transparent blur-3xl"
            animate={{ y: [0, -20, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Subtle grid */}
          <div
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />
          {/* Manga-style speed lines (very subtle) */}
          <div
            className="absolute inset-0 opacity-[0.015]"
            style={{
              backgroundImage:
                "repeating-conic-gradient(transparent 0deg, transparent 3deg, rgba(255,255,255,0.3) 3deg, rgba(255,255,255,0.3) 3.5deg)",
              backgroundPosition: "50% 40%",
            }}
          />
        </div>

        {/* Hero manga cards — two large tilted cards clipped by edges, scroll-fades with hero */}
        <motion.div
          className="pointer-events-none absolute inset-0 z-[1] overflow-hidden will-change-[opacity]"
          style={{ opacity: heroOpacity }}
        >
          {/* ── Left card — original JP, clipped by left edge ── */}
          <motion.div
            initial={{ opacity: 0, x: -80, rotate: -14 }}
            animate={{ opacity: 1, x: 0, rotate: -6 }}
            transition={{ delay: 0.6, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className="absolute top-[6%] -left-[8%] h-[88%] w-[48%] overflow-hidden rounded-3xl border border-white/[0.06] shadow-2xl shadow-black/20 md:-left-[2%] md:h-[92%] md:w-[38%]"
          >
            <Image
              src="/images/1647434910840002.jpg.c1500x.webp"
              alt="Manga page — original Japanese"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 48vw, 35vw"
              priority
            />
            {/* Darken overlay — heavier on the inner edge for text readability */}
            <div className="absolute inset-0 bg-gradient-to-l from-black/60 via-black/25 to-black/10" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10" />
            {/* Language badge */}
            <div className="absolute bottom-4 left-[20%] flex items-center gap-1.5 rounded-full bg-black/50 px-3.5 py-1.5 backdrop-blur-md md:left-[26%]">
              <GlobeIcon weight="bold" className="h-3 w-3 text-white/60" />
              <p className={`text-[9px] font-semibold tracking-wide text-white/80 md:text-[11px] ${inter.className}`}>日本語</p>
            </div>
          </motion.div>

          {/* ── Right card — translated, clipped by right edge ── */}
          <motion.div
            initial={{ opacity: 0, x: 80, rotate: 14 }}
            animate={{ opacity: 1, x: 0, rotate: 6 }}
            transition={{ delay: 0.8, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            onClick={() => setTranslationLang(prev => prev === 'en' ? 'zh' : 'en')}
            className="pointer-events-auto absolute top-[8%] -right-[8%] h-[88%] w-[48%] cursor-pointer overflow-hidden rounded-3xl border border-primary/10 shadow-2xl shadow-black/20 transition-shadow hover:shadow-primary/15 md:-right-[1%] md:h-[92%] md:w-[38%]"
          >
            <Image
              src="/images/1647434910840002.jpg.c1500x.webp"
              alt="Manga page — translated"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 48vw, 35vw"
              priority
            />
            {/* Indigo-tinted overlay — heavier on inner edge */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-primary/15 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/5" />
            {/* Language badge */}
            <AnimatePresence mode="wait">
              <motion.div
                key={translationLang}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
                className="absolute right-[20%] bottom-4 flex items-center gap-1.5 rounded-full bg-primary/60 px-3.5 py-1.5 backdrop-blur-md transition-colors hover:bg-primary/80 md:right-[26%]"
              >
                <TranslateIcon weight="bold" className="h-3 w-3 text-white/80" />
                <p className={`text-[9px] font-semibold tracking-wide text-white md:text-[11px] ${inter.className}`}>
                  {translationLang === 'en' ? t("hero.langEnglish") : t("hero.langChinese")}
                </p>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </motion.div>

        <motion.div
          className="relative z-10 text-center will-change-[opacity]"
          style={{ opacity: heroOpacity }}
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.7, ease: "easeOut" }}
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-5 py-2 backdrop-blur-sm"
          >
            <EyeglassesIcon
              weight="bold"
              className="h-3.5 w-3.5 text-primary"
            />
            <span className={`text-[11px] font-medium uppercase tracking-wide text-primary/90 ${inter.className}`}>
              {t("hero.badge")}
            </span>
          </motion.div>

          {/* Glasses mascot icon */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.6, type: "spring" }}
            className="mb-6 flex justify-center"
          >
            <div className="relative">
              <motion.div
                className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 shadow-xl shadow-primary/10"
                animate={{ rotate: [0, -3, 3, 0] }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <GlassesLogo className="h-10 w-10 text-primary" />
              </motion.div>
            </div>
          </motion.div>

          {/* Title — Nunito (round/bubbly, anime-friendly) */}
          <h1
            className={`mb-8 leading-[0.88] tracking-[-0.02em] ${nunito.className}`}
          >
            <span className="block overflow-hidden">
              <RevealText
                text="Koma"
                className="text-7xl font-black text-on-surface md:text-9xl lg:text-[10rem]"
                delay={0.5}
              />
            </span>
            <span className="block overflow-hidden">
              <RevealText
                text="Kun!"
                className="bg-gradient-to-r from-primary via-indigo-400 to-violet-400 bg-clip-text text-8xl font-black text-transparent md:text-[10rem] lg:text-[12rem]"
                delay={0.7}
              />
            </span>
          </h1>

          {/* Subtitle — Inter (Figma-style clean geometric sans) */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.3, duration: 0.8 }}
            className={`mx-auto mb-12 max-w-md text-sm leading-relaxed text-on-surface-variant/60 md:max-w-lg md:text-base ${inter.className}`}
          >
            {t("hero.subtitle")}
            <br className="hidden sm:block" />
            {t("hero.subtitleLine2")}
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.6, duration: 0.8 }}
            className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
          >
            <motion.button
              onClick={() => setShowLogin(true)}
              className="group inline-flex items-center gap-2.5 rounded-full bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground shadow-2xl shadow-primary/25 transition-shadow hover:shadow-primary/40"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
            >
              {t("hero.ctaPrimary")}
              <ArrowRightIcon
                weight="bold"
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
              />
            </motion.button>
            <motion.button
              onClick={() => {
                document
                  .getElementById("video-section")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
              className="inline-flex items-center gap-2 rounded-full border border-outline-variant/20 bg-surface/50 px-6 py-3.5 text-sm font-medium text-on-surface-variant/70 backdrop-blur-sm transition-colors hover:bg-surface-variant/20"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <PlayIcon weight="fill" className="h-4 w-4 text-primary" />
              {t("hero.ctaDemo")}
            </motion.button>
          </motion.div>
        </motion.div>

      </section>

      {/* ═══════════════════════ VIDEO SHOWCASE (Sticky Scroll) ═══════════════════════ */}
      <section
        id="video-section"
        ref={videoSectionRef}
        className="relative mt-24"
        style={{ height: "140vh" }}
      >
        <div className="sticky top-0 flex h-screen flex-col items-center justify-center gap-6 overflow-hidden px-4 md:px-8">
          {/* Section label — fades out */}
          <motion.div
            style={{ opacity: videoOverlayOpacity }}
            className="text-center"
          >
            <h2
              className={`mb-2 text-3xl font-bold tracking-tight text-on-surface md:text-4xl ${inter.className}`}
            >
              {t("video.heading")}
            </h2>
            <p className="text-sm text-on-surface-variant/50">
              {t("video.description")}
            </p>
          </motion.div>

          {/* Browser Mockup — scales 78%→100% on scroll */}
          <motion.div
            className="w-full max-w-6xl overflow-hidden border border-outline-variant/10 bg-surface shadow-2xl shadow-black/30 will-change-transform"
            style={{
              scale: videoScale,
              borderRadius: videoBorderRadius,
            }}
          >
            {/* Browser chrome */}
            <div className="flex items-center gap-3 border-b border-outline-variant/10 bg-surface-variant/20 px-4 py-2.5">
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-red-400/50" />
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/50" />
                <div className="h-2.5 w-2.5 rounded-full bg-green-400/50" />
              </div>
              <div className="mx-auto flex items-center gap-2 rounded-md bg-background/50 px-4 py-1">
                <div className="h-2 w-2 rounded-full bg-green-400/60" />
                <span className="text-[10px] text-on-surface-variant/40">
                  komakun.app/p/chapter-01
                </span>
              </div>
            </div>

            {/* Editor mockup */}
            <div className="flex aspect-[16/9] bg-background">
              {/* Left sidebar — Pages */}
              <div className="hidden w-48 shrink-0 border-r border-outline-variant/10 bg-surface p-3 md:block">
                <div className="mb-3 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-sm bg-primary/60" />
                  <div className="h-2 w-16 rounded-sm bg-on-surface-variant/15" />
                </div>
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`mb-2 aspect-[3/4] rounded-lg border ${
                      i === 1
                        ? "border-primary/40 bg-primary/5"
                        : "border-outline-variant/10 bg-surface-variant/20"
                    } flex items-center justify-center`}
                  >
                    <div className="flex h-3/4 w-3/4 flex-col gap-1">
                      <div className="h-1/2 rounded-sm bg-on-surface-variant/8" />
                      <div className="flex h-1/2 gap-1">
                        <div className="h-full w-1/2 rounded-sm bg-on-surface-variant/6" />
                        <div className="h-full w-1/2 rounded-sm bg-on-surface-variant/10" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Canvas area */}
              <div className="relative flex flex-1 items-center justify-center bg-background p-4 md:p-8">
                {/* Manga page */}
                <div className="relative aspect-[3/4] h-full max-h-full rounded-lg bg-gradient-to-b from-surface-variant/30 to-surface-variant/10 shadow-xl">
                  <div className="absolute inset-3 flex flex-col gap-1.5">
                    {/* Top panel */}
                    <div className="relative flex-[2] overflow-hidden rounded bg-gradient-to-br from-indigo-900/10 to-indigo-800/5">
                      {/* Character silhouettes */}
                      <div className="absolute bottom-0 left-3 h-3/4 w-1/3 rounded-t-full bg-gradient-to-t from-on-surface-variant/8 to-on-surface-variant/4" />
                      <div className="absolute bottom-0 right-[16%] h-[55%] w-[22%] rounded-t-full bg-gradient-to-t from-violet-700/6 to-violet-600/2" />

                      {/* Narration box — top left with bounding box */}
                      <div className="absolute top-1.5 left-1.5 md:top-2 md:left-2">
                        <motion.div className="absolute -inset-1 rounded border-2 border-dashed border-cyan-500/40" animate={{ opacity: [0.2, 0.8, 0.8, 0.2] }} transition={{ duration: 3, delay: 0.5, repeat: Infinity, times: [0, 0.2, 0.8, 1] }} />
                        <div className="rounded bg-black/70 px-2 py-0.5 md:px-2.5 md:py-1">
                          <p className="text-[5px] font-medium text-white/85 md:text-[7px]">その日の朝──</p>
                        </div>
                      </div>

                      {/* Speech bubble A — top right with bounding box */}
                      <div className="absolute top-[6%] right-[4%] max-w-[48%]">
                        <motion.div className="absolute -inset-1.5 rounded-[12px] border-2 border-dashed border-primary/50" animate={{ opacity: [0.2, 1, 1, 0.2] }} transition={{ duration: 3.5, repeat: Infinity, times: [0, 0.2, 0.8, 1] }} />
                        <div className="relative rounded-[12px] bg-white/90 px-2.5 py-1.5 shadow-sm md:px-3 md:py-2">
                          <p className="text-[6px] font-bold leading-snug text-gray-900 md:text-[9px]">こんにちは！</p>
                          <p className="mt-px text-[5px] leading-snug text-gray-500 md:text-[7px]">お元気ですか？</p>
                          <p className="mt-px text-[4px] leading-snug text-gray-400 md:text-[6px]">今日はいい天気ですね。</p>
                          <BubbleTail className="absolute -bottom-[5px] left-[20%] h-[7px] w-4" fill="rgba(255,255,255,0.9)" />
                        </div>
                      </div>

                      {/* Speech bubble B — mid left with bounding box */}
                      <div className="absolute top-[46%] left-[3%] max-w-[42%]">
                        <motion.div className="absolute -inset-1 rounded-[10px] border-2 border-dashed border-violet-500/40" animate={{ opacity: [0.2, 0.9, 0.9, 0.2] }} transition={{ duration: 3.5, delay: 0.4, repeat: Infinity, times: [0, 0.2, 0.8, 1] }} />
                        <div className="relative rounded-[10px] bg-white/88 px-2 py-1 shadow-sm md:px-2.5 md:py-1.5">
                          <p className="text-[5px] font-bold text-gray-900 md:text-[8px]">ええ、行きましょう！</p>
                          <BubbleTail className="absolute -bottom-[4px] right-[26%] h-[6px] w-3.5" fill="rgba(255,255,255,0.88)" />
                        </div>
                      </div>

                      {/* Text line detection boxes */}
                      <motion.div className="absolute bottom-[8%] right-[6%] h-[2px] w-[25%] rounded-full border border-dashed border-emerald-500/30" animate={{ opacity: [0, 0.6, 0.6, 0] }} transition={{ duration: 4, delay: 1.2, repeat: Infinity, times: [0, 0.2, 0.8, 1] }} />
                      <motion.div className="absolute bottom-[14%] right-[6%] h-[2px] w-[18%] rounded-full border border-dashed border-emerald-500/25" animate={{ opacity: [0, 0.5, 0.5, 0] }} transition={{ duration: 4, delay: 1.5, repeat: Infinity, times: [0, 0.2, 0.8, 1] }} />
                    </div>

                    {/* Bottom row */}
                    <div className="flex flex-1 gap-1.5">
                      <div className="relative flex-1 overflow-hidden rounded bg-gradient-to-br from-violet-900/8 to-violet-800/3">
                        <div className="absolute bottom-0 right-2 h-[60%] w-[35%] rounded-t-full bg-gradient-to-t from-violet-700/6 to-transparent" />
                        {/* Bubble with bounding box */}
                        <div className="absolute top-[6%] left-[4%] max-w-[60%]">
                          <motion.div className="absolute -inset-1 rounded-[9px] border-2 border-dashed border-primary/40" animate={{ opacity: [0.2, 0.8, 0.8, 0.2] }} transition={{ duration: 3.5, delay: 0.6, repeat: Infinity, times: [0, 0.2, 0.8, 1] }} />
                          <div className="relative rounded-[9px] bg-white/88 px-2 py-1 shadow-sm">
                            <p className="text-[5px] font-bold text-gray-900 md:text-[7px]">待ってください！</p>
                            <p className="text-[4px] text-gray-500 md:text-[6px]">まだ準備が...</p>
                            <BubbleTail className="absolute -bottom-[3px] right-[28%] h-[5px] w-3" fill="rgba(255,255,255,0.88)" />
                          </div>
                        </div>
                        {/* Thought bubble */}
                        <div className="absolute right-[5%] bottom-[10%]">
                          <motion.div className="absolute -inset-1 rounded-full border border-dashed border-amber-500/30" animate={{ opacity: [0.1, 0.6, 0.6, 0.1] }} transition={{ duration: 3.5, delay: 1, repeat: Infinity, times: [0, 0.2, 0.8, 1] }} />
                          <div className="rounded-full bg-white/82 px-1.5 py-0.5 shadow-sm">
                            <p className="text-[4px] italic text-gray-500 md:text-[6px]">（どうしよう）</p>
                          </div>
                        </div>
                      </div>

                      <div className="relative flex-1 overflow-hidden rounded bg-gradient-to-br from-cyan-900/8 to-cyan-800/3">
                        {/* SFX with bounding boxes */}
                        <div className="absolute top-[6%] left-[6%]">
                          <motion.div className="absolute -inset-1 rounded border border-dashed border-rose-500/35" animate={{ opacity: [0.2, 0.7, 0.7, 0.2] }} transition={{ duration: 3.5, delay: 0.9, repeat: Infinity, times: [0, 0.2, 0.8, 1] }} />
                          <span className="text-[8px] font-black text-on-surface-variant/15 md:text-[12px]">ドドド</span>
                        </div>
                        <div className="absolute right-[8%] bottom-[10%]">
                          <motion.div className="absolute -inset-0.5 rounded border border-dashed border-orange-500/30" animate={{ opacity: [0.2, 0.6, 0.6, 0.2] }} transition={{ duration: 3, delay: 1.3, repeat: Infinity, times: [0, 0.2, 0.8, 1] }} />
                          <span className="text-[6px] font-black text-on-surface-variant/12 md:text-[8px]">バタン！</span>
                        </div>
                        {/* Small text line box */}
                        <motion.div className="absolute bottom-[38%] left-[20%] h-[2px] w-[40%] rounded-full border border-dashed border-teal-500/25" animate={{ opacity: [0, 0.5, 0.5, 0] }} transition={{ duration: 4, delay: 1.6, repeat: Infinity, times: [0, 0.2, 0.8, 1] }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Play button overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative">
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 border-primary/30"
                      animate={{ scale: [1, 1.6], opacity: [0.5, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    <motion.div
                      className="relative flex h-16 w-16 cursor-pointer items-center justify-center rounded-full bg-primary/90 shadow-2xl shadow-primary/30 backdrop-blur-sm md:h-20 md:w-20"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <PlayIcon
                        weight="fill"
                        className="ml-1 h-7 w-7 text-primary-foreground md:h-8 md:w-8"
                      />
                    </motion.div>
                  </div>
                </div>
              </div>

              {/* Right sidebar — AI Tools */}
              <div className="hidden w-52 shrink-0 border-l border-outline-variant/10 bg-surface p-3 lg:block">
                <div className="mb-3 flex items-center gap-2">
                  <SparkleIcon
                    weight="fill"
                    className="h-3 w-3 text-primary/60"
                  />
                  <div className="h-2 w-12 rounded-sm bg-on-surface-variant/15" />
                </div>
                {[t("video.toolTranslate"), t("video.toolClean"), t("video.toolTypeset")].map(
                  (label, i) => (
                    <div
                      key={label}
                      className={`mb-2 flex items-center gap-2 rounded-lg px-3 py-2 ${
                        i === 0
                          ? "bg-primary/10 text-primary"
                          : "bg-surface-variant/20 text-on-surface-variant/40"
                      }`}
                    >
                      <div className="h-2 w-2 rounded-full bg-current opacity-60" />
                      <span className="text-[9px] font-medium">{label}</span>
                    </div>
                  ),
                )}
                <div className="mt-4 rounded-lg border border-outline-variant/10 p-3">
                  <div className="mb-2 h-2 w-20 rounded bg-on-surface-variant/10" />
                  <div className="mb-1 h-1.5 w-full rounded bg-on-surface-variant/6" />
                  <div className="mb-1 h-1.5 w-4/5 rounded bg-on-surface-variant/6" />
                  <div className="h-1.5 w-3/5 rounded bg-on-surface-variant/6" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════ TRANSLATION SHOWCASE ═══════════════════════ */}
      <section className="relative z-10 pt-6 pb-20">
        <div className="mx-auto max-w-6xl px-6 md:px-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.7 }}
            className="mb-16 text-center"
          >
            <span className="mb-3 block text-xs font-semibold uppercase tracking-[0.2em] text-primary/70">
              {t("showcase.label")}
            </span>
            <h2
              className={`mb-4 text-3xl font-bold tracking-tight text-on-surface md:text-4xl ${inter.className}`}
            >
              {t("showcase.heading")}
            </h2>
            <p className={`mx-auto max-w-lg text-sm text-on-surface-variant/50 ${inter.className}`}>
              {t("showcase.description")}
            </p>
          </motion.div>

          <TranslationShowcase />
        </div>
      </section>

      {/* ═══════════════════════ FEATURES (Redesigned) ═══════════════════════ */}
      <section className="relative z-10 overflow-hidden py-32">
        <div className="absolute inset-0 bg-gradient-to-b from-primary-container/5 via-transparent to-transparent" />
        {/* Decorative manga-style halftone dots (very subtle) */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage:
              "radial-gradient(circle, currentColor 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-6 md:px-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.7 }}
            className="mb-16 text-center"
          >
            <span className="mb-3 block text-xs font-semibold uppercase tracking-[0.2em] text-primary/70">
              {t("features.label")}
            </span>
            <h2
              className={`mb-4 text-3xl font-bold tracking-tight text-on-surface md:text-4xl ${inter.className}`}
            >
              {t("features.heading")}
            </h2>
            <p className={`mx-auto max-w-md text-sm text-on-surface-variant/50 ${inter.className}`}>
              {t("features.description")}
            </p>
          </motion.div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className={`group relative overflow-hidden rounded-2xl border border-outline-variant/10 bg-surface/80 backdrop-blur-sm transition-all duration-300 ${f.borderHover} hover:shadow-2xl hover:shadow-primary/5`}
              >
                {/* Hover gradient overlay */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${f.gradient} opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
                />

                {/* Top accent bar */}
                <div
                  className={`h-1 w-full bg-gradient-to-r ${f.gradient} opacity-0 transition-opacity group-hover:opacity-100`}
                />

                <div className="relative z-10 p-7">
                  {/* Tag + icon row */}
                  <div className="mb-5 flex items-start justify-between">
                    <motion.div
                      className={`flex h-14 w-14 items-center justify-center rounded-2xl ${f.iconBg} transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg`}
                      whileHover={{ rotate: [0, -5, 5, 0] }}
                      transition={{ duration: 0.5 }}
                    >
                      <f.icon
                        weight="fill"
                        className={`h-7 w-7 ${f.iconColor} transition-colors group-hover:text-primary`}
                      />
                    </motion.div>
                    <span className="rounded-full border border-outline-variant/10 bg-surface-variant/20 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-on-surface-variant/40">
                      {f.tag}
                    </span>
                  </div>

                  <h3 className="mb-2.5 text-base font-bold text-on-surface transition-colors group-hover:text-primary">
                    {f.title}
                  </h3>
                  <p className={`text-[13px] leading-relaxed text-on-surface-variant/55 ${inter.className}`}>
                    {f.desc}
                  </p>

                  {/* Learn more link */}
                  <div className="mt-5 flex items-center gap-1.5 text-xs font-medium text-primary/0 transition-all duration-300 group-hover:text-primary/70">
                    <span>{t("features.learnMore")}</span>
                    <ArrowRightIcon
                      weight="bold"
                      className="h-3 w-3 transition-transform group-hover:translate-x-0.5"
                    />
                  </div>
                </div>

                {/* Corner decoration — manga panel corner */}
                <div className="absolute -right-4 -bottom-4 h-16 w-16 rotate-45 rounded-lg border-2 border-outline-variant/5 opacity-0 transition-opacity group-hover:opacity-100" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════ WORKFLOW (Zigzag Timeline) ═══════════════════════ */}
      <section className="relative z-10 overflow-hidden py-32">
        {/* Background blurs */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-1/4 left-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/3 blur-[150px]" />
          <div className="absolute right-1/4 bottom-1/4 h-[400px] w-[400px] rounded-full bg-violet-500/3 blur-[100px]" />
        </div>

        <div className="relative mx-auto max-w-5xl px-6 md:px-12">
          {/* Section header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.7 }}
            className="mb-20 text-center"
          >
            <span className="mb-3 block text-xs font-semibold uppercase tracking-[0.2em] text-primary/70">
              {t("workflow.label")}
            </span>
            <h2
              className={`mb-3 text-3xl font-bold tracking-tight text-on-surface md:text-4xl ${inter.className}`}
            >
              {t("workflow.heading")}
            </h2>
            <p className={`text-sm text-on-surface-variant/50 ${inter.className}`}>
              {t("workflow.description")}
            </p>
          </motion.div>

          {/* Desktop — Zigzag timeline with alternating cards */}
          <div className="hidden md:block">
            <div className="relative">
              {/* Central vertical connector — stops at end node center */}
              <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2" style={{ bottom: 'calc(1rem + 1rem + 1.75rem)' }}>
                <div className="h-full w-px bg-gradient-to-b from-indigo-500/25 via-violet-500/15 to-emerald-500/25" />
                <motion.div
                  className="absolute top-0 left-1/2 h-24 w-[2px] -translate-x-1/2 rounded-full bg-gradient-to-b from-primary/0 via-primary/60 to-primary/0"
                  animate={{ top: ["0%", "85%"] }}
                  transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>

              <div className="space-y-12">
                {workflowSteps.map((step, i) => {
                  const isLeft = i % 2 === 0;
                  return (
                    <motion.div
                      key={step.num}
                      initial={{ opacity: 0, x: isLeft ? -30 : 30 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, amount: 0.3 }}
                      transition={{ duration: 0.6, delay: 0.05 }}
                      className="grid grid-cols-[1fr_56px_1fr] items-center"
                    >
                      {/* Left card or empty */}
                      <div className={isLeft ? "pr-8" : ""}>
                        {isLeft && (
                          <div className="group relative overflow-hidden rounded-2xl border border-outline-variant/10 bg-surface/60 p-7 backdrop-blur-sm transition-all duration-300 hover:border-primary/20 hover:shadow-2xl hover:shadow-primary/5">
                            <div className={`pointer-events-none absolute -top-6 -right-4 text-[110px] font-black leading-none text-on-surface-variant/[0.03] ${nunito.className}`}>
                              {step.num}
                            </div>
                            <div className="relative z-10">
                              <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${step.color} shadow-lg ${step.glowColor}`}>
                                <step.icon weight="fill" className="h-5 w-5 text-white" />
                              </div>
                              <h3 className="mb-2 text-lg font-bold text-on-surface transition-colors group-hover:text-primary">
                                {step.title}
                              </h3>
                              <p className={`text-[13px] leading-relaxed text-on-surface-variant/50 ${inter.className}`}>
                                {step.desc}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Center node */}
                      <div className="flex justify-center">
                        <motion.div
                          className={`relative z-20 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br ${step.color} shadow-xl ring-4 ring-background`}
                          whileHover={{ scale: 1.15 }}
                          transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        >
                          <span className={`text-xs font-black text-white ${inter.className}`}>{step.num}</span>
                        </motion.div>
                      </div>

                      {/* Right card or empty */}
                      <div className={!isLeft ? "pl-8" : ""}>
                        {!isLeft && (
                          <div className="group relative overflow-hidden rounded-2xl border border-outline-variant/10 bg-surface/60 p-7 backdrop-blur-sm transition-all duration-300 hover:border-primary/20 hover:shadow-2xl hover:shadow-primary/5">
                            <div className={`pointer-events-none absolute -top-6 -left-4 text-[110px] font-black leading-none text-on-surface-variant/[0.03] ${nunito.className}`}>
                              {step.num}
                            </div>
                            <div className="relative z-10">
                              <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${step.color} shadow-lg ${step.glowColor}`}>
                                <step.icon weight="fill" className="h-5 w-5 text-white" />
                              </div>
                              <h3 className="mb-2 text-lg font-bold text-on-surface transition-colors group-hover:text-primary">
                                {step.title}
                              </h3>
                              <p className={`text-[13px] leading-relaxed text-on-surface-variant/50 ${inter.className}`}>
                                {step.desc}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* End node */}
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="relative mt-14 flex justify-center"
              >
                <div className="relative z-20 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 shadow-md ring-2 ring-primary/15">
                  <LightningIcon weight="fill" className="h-7 w-7 text-primary-foreground" />
                </div>
              </motion.div>
              <motion.p
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                className={`mt-4 text-center text-xs font-medium text-primary/70 ${inter.className}`}
              >
                {t("workflow.endNode")}
              </motion.p>
            </div>
          </div>

          {/* Mobile — stacked cards */}
          <div className="md:hidden">
            <div className="relative space-y-6">
              {/* Mobile vertical line — stops at end node center */}
              <div className="absolute top-0 left-8 w-px bg-gradient-to-b from-indigo-500/30 via-violet-500/15 to-emerald-500/30" style={{ bottom: '15px' }} />

              {workflowSteps.map((step, i) => (
                <motion.div
                  key={step.num}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  className="relative flex gap-5 pl-0"
                >
                  <div className="relative z-10 flex shrink-0 items-start" style={{ width: 64 }}>
                    <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br ${step.color} shadow-lg ${step.glowColor} ring-4 ring-background`}>
                      <step.icon weight="fill" className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="flex-1 pb-2">
                    <div className="rounded-xl border border-outline-variant/10 bg-surface/80 px-5 py-4 backdrop-blur-sm">
                      <div className="mb-1 flex items-center gap-2">
                        <span className={`text-[10px] font-black tabular-nums text-on-surface-variant/25 ${inter.className}`}>
                          {t("workflow.step")} {step.num}
                        </span>
                      </div>
                      <h3 className="mb-1 text-base font-bold text-on-surface">
                        {step.title}
                      </h3>
                      <p className={`text-sm leading-relaxed text-on-surface-variant/55 ${inter.className}`}>
                        {step.desc}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}

              <div className="relative z-10 flex items-center" style={{ width: 64 }}>
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20">
                  <LightningIcon weight="fill" className="h-5 w-5 text-primary-foreground" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════ STATS ═══════════════════════ */}
      <section className="relative z-10 border-y border-outline-variant/5 bg-surface/30 py-20">
        <div className="mx-auto grid max-w-4xl gap-8 px-6 sm:grid-cols-4">
          {[
            {
              value: 50,
              suffix: "+",
              label: t("stats.languages"),
              prefix: "",
            },
            {
              value: 80,
              suffix: "",
              label: t("stats.pagesPerBatch"),
              prefix: "",
            },
            {
              value: 100,
              suffix: "%",
              label: t("stats.browserBased"),
              prefix: "",
            },
            {
              value: 0,
              suffix: "",
              label: t("stats.costToUse"),
              prefix: "$",
            },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="text-center"
            >
              <div
                className={`mb-1 text-3xl font-black text-on-surface md:text-4xl ${nunito.className}`}
              >
                <Counter
                  value={stat.value}
                  suffix={stat.suffix}
                  prefix={stat.prefix}
                />
              </div>
              <p className="text-xs text-on-surface-variant/40">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════ COMMUNITY CTA ═══════════════════════ */}
      <section className="relative z-10 py-24">
        <div className="mx-auto max-w-4xl px-6 md:px-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="relative overflow-hidden rounded-3xl border border-primary/10 bg-gradient-to-br from-primary/5 via-surface to-violet-500/5 p-10 text-center md:p-14"
          >
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-primary/5 blur-[80px]" />
              <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-violet-500/5 blur-[60px]" />
            </div>
            <div className="relative z-10">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/10 bg-primary/5 px-4 py-1.5">
                <GlobeIcon
                  weight="bold"
                  className="h-3.5 w-3.5 text-primary"
                />
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary/80">
                  {t("community.badge")}
                </span>
              </div>
              <h3
                className={`mb-3 text-2xl font-bold text-on-surface md:text-3xl ${inter.className}`}
              >
                {t("community.heading")}
              </h3>
              <p className={`mx-auto mb-8 max-w-lg text-sm leading-relaxed text-on-surface-variant/50 ${inter.className}`}>
                {t("community.description")}
              </p>
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <motion.button
                  onClick={() => setShowLogin(true)}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <EyeglassesIcon weight="bold" className="h-4 w-4" />
                  {t("community.ctaJoin")}
                </motion.button>
                <motion.a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-outline-variant/20 px-7 py-3 text-sm font-medium text-on-surface-variant/70 transition-colors hover:bg-surface-variant/20"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <BracketsAngleIcon weight="bold" className="h-4 w-4" />
                  {t("community.ctaGithub")}
                </motion.a>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════ FINAL CTA ═══════════════════════ */}
      <section className="relative z-10 overflow-hidden py-32">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-1/2 left-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-[100px]" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative z-10 text-center"
        >
          <motion.div
            className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5"
            animate={{ rotate: [0, -5, 5, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <GlassesLogo className="h-8 w-8 text-primary" />
          </motion.div>
          <h2
            className={`mb-4 text-3xl font-bold tracking-tight text-on-surface md:text-5xl ${inter.className}`}
          >
            {t("cta.heading")}
          </h2>
          <p className={`mb-10 text-sm text-on-surface-variant/50 ${inter.className}`}>
            {t("cta.description")}
          </p>
          <motion.button
            onClick={() => setShowLogin(true)}
            className="group inline-flex items-center gap-2.5 rounded-full bg-primary px-10 py-4 text-sm font-semibold text-primary-foreground shadow-2xl shadow-primary/25"
            whileHover={{
              scale: 1.04,
              boxShadow: "0 25px 60px -12px rgba(71, 85, 182, 0.4)",
            }}
            whileTap={{ scale: 0.97 }}
          >
            {t("cta.button")}
            <ArrowRightIcon
              weight="bold"
              className="h-4 w-4 transition-transform group-hover:translate-x-1"
            />
          </motion.button>
        </motion.div>
      </section>

      {/* ═══════════════════════ FOOTER ═══════════════════════ */}
      <footer className="relative z-10 border-t border-outline-variant/5 px-6 py-8 text-center">
        <div className="flex items-center justify-center gap-2">
          <EyeglassesIcon
            weight="bold"
            className="h-4 w-4 text-on-surface-variant/20"
          />
          <span
            className={`text-sm font-black tracking-tight text-on-surface-variant/20 ${nunito.className}`}
          >
            KomaKun!
          </span>
        </div>
        <p className="mt-1 text-[10px] text-on-surface-variant/15">
          {t("footer.tagline")}
        </p>
      </footer>

      {/* ═══════════════════════ LOGIN MODAL ═══════════════════════ */}
      <AnimatePresence>
        {showLogin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md"
            onClick={(e) =>
              e.target === e.currentTarget && setShowLogin(false)
            }
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="mx-4 w-full max-w-sm overflow-hidden rounded-3xl border border-outline-variant/15 bg-surface shadow-2xl"
            >
              {/* Header decoration */}
              <div className="relative h-24 bg-gradient-to-br from-primary/20 to-violet-500/10">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-surface" />
                <div className="absolute bottom-0 left-6 translate-y-1/2">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20">
                    <EyeglassesIcon
                      weight="bold"
                      className="h-7 w-7 text-primary-foreground"
                    />
                  </div>
                </div>
              </div>

              <div className="px-6 pt-10 pb-6">
                <h2
                  className={`mb-1 text-xl font-bold text-on-surface ${inter.className}`}
                >
                  {t("login.heading")}
                </h2>
                <p className={`mb-6 text-xs text-on-surface-variant/50 ${inter.className}`}>
                  {t("login.description")}
                </p>

                <div className="flex flex-col gap-4">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-medium text-on-surface-variant/60">
                      {t("login.nameLabel")} <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder={t("login.namePlaceholder")}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                      className="w-full rounded-xl border border-outline-variant/20 bg-surface-variant/10 px-4 py-2.5 text-sm text-on-surface outline-none transition-all placeholder:text-on-surface-variant/25 focus:border-primary focus:ring-2 focus:ring-primary/10"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-medium text-on-surface-variant/60">
                      {t("login.emailLabel")}{" "}
                      <span className="text-on-surface-variant/25">
                        {t("login.emailOptional")}
                      </span>
                    </label>
                    <input
                      type="email"
                      placeholder={t("login.emailPlaceholder")}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                      className="w-full rounded-xl border border-outline-variant/20 bg-surface-variant/10 px-4 py-2.5 text-sm text-on-surface outline-none transition-all placeholder:text-on-surface-variant/25 focus:border-primary focus:ring-2 focus:ring-primary/10"
                    />
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-end gap-3">
                  <button
                    onClick={() => setShowLogin(false)}
                    className="rounded-xl px-5 py-2.5 text-xs font-medium text-on-surface-variant/60 transition-colors hover:bg-surface-variant/20"
                  >
                    {t("login.cancel")}
                  </button>
                  <motion.button
                    onClick={handleLogin}
                    disabled={!name.trim()}
                    className="rounded-xl bg-primary px-6 py-2.5 text-xs font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-40"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {t("login.submit")}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
