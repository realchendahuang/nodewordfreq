import { getLanguageInfo } from "./languageInfo";
import { transliterate } from "./transliterate";

const MARK_RE = /\p{Mn}|\u0640/gu;

function removeMarks(text: string): string {
  return text.replace(MARK_RE, "");
}

function casefoldWithIDots(text: string): string {
  const normalized = text.normalize("NFC").replace(/İ/g, "i").replace(/I/g, "ı");
  return normalized.toLocaleLowerCase("tr");
}

function commasToCedillas(text: string): string {
  return text.replace(/\u0219/g, "\u015f").replace(/\u021b/g, "\u0163");
}

function cedillasToCommas(text: string): string {
  return text.replace(/\u015f/g, "\u0219").replace(/\u0163/g, "\u021b");
}

/**
 * 归一化文本，以便后续分词与词频查找。
 * 需求说明：与 Python 版保持一致的步骤顺序，确保跨语言输入都能映射到同一词表。
 */
export function preprocessText(text: string, languageTag: string): string {
  const info = getLanguageInfo(languageTag);
  let normalized = text.normalize(info.normalForm);

  if (info.transliteration) {
    normalized = transliterate(info.transliteration, normalized);
  }

  if (info.removeMarks) {
    normalized = removeMarks(normalized);
  }

  normalized = info.dotlessI ? casefoldWithIDots(normalized) : normalized.toLocaleLowerCase();

  if (info.diacriticsUnder === "commas") {
    normalized = cedillasToCommas(normalized);
  } else if (info.diacriticsUnder === "cedillas") {
    normalized = commasToCedillas(normalized);
  }

  return normalized;
}
