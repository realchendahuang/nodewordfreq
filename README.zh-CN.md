wordfreq（Node.js/TypeScript 版）
===============================

本仓库仅包含 Node.js/TypeScript 版本，复用原始 wordfreq 的词频数据与 API 语义，提供跨语言的词频查询、Zipf 换算与分词能力。

Python 原始项目地址：https://github.com/rspeer/wordfreq

要点
----
- 数据：直接复用 `data/*.msgpack.gz`，未改动格式。
- 输出：默认 ESM，附带 CJS 兼容入口和 `.d.ts`。
- 分词：基础使用 `Intl.Segmenter`；中文默认依赖 `nodejieba` 并自动加载定制词典 `data/jieba_zh.txt` / `data/jieba_zh_orig.txt`，环境受限时会自动降级到 `Intl.Segmenter`。

安装与构建
----------
```bash
npm install
npm run build
```

使用示例
--------
```ts
import { wordFrequency, zipfFrequency, tokenize } from "nodewordfreq";

const freq = wordFrequency("café", "fr");
const zipf = zipfFrequency("frequency", "en");
const tokens = tokenize("你好，世界", "zh");
```

发布后通过 npm 安装：
```bash
npm install nodewordfreq
```

主要 API
--------
- `wordFrequency(word, lang, wordlist="best", minimum=0)`：返回 0~1 概率。
- `zipfFrequency(word, lang, wordlist="best", minimum=0)`：返回 Zipf 频率。
- `freqToZipf` / `zipfToFreq` / `cBToFreq` / `cBToZipf`：频率换算。
- `tokenize` / `lossyTokenize` / `simpleTokenize`：分词工具，lossy 模式会简体化中文并统一引号。
- `digitFreq` / `smashNumbers` / `hasDigitSequence`：数字形态频率估计。
- `availableLanguages(wordlist)`：列出 small/large/best 词表的语言和文件路径。
- `topNList` / `randomWords`：与 Python 版一致的辅助能力。

数据路径
--------
- 默认读取包内 `data/`（0.2.1 起修复了 CJS/Bun 下误跳到 `node_modules/data` 的问题，正常情况下无需额外配置）。
- 通过 `WORDFREQ_DATA` 环境变量可指定外部数据目录（如共享盘）。

开发命令
--------
- `npm run build`：`tsup` 构建 ESM+CJS，产出类型声明。
- `npm test`：Vitest 单元测试。
- `npm run lint`：ESLint（flat config）。
- `npm run typecheck`：`tsc --noEmit`。
- `npm run prepublishOnly`：lint + typecheck + test + build。

兼容性与降级
------------
- 需要 Node.js 18+，依赖 `Intl.Segmenter`。
- 中文默认使用 `nodejieba`，加载失败自动降级到 `Intl.Segmenter`。
- 数据格式与原版一致，如需重生成请保持相同 cBpack 布局。

许可
----
代码遵循 Apache 2.0，数据许可与归因见 `NOTICE.md`。
