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
  if (!nodeJieba) {
    try {
      // 在 ESM 环境下需通过 createRequire 动态加载 CommonJS 包。
      // 若未安装可选依赖，则捕获异常并回退至通用分词。
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      nodeJieba = requireFromEsm("nodejieba");
    } catch {
      return null;
    }
  }

  if (externalWordlist && !jiebaOrigLoaded) {
    nodeJieba.load({ dict: getJiebaOrigDictPath() });
    jiebaOrigLoaded = true;
  } else if (!externalWordlist && !jiebaMainLoaded) {
    // HMM 在 nodejieba 中无法直接禁用，这里仅通过加载与词频表匹配的自定义词典
    // 来最大程度贴合 Python 版的分词结果。
    nodeJieba.load({ dict: getJiebaMainDictPath() });
    jiebaMainLoaded = true;
  }

  return nodeJieba;
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
