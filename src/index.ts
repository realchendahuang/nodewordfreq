/**
 * Node.js 版 wordfreq 的公共入口。
 * 需求说明：对外暴露与 Python 版等价的 API，便于现有调用方平滑迁移。
 */
export {
  wordFrequency,
  zipfFrequency,
  availableLanguages,
  iterWordlist,
  topNList,
  randomWords,
  randomAsciiWords,
  getFrequencyList,
  getFrequencyDict,
} from "./core/wordfreq";

export { cBToFreq, cBToZipf, zipfToFreq, freqToZipf } from "./core/frequency";
export { simpleTokenize, tokenize, lossyTokenize } from "./tokenize";
export { digitFreq, smashNumbers, hasDigitSequence, benfordFreq, yearFreq } from "./numbers";
export { getDataDir, getDataPath } from "./data/dataPath";
