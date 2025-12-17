import fs from "node:fs";
import path from "node:path";

import { LRUCache } from "lru-cache";

import { getDataDir } from "../data/dataPath";
import { readCBPack } from "../data/readCBPack";
import { digitFreq, hasDigitSequence, smashNumbers } from "../numbers";
import { lossyTokenize } from "../tokenize";
import { getLanguageInfo, normalizeLanguageTag } from "../utils/languageInfo";

import {
  CACHE_SIZE,
  DEFAULT_WORDLIST,
  INFERRED_SPACE_FACTOR,
  CHAR_COMBINATION_PENALTY,
} from "./constants";
import { cBToFreq, freqToZipf, zipfToFreq } from "./frequency";

type FrequencyBuckets = string[][];

// 缓存原始频率桶，避免多次解压 msgpack.gz，满足高频查询场景的性能要求。
const frequencyListCache = new Map<string, FrequencyBuckets>();
// 缓存 token->概率 的映射，减少重复转化的 CPU 与内存开销。
const frequencyDictCache = new Map<string, Map<string, number>>();
// 词频查询的 LRU 缓存，与 Python 版的 CACHE_SIZE 一致。
const wordFrequencyCache = new LRUCache<string, number>({ max: CACHE_SIZE });

function normalizeWordlist(wordlist: string): string {
  if (wordlist === "combined") {
    return "small";
  }
  return wordlist;
}

function buildAvailableIndex(): Record<string, Record<string, string>> {
  const dataDir = getDataDir();
  const files = fs.readdirSync(dataDir);
  const index: Record<string, Record<string, string>> = {};

  files
    .filter((name) => name.endsWith(".msgpack.gz") && !name.startsWith("_"))
    .forEach((name) => {
      const [listName, lang] = name.replace(".msgpack.gz", "").split("_");
      if (!index[listName]) {
        index[listName] = {};
      }
      index[listName][lang] = path.join(dataDir, name);
    });

  return index;
}

const availableIndex = buildAvailableIndex();

/**
 * 返回指定词表下可用的语言与文件路径映射。
 * 需求说明：API 与 Python 版一致，允许传入 best/large/small。
 */
export function availableLanguages(wordlist = DEFAULT_WORDLIST): Record<string, string> {
  const normalized = normalizeWordlist(wordlist);
  if (normalized === "best") {
    const small = availableLanguages("small");
    const large = availableLanguages("large");
    return { ...small, ...large }; // large 优先覆盖 small
  }

  return { ...(availableIndex[normalized] ?? {}) };
}

function closestLanguage(requested: string, available: string[]): string | null {
  const normalized = normalizeLanguageTag(requested);
  if (available.includes(normalized)) {
    return normalized;
  }

  const base = normalized.split(/[-_]/)[0];
  if (available.includes(base)) {
    return base;
  }

  const candidate = available.find((lang) => lang.startsWith(base));
  return candidate ?? null;
}

export function getFrequencyList(lang: string, wordlist = DEFAULT_WORDLIST): FrequencyBuckets {
  const normalizedList = normalizeWordlist(wordlist);
  const available = availableLanguages(normalizedList);
  const languages = Object.keys(available);
  const best = closestLanguage(lang, languages);

  if (!best) {
    throw new Error(`没有找到语言 ${lang} 的词表 ${normalizedList}`);
  }

  const cacheKey = `${best}:${normalizedList}`;
  const cached = frequencyListCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const filePath = available[best];
  const buckets = readCBPack(filePath);
  frequencyListCache.set(cacheKey, buckets);
  return buckets;
}

/**
 * 把频率桶转换成 token -> 概率的映射。
 * 注意：这里以 Map 存储，利于快速查找与节省内存。
 */
export function getFrequencyDict(lang: string, wordlist = DEFAULT_WORDLIST): Map<string, number> {
  const normalizedList = normalizeWordlist(wordlist);
  const cacheKey = `${lang}:${normalizedList}`;
  const cached = frequencyDictCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const freqs = new Map<string, number>();
  const pack = getFrequencyList(lang, normalizedList);
  pack.forEach((bucket, index) => {
    const freq = cBToFreq(-index);
    bucket.forEach((word) => freqs.set(word, freq));
  });

  frequencyDictCache.set(cacheKey, freqs);
  return freqs;
}

export function* iterWordlist(lang: string, wordlist = DEFAULT_WORDLIST): Generator<string> {
  const pack = getFrequencyList(lang, wordlist);
  for (const bucket of pack) {
    for (const word of bucket) {
      yield word;
    }
  }
}

function roundToSignificantDigits(value: number, minimum: number): number {
  // 词频只需要 1% 精度，因此按有效数字 3 位四舍五入，避免暴露无意义的小数噪声。
  const unrounded = Math.max(value, minimum);
  if (unrounded === 0) {
    return 0;
  }
  const leadingZeroes = Math.floor(-Math.log10(unrounded));
  const places = Math.max(0, leadingZeroes + 3);
  const factor = 10 ** places;
  return Math.round(unrounded * factor) / factor;
}

