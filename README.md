wordfreq (Node.js/TypeScript)
=============================

本仓库现仅包含 Node.js/TypeScript 版本，已移除 Python 代码与构建脚本，专注在 JS 生态中查词频、做 Zipf 换算与多语言分词，同时沿用原始 wordfreq 的词频数据与 API 语义。

- 数据：直接复用 `data/*.msgpack.gz`，未改动格式。
- 输出：默认 ESM，提供 CJS 兼容入口与 `.d.ts` 类型声明。
- 分词：基于 `Intl.Segmenter` 的通用分词，中文可选安装 `nodejieba` 获得更精确结果（未安装时自动降级）；安装后会自动加载仓库内的定制字典 `data/jieba_zh.txt` / `data/jieba_zh_orig.txt`，尽量对齐词频数据生成时的切分方式。

快速开始
--------

```bash
npm install
npm run build
```

在代码中使用：

```ts
import { wordFrequency, zipfFrequency, tokenize } from "nodewordfreq";

const freq = wordFrequency("café", "fr");
const zipf = zipfFrequency("frequency", "en");
const tokens = tokenize("你好，世界", "zh");
```

主要 API
--------

- `wordFrequency(word, lang, wordlist="best", minimum=0)`: 返回 0~1 的概率。
- `zipfFrequency(word, lang, wordlist="best", minimum=0)`: 返回 Zipf 标度的频率。
- `freqToZipf`/`zipfToFreq`/`cBToFreq`/`cBToZipf`: 频率换算工具。
- `tokenize`/`lossyTokenize`/`simpleTokenize`: 基于 `Intl.Segmenter` 的分词，lossy 版本会对中文做简体归一化、统一引号。
- `digitFreq`/`smashNumbers`/`hasDigitSequence`: 数字形态频率估计与归一化。
- `availableLanguages(wordlist)`: 列出 small/large/best 词表包含的语言与对应文件路径。
- `topNList`/`randomWords`: 提供与 Python 版一致的辅助能力。

数据路径
--------

- 默认从包内 `data/` 目录读取词频数据。
- 通过环境变量 `WORDFREQ_DATA` 可指定外部数据目录（例如挂载的共享盘），实现离线更新或瘦身安装。

脚本与开发流程
--------------

- `npm run build`：使用 `tsup` 输出 ESM + CJS 与类型声明。
- `npm test`：使用 `vitest` 运行单元测试。
- `npm run lint`：ESLint + Prettier。
- `npm run typecheck`：`tsc --noEmit`。

兼容性与降级
------------

- Node.js 18+，依赖 `Intl.Segmenter`。
- 中文分词可选安装 `nodejieba`，未安装时使用 `Intl.Segmenter` 兜底。
- 数据格式保持不变，若需自行生成/更新，请复用原 Python 版的数据生产流程。

版权与许可
----------

代码遵循 Apache 2.0，数据许可参见 `NOTICE.md`。
