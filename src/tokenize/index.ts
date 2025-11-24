import { createRequire } from "node:module";

import { simplifyChinese, getJiebaMainDictPath, getJiebaOrigDictPath } from "../data/chinese";
import { getLanguageInfo, TokenizerKind } from "../utils/languageInfo";
import { preprocessText } from "../utils/preprocess";
import { uncurlQuotes } from "../utils/quotes";

const PUNCT_RE = /[\p{P}\p{S}]+/u;

const segmenterCache = new Map<string, Intl.Segmenter>();
const requireFromEsm = createRequire(import.meta.url);

let nodeJieba: typeof import("nodejieba") | null = null;
let jiebaMainLoaded = false;
let jiebaOrigLoaded = false;

function loadNodeJieba(externalWordlist: boolean): typeof import("nodejieba") | null {
  let jieba = nodeJieba;
  if (!jieba) {
    try {
      // 在 ESM 环境下需通过 createRequire 动态加载 CommonJS 包。
      // 若未安装可选依赖，则捕获异常并回退至通用分词。
      jieba = requireFromEsm("nodejieba");
      nodeJieba = jieba;
    } catch {
      return null;
    }
  }

  if (!jieba) {
    return null;
  }

  if (externalWordlist && !jiebaOrigLoaded) {
    // 使用原版 jieba 词典（含词性标签），适合外部通用分词场景。
    jieba.load({ dict: getJiebaOrigDictPath() });
    jiebaOrigLoaded = true;
  } else if (!externalWordlist && !jiebaMainLoaded) {
    // wordfreq 的定制词典只有两列（词 + 频率），将其作为 userDict 叠加在内置主词典上，
    // 避免触发 nodejieba 对主词典三列格式的校验错误。
    jieba.load({ userDict: getJiebaMainDictPath() });
    jiebaMainLoaded = true;
  }

  return jieba;
}

function getSegmenter(lang?: string): Intl.Segmenter {
  const key = lang ?? "und";
  const cached = segmenterCache.get(key);
  if (cached) {
    return cached;
  }

  const segmenter = new Intl.Segmenter(lang, { granularity: "word" });
  segmenterCache.set(key, segmenter);
  return segmenter;
}

function segmentWithIntl(text: string, lang?: string, includePunctuation = false): string[] {
  const segmenter = getSegmenter(lang);
  const tokens: string[] = [];

  for (const item of segmenter.segment(text)) {
    const segment = item.segment.trim();
    if (!segment) {
      continue;
    }
    if (!includePunctuation && item.isWordLike === false) {
      continue;
    }
    tokens.push(segment.toLocaleLowerCase());
  }

  return tokens;
}

function tokenizeWithOptionalJieba(
  text: string,
  includePunctuation: boolean,
  externalWordlist: boolean,
): string[] {
  const jieba = loadNodeJieba(externalWordlist);
  if (!jieba) {
    // 未安装可选依赖时，退回到 Intl 分词，保证 API 可用。
    return segmentWithIntl(text, "zh", includePunctuation);
  }

  const result: string[] = externalWordlist ? jieba.cut(text, false) : jieba.cut(text, false);
  const lowered = result.map((token) => token.toLocaleLowerCase("zh"));
  if (includePunctuation) {
    return lowered;
  }
  return lowered.filter((token) => !PUNCT_RE.test(token));
}

function tokenizeByKind(
  text: string,
  tokenizer: TokenizerKind,
  includePunctuation: boolean,
  externalWordlist: boolean,
  lang: string,
): string[] {
  if (tokenizer === "jieba") {
    return tokenizeWithOptionalJieba(text, includePunctuation, externalWordlist);
  }

  if (tokenizer === "mecab") {
    // Node 侧没有默认内置的 MeCab/kuromoji，这里使用 Intl.Segmenter 做兜底，
    // 保证至少能按 Unicode 词边界拆分。
    return segmentWithIntl(text, lang, includePunctuation);
  }

  return segmentWithIntl(text, lang, includePunctuation);
}

/**
 * 简单分词，直接依赖 Intl.Segmenter。
 * 需求说明：提供无语言上下文的轻量分词能力，兼容包含标点与否的两种场景。
 */
export function simpleTokenize(text: string, includePunctuation = false): string[] {
  const normalized = text.normalize("NFC");
  return segmentWithIntl(normalized, undefined, includePunctuation);
}

/**
 * 针对指定语言进行分词，包含预处理与语言定制化的选择。
 * - 会先执行 preprocessText 统一大小写、转写等操作，确保与词表一致。
 * - CJK 场景优先尝试 nodejieba（可选依赖），缺失时退回 Intl。
 */
export function tokenize(
  text: string,
  lang: string,
  includePunctuation = false,
  externalWordlist = false,
): string[] {
  const info = getLanguageInfo(lang);
  const normalized = preprocessText(text, lang);
  return tokenizeByKind(normalized, info.tokenizer, includePunctuation, externalWordlist, lang);
}

/**
 * “损失性”分词，会在 tokenize 结果基础上做进一步归一化：
 * - 中文强制简体化，保持与词表键一致。
 * - 弯引号统一为直引号。
 */
export function lossyTokenize(
  text: string,
  lang: string,
  includePunctuation = false,
  externalWordlist = false,
): string[] {
  const info = getLanguageInfo(lang);
  let tokens = tokenize(text, lang, includePunctuation, externalWordlist);

  if (info.lookupTransliteration === "zh-Hans") {
    tokens = tokens.map((token) => simplifyChinese(token));
  }

  return tokens.map((token) => uncurlQuotes(token));
}
