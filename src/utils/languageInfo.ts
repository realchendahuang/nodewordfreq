export type TokenizerKind = "regex" | "jieba" | "mecab" | null;

export interface LanguageInfo {
  script: string | undefined;
  tokenizer: TokenizerKind;
  normalForm: "NFC" | "NFKC";
  removeMarks: boolean;
  dotlessI: boolean;
  diacriticsUnder: "cedillas" | "commas" | null;
  transliteration: string | null;
  lookupTransliteration: string | null;
}

/**
 * 无空格书写的文字脚本列表。
 * 这些脚本如果用通用正则分词，会被拆成单字，严重影响效果，因此需要特殊对待。
 */
export const SPACELESS_SCRIPTS = [
  "Hira",
  "Kana",
  "Thai",
  "Khmr",
  "Laoo",
  "Mymr",
  "Tale",
  "Talu",
  "Lana",
];

export const EXTRA_JAPANESE_CHARACTERS = "ー々〻〆";

function normalizeLocale(tag: string): Intl.Locale | null {
  const safeTag = tag.replace(/_/g, "-");
  try {
    return new Intl.Locale(safeTag);
  } catch {
    return null;
  }
}

/**
 * 统一语言标签格式，便于缓存命中与路径选择。
 */
export function normalizeLanguageTag(tag: string): string {
  const locale = normalizeLocale(tag);
  if (!locale) {
    return tag.toLowerCase();
  }
  return locale.toString().toLowerCase();
}

function isLanguageInList(language: Intl.Locale, targets: string[]): boolean {
  return targets.some((target) => {
    const targetLocale = normalizeLocale(target);
    return targetLocale?.language === language.language;
  });
}

/**
 * 返回指定语言的分词与归一化设定。
 * 设计目的：集中管理各语言的脚本信息和特殊处理逻辑，避免分散到多个模块导致耦合。
 */
export function getLanguageInfo(tag: string): LanguageInfo {
  const locale = normalizeLocale(tag) ?? new Intl.Locale("und");
  const maximized = locale.maximize();

  const info: LanguageInfo = {
    script: maximized.script,
    tokenizer: "regex",
    normalForm: "NFKC",
    removeMarks: false,
    dotlessI: false,
    diacriticsUnder: null,
    transliteration: null,
    lookupTransliteration: null,
  };

  if (isLanguageInList(locale, ["ja", "ko"])) {
    info.tokenizer = "mecab";
  } else if (isLanguageInList(locale, ["zh", "yue"])) {
    info.tokenizer = "jieba";
  } else if (info.script && SPACELESS_SCRIPTS.includes(info.script)) {
    info.tokenizer = null;
  }

  if (info.script && ["Latn", "Grek", "Cyrl"].includes(info.script)) {
    info.normalForm = "NFC";
  }

  if (info.script && ["Arab", "Hebr"].includes(info.script)) {
    info.removeMarks = true;
  }

  if (isLanguageInList(locale, ["tr", "az", "kk"])) {
    info.dotlessI = true;
    info.diacriticsUnder = "cedillas";
  } else if (isLanguageInList(locale, ["ro"])) {
    info.diacriticsUnder = "commas";
  }

  if (isLanguageInList(locale, ["sr"])) {
    info.transliteration = "sr-Latn";
  } else if (isLanguageInList(locale, ["az"])) {
    info.transliteration = "az-Latn";
  }

  if (locale.language === "zh" && maximized.script !== "Hant") {
    info.lookupTransliteration = "zh-Hans";
  }

  return info;
}
