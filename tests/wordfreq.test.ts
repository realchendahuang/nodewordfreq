import fs from "node:fs";

import { describe, expect, it } from "vitest";

import {
  availableLanguages,
  wordFrequency,
  zipfFrequency,
  simpleTokenize,
  lossyTokenize,
} from "../src";
import { smashNumbers, hasDigitSequence } from "../src/numbers";

describe("wordfreq Node 版核心能力", () => {
  it("small 词表应包含英语数据文件，验证数据路径解析正常", () => {
    const langs = availableLanguages("small");
    expect(langs.en).toBeDefined();
    expect(fs.existsSync(langs.en)).toBe(true);
  });

  it("英文高频词应返回可用的概率与 Zipf 值", () => {
    const freq = wordFrequency("the", "en");
    const zipf = zipfFrequency("the", "en");

    expect(freq).toBeGreaterThan(0);
    expect(zipf).toBeGreaterThan(6);
  });

  it("数字归一化应正确替换多位数字", () => {
    expect(smashNumbers("abc1234def")).toBe("abc0000def");
    expect(hasDigitSequence("abc")).toBe(false);
    expect(hasDigitSequence("abc123")).toBe(true);
  });

  it("简单分词在含标点的句子上应按词边界切分", () => {
    const tokens = simpleTokenize("Hello, world! This is a test.");
    expect(tokens).toContain("hello");
    expect(tokens).toContain("world");
  });

  it("中文损失性分词应进行简体化处理，方便命中词表", () => {
    const tokens = lossyTokenize("漢字", "zh");
    expect(tokens.join("")).toContain("汉字");
  });
});
