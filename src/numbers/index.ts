/**
 * 数字形态相关的概率估算逻辑。
 * 需求说明：为了避免为每个具体数字存储词频，原版通过将多位数字归一化为形态（例如 1234 -> 0000），
 * 再用 Benford 分布 + 年份分布估算具体数字的概率。本文件完整复刻该逻辑。
 */

// Benford 分布（含前导零的估算），索引即首位数字。
export const DIGIT_FREQS = [0.009, 0.3, 0.175, 0.124, 0.096, 0.078, 0.066, 0.057, 0.05, 0.045];

// 年份分布曲线的参数，来源于原版实验数据。
const YEAR_LOG_PEAK = -1.9185;
const NOT_YEAR_PROB = 0.1;
const REFERENCE_YEAR = 2019;
const PLATEAU_WIDTH = 20;

const DIGIT_RE = /\d/g;
const MULTI_DIGIT_RE_GLOBAL = /\d[\d.,]+/g;
const MULTI_DIGIT_RE = /\d[\d.,]+/;
const PURE_DIGIT_RE_GLOBAL = /\d+/g;

export function benfordFreq(text: string): number {
  const firstDigit = Number.parseInt(text[0] ?? "0", 10);
  return DIGIT_FREQS[firstDigit] / 10 ** (text.length - 1);
}

export function yearFreq(text: string): number {
  const year = Number.parseInt(text, 10);

  let yearLogFreq = YEAR_LOG_PEAK;
  if (year <= REFERENCE_YEAR) {
    yearLogFreq = YEAR_LOG_PEAK - 0.0083 * (REFERENCE_YEAR - year);
  } else if (year <= REFERENCE_YEAR + PLATEAU_WIDTH) {
    yearLogFreq = YEAR_LOG_PEAK;
  } else {
    yearLogFreq = YEAR_LOG_PEAK - 0.2 * (year - (REFERENCE_YEAR + PLATEAU_WIDTH));
  }

  const yearProb = 10 ** yearLogFreq;
  const notYearProb = NOT_YEAR_PROB * benfordFreq(text);
  return yearProb + notYearProb;
}

/**
 * 返回数字字符串的相对频率估计值。
 * 在包含多段数字的 token（例如 12,345.67）中，会拆分每一段再乘积概率。
 */
export function digitFreq(text: string): number {
  let freq = 1;
  const matches = text.matchAll(MULTI_DIGIT_RE_GLOBAL);
  for (const match of matches) {
    const sub = match[0];
    const pureDigits = sub.matchAll(PURE_DIGIT_RE_GLOBAL);
    for (const digitMatch of pureDigits) {
      const digits = digitMatch[0];
      if (digits.length === 4) {
        freq *= yearFreq(digits);
      } else {
        freq *= benfordFreq(digits);
      }
    }
  }
  return freq;
}

/**
 * 判断 token 中是否包含需要归一化处理的多位数字。
 */
export function hasDigitSequence(text: string): boolean {
  return MULTI_DIGIT_RE.test(text);
}

/**
 * 将多位数字归一化为 0 占位形态。
 * 需求说明：这样做能在词表中以形态代表大量数字，节省存储空间并保持概率可估计。
 */
export function smashNumbers(text: string): string {
  return text.replace(MULTI_DIGIT_RE_GLOBAL, (match) => match.replace(DIGIT_RE, "0"));
}