/**
 * 尝试用单字词频估算整词的词频（仅适用于中文）。
 * 需求说明：当 jieba 把词作为整词处理，但该词不在 wordfreq 词库中时，
 * 通过拆分为单字并组合它们的词频来给出一个合理的估算值。
 *
 * @param word - 要估算的词（已经过 smashNumbers 处理）
 * @param freqs - 词频字典
 * @returns 估算的词频概率，如果有单字也找不到则返回 null
 */
function estimateChineseWordFrequency(
  word: string,
  freqs: Map<string, number>,
): number | null {
  // 单字不需要 fallback，直接返回 null 表示确实找不到
  if (word.length <= 1) {
    return null;
  }

  const chars = [...word];
  let oneOverResult = 0;

  for (const char of chars) {
    const freq = freqs.get(char);
    if (freq === undefined) {
      // 有单字也找不到，放弃估算
      return null;
    }
    oneOverResult += 1 / freq;
  }

  // 使用调和平均计算基础词频，再应用惩罚因子
  // 惩罚因子：组合词的实际频率通常远低于单字频率的简单组合
  const baseFreq = 1 / oneOverResult;
  const penalty = CHAR_COMBINATION_PENALTY ** (chars.length - 1);
  return baseFreq / penalty;
}

/**
 * 计算指定词在给定语言与词表下的概率（0~1）。
 * 逻辑基于 Python 版：分词 -> smash 数字 -> 频率合并 -> Jieba 补偿 -> 三位有效数字。
 *
 * 中文增强：当整词不在词库中时，会尝试用单字词频估算，提高覆盖率。
 */
export function wordFrequency(
  word: string,
  lang: string,
  wordlist = DEFAULT_WORDLIST,
  minimum = 0,
): number {
  const cacheKey = `${word}|${lang}|${wordlist}|${minimum}`;
  const cached = wordFrequencyCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const info = getLanguageInfo(lang);
  const tokens = lossyTokenize(word, lang);
  if (tokens.length === 0) {
    wordFrequencyCache.set(cacheKey, minimum);
    return minimum;
  }

  const freqs = getFrequencyDict(lang, wordlist);
  const isChineseTokenizer = info.tokenizer === "jieba";
  let oneOverResult = 0;

  for (const token of tokens) {
    const smashed = smashNumbers(token);
    let freq = freqs.get(smashed);

    // 如果词库中找不到该 token
    if (freq === undefined) {
      // 对于中文，尝试用单字词频估算
      if (isChineseTokenizer) {
        const estimated = estimateChineseWordFrequency(smashed, freqs);
        if (estimated !== null) {
          freq = estimated;
        }
      }

      // 仍然找不到，返回 minimum
      if (freq === undefined) {
        wordFrequencyCache.set(cacheKey, minimum);
        return minimum;
      }
    }

    // 多 token 频率合并使用 1/f 累加的方式，与原版保持一致，可避免被单个低频词放大影响。
    const adjusted = smashed === token ? freq : freq * digitFreq(token);
    oneOverResult += 1 / adjusted;
  }

  let result = 1 / oneOverResult;
  if (isChineseTokenizer && tokens.length > 1) {
    result *= INFERRED_SPACE_FACTOR ** -(tokens.length - 1);
  }

  result = roundToSignificantDigits(result, minimum);
  wordFrequencyCache.set(cacheKey, result);
  return result;
}

export function zipfFrequency(
  word: string,
  lang: string,
  wordlist = DEFAULT_WORDLIST,
  minimum = 0,
): number {
  const freqMin = zipfToFreq(minimum);
  const freq = wordFrequency(word, lang, wordlist, freqMin);
  return Number(freqToZipf(freq).toFixed(2));
}

export function topNList(
  lang: string,
  n: number,
  wordlist = DEFAULT_WORDLIST,
  asciiOnly = false,
): string[] {
  const results: string[] = [];
  for (const word of iterWordlist(lang, wordlist)) {
    if (!asciiOnly || word <= "~") {
      if (!hasDigitSequence(word)) {
        results.push(word);
        if (results.length >= n) {
          break;
        }
      }
    }
  }
  return results;
}

export function randomWords(
  lang = "en",
  wordlist = DEFAULT_WORDLIST,
  nwords = 5,
  bitsPerWord = 12,
  asciiOnly = false,
): string {
  const nChoices = 2 ** bitsPerWord;
  const choices = topNList(lang, nChoices, wordlist, asciiOnly);
  if (choices.length < nChoices) {
    throw new Error(`词表不足以提供 ${bitsPerWord} bits 的熵值`);
  }
  const tokens: string[] = [];
  for (let i = 0; i < nwords; i += 1) {
    const idx = Math.floor(Math.random() * nChoices);
    tokens.push(choices[idx]);
  }
  return tokens.join(" ");
}

export function randomAsciiWords(
  lang = "en",
  wordlist = DEFAULT_WORDLIST,
  nwords = 5,
  bitsPerWord = 12,
): string {
  return randomWords(lang, wordlist, nwords, bitsPerWord, true);
}
