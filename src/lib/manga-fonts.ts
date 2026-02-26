/**
 * Manga font registry.
 *
 * Fonts in the "local" group are bundled as woff2 in /public/fonts/ and loaded
 * via @font-face declarations in globals.css.
 *
 * Fonts in the "cdn" group are loaded from Google Fonts via @import in
 * globals.css — they need an internet connection but cover full CJK glyph sets.
 */

export interface MangaFont {
  /** Display label shown in the dropdown */
  label: string;
  /** CSS font-family value (used by Konva and DOM) */
  value: string;
  /** Descriptive category for grouping */
  category: "comic" | "handwriting" | "japanese" | "chinese" | "korean" | "system";
  /** Whether the font supports bold weight */
  hasBold?: boolean;
}

export const MANGA_FONTS: MangaFont[] = [
  // ── Comic / Display ──
  {
    label: "Bangers",
    value: "Bangers",
    category: "comic",
  },
  {
    label: "Comic Neue",
    value: "Comic Neue",
    category: "comic",
    hasBold: true,
  },
  {
    label: "Permanent Marker",
    value: "Permanent Marker",
    category: "comic",
  },
  {
    label: "Bungee",
    value: "Bungee",
    category: "comic",
  },
  {
    label: "Luckiest Guy",
    value: "Luckiest Guy",
    category: "comic",
  },
  {
    label: "Rubik Bubbles",
    value: "Rubik Bubbles",
    category: "comic",
  },
  {
    label: "Fredoka",
    value: "Fredoka",
    category: "comic",
    hasBold: true,
  },

  // ── Handwriting ──
  {
    label: "Patrick Hand",
    value: "Patrick Hand",
    category: "handwriting",
  },
  {
    label: "Caveat",
    value: "Caveat",
    category: "handwriting",
    hasBold: true,
  },
  {
    label: "Indie Flower",
    value: "Indie Flower",
    category: "handwriting",
  },
  {
    label: "Shadows Into Light",
    value: "Shadows Into Light",
    category: "handwriting",
  },
  {
    label: "Gloria Hallelujah",
    value: "Gloria Hallelujah",
    category: "handwriting",
  },

  // ── Japanese ──
  {
    label: "Noto Sans JP",
    value: "Noto Sans JP",
    category: "japanese",
    hasBold: true,
  },
  {
    label: "Klee One",
    value: "Klee One",
    category: "japanese",
    hasBold: true,
  },
  {
    label: "Yuji Syuku",
    value: "Yuji Syuku",
    category: "japanese",
  },
  {
    label: "Kaisei Decol",
    value: "Kaisei Decol",
    category: "japanese",
    hasBold: true,
  },
  {
    label: "Reggae One",
    value: "Reggae One",
    category: "japanese",
  },
  {
    label: "RocknRoll One",
    value: "RocknRoll One",
    category: "japanese",
  },
  {
    label: "Noto Serif JP",
    value: "Noto Serif JP",
    category: "japanese",
    hasBold: true,
  },
  {
    label: "Zen Maru Gothic",
    value: "Zen Maru Gothic",
    category: "japanese",
    hasBold: true,
  },
  {
    label: "M PLUS Rounded 1c",
    value: "M PLUS Rounded 1c",
    category: "japanese",
    hasBold: true,
  },
  {
    label: "Kosugi Maru",
    value: "Kosugi Maru",
    category: "japanese",
  },
  {
    label: "Zen Kaku Gothic New",
    value: "Zen Kaku Gothic New",
    category: "japanese",
    hasBold: true,
  },
  {
    label: "Zen Old Mincho",
    value: "Zen Old Mincho",
    category: "japanese",
    hasBold: true,
  },
  {
    label: "Hachi Maru Pop",
    value: "Hachi Maru Pop",
    category: "japanese",
  },

  // ── Chinese (Simplified & Traditional) ──
  {
    label: "Noto Sans SC",
    value: "Noto Sans SC",
    category: "chinese",
    hasBold: true,
  },
  {
    label: "Noto Serif SC",
    value: "Noto Serif SC",
    category: "chinese",
    hasBold: true,
  },
  {
    label: "Noto Sans TC",
    value: "Noto Sans TC",
    category: "chinese",
    hasBold: true,
  },
  {
    label: "Noto Serif TC",
    value: "Noto Serif TC",
    category: "chinese",
    hasBold: true,
  },
  {
    label: "ZCOOL QingKe HuangYou",
    value: "ZCOOL QingKe HuangYou",
    category: "chinese",
  },
  {
    label: "Ma Shan Zheng",
    value: "Ma Shan Zheng",
    category: "chinese",
  },
  {
    label: "LXGW WenKai TC",
    value: "LXGW WenKai TC",
    category: "chinese",
    hasBold: true,
  },
  {
    label: "LXGW WenKai",
    value: "LXGW WenKai",
    category: "chinese",
    hasBold: true,
  },
  {
    label: "Zhi Mang Xing",
    value: "Zhi Mang Xing",
    category: "chinese",
  },
  {
    label: "Long Cang",
    value: "Long Cang",
    category: "chinese",
  },
  {
    label: "ZCOOL KuaiLe",
    value: "ZCOOL KuaiLe",
    category: "chinese",
  },
  {
    label: "ZCOOL XiaoWei",
    value: "ZCOOL XiaoWei",
    category: "chinese",
  },

  // ── Korean ──
  {
    label: "Noto Sans KR",
    value: "Noto Sans KR",
    category: "korean",
    hasBold: true,
  },
  {
    label: "Noto Serif KR",
    value: "Noto Serif KR",
    category: "korean",
    hasBold: true,
  },
  {
    label: "Black Han Sans",
    value: "Black Han Sans",
    category: "korean",
  },
  {
    label: "Jua",
    value: "Jua",
    category: "korean",
  },
  {
    label: "Do Hyeon",
    value: "Do Hyeon",
    category: "korean",
  },
  {
    label: "Sunflower",
    value: "Sunflower",
    category: "korean",
    hasBold: true,
  },
  {
    label: "Gamja Flower",
    value: "Gamja Flower",
    category: "korean",
  },
  {
    label: "Gaegu",
    value: "Gaegu",
    category: "korean",
    hasBold: true,
  },
  {
    label: "Hi Melody",
    value: "Hi Melody",
    category: "korean",
  },
  {
    label: "Poor Story",
    value: "Poor Story",
    category: "korean",
  },
  {
    label: "Cute Font",
    value: "Cute Font",
    category: "korean",
  },

  // ── System fallbacks ──
  {
    label: "Sans-serif",
    value: "sans-serif",
    category: "system",
  },
  {
    label: "Serif",
    value: "serif",
    category: "system",
  },
];

/** Default font to use when none specified */
export const DEFAULT_FONT = "Comic Neue";
