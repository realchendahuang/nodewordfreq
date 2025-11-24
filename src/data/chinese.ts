import fs from "node:fs";
import { gunzipSync } from "node:zlib";

import { Unpackr } from "msgpackr";

import { getDataPath } from "./dataPath";

type SimplifiedMap = Record<string, string>;

let cachedSimplifiedMap: SimplifiedMap | null = null;

/**
 * 加载简繁转换表。
 * 数据源与 Python 版一致，存储在 `_chinese_mapping.msgpack.gz` 内。
 * 这里使用懒加载 + 缓存，避免每次 token 转换都重新解压，满足性能与启动延迟的折中需求。
 */
function loadSimplifiedMap(): SimplifiedMap {
  if (cachedSimplifiedMap) {
    return cachedSimplifiedMap;
  }

  const buffer = fs.readFileSync(getDataPath("_chinese_mapping.msgpack.gz"));
  const uncompressed = gunzipSync(buffer);
  const unpackr = new Unpackr({ useRecords: false });
  const rawMap = unpackr.unpack(uncompressed) as Record<string, string>;
  const mapping: SimplifiedMap = {};
  for (const [codepoint, target] of Object.entries(rawMap)) {
    const char = String.fromCodePoint(Number.parseInt(codepoint, 10));
    mapping[char] = target;
  }

  cachedSimplifiedMap = mapping;
  return mapping;
}

/**
 * 将文本逐字映射为简体，用于词频查找的归一化。
 * 需求说明：Python 版在 lossy_tokenize 中会强制把中文转换为简体，
 * 这样才能命中统一的词频表。这里保持相同行为。
 */
export function simplifyChinese(text: string): string {
  const mapping = loadSimplifiedMap();
  const simplified = Array.from(text, (char) => mapping[char] ?? char).join("");
  return simplified.toLocaleLowerCase("zh");
}

export function getJiebaMainDictPath(): string {
  return getDataPath("jieba_zh.txt");
}

export function getJiebaOrigDictPath(): string {
  return getDataPath("jieba_zh_orig.txt");
}
