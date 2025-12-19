wordfreq for Node.js/TypeScript
================================

This repository contains the Node.js/TypeScript implementation of wordfreq. It reuses the original word frequency data and mirrors the Python API semantics, providing frequency lookup, Zipf conversion, and multilingual tokenization for the JS ecosystem.

Original Python project: https://github.com/rspeer/wordfreq

Key points
----------
- Data: ships the original `data/*.msgpack.gz` packs unchanged.
- Output: ESM by default with a CJS fallback and bundled `.d.ts`.
- Tokenization: uses `Intl.Segmenter` as the baseline; Chinese uses `nodejieba` by default and auto-loads the bundled custom dictionaries `data/jieba_zh.txt` / `data/jieba_zh_orig.txt`. If loading fails in a constrained environment, it gracefully falls back to `Intl.Segmenter`.

Install & build
---------------
```bash
npm install
npm run build
```

Usage
-----
```ts
import { wordFrequency, zipfFrequency, tokenize } from "nodewordfreq";

const freq = wordFrequency("café", "fr");
const zipf = zipfFrequency("frequency", "en");
const tokens = tokenize("你好，世界", "zh");
```

Install from npm (after publishing):
```bash
npm install nodewordfreq
```

Public API
----------
- `wordFrequency(word, lang, wordlist="best", minimum=0)`: probability between 0 and 1.
- `zipfFrequency(word, lang, wordlist="best", minimum=0)`: Zipf-scaled frequency.
- `freqToZipf` / `zipfToFreq` / `cBToFreq` / `cBToZipf`: conversion helpers.
- `tokenize` / `lossyTokenize` / `simpleTokenize`: tokenization utilities; lossy mode normalizes Chinese to Simplified and unifies quotes.
- `digitFreq` / `smashNumbers` / `hasDigitSequence`: numeric-shape estimation helpers.
- `availableLanguages(wordlist)`: lists available languages and file paths for small/large/best wordlists.
- `topNList` / `randomWords`: helper utilities aligned with the Python behavior.

Data path
---------
- Wordfreq packs and Chinese jieba dictionaries ship with the npm package; defaults to the bundled `data/` directory (0.2.1 fixes a CJS/Bun path issue that could mistakenly resolve to `node_modules/data`; no env var needed in normal usage).
- Use environment variable `WORDFREQ_DATA` to point to an external data directory (e.g., shared volume).

Development scripts
-------------------
- `npm run build`: bundle ESM+CJS with `tsup` and emit types.
- `npm test`: run unit tests via Vitest.
- `npm run lint`: ESLint (flat config).
- `npm run typecheck`: `tsc --noEmit`.
- `npm run prepublishOnly`: lint + typecheck + test + build (runs automatically on `npm publish`).

Compatibility & fallbacks
-------------------------
- Requires Node.js 18+ with `Intl.Segmenter`.
- Chinese tokenization uses `nodejieba` by default; falls back to `Intl.Segmenter` if loading fails.
- Data format matches the original packs; if you regenerate data, keep the same cBpack layout.

Licensing
---------
Code: Apache 2.0. Data licensing and attributions: see `NOTICE.md`.

中文说明
--------
For a full Chinese version of this README, see `README.zh-CN.md`.
