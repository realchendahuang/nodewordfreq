/**
 * 频率与 Zipf/centibel 之间的转换函数。
 * 需求说明：Node 版需与 Python 版保持同样的刻度换算，避免词频结果出现系统性偏差。
 */
export function cBToFreq(cB: number): number {
  if (cB > 0) {
    throw new Error("频率不可能是正的分贝数值");
  }
  return 10 ** (cB / 100);
}

export function cBToZipf(cB: number): number {
  return (cB + 900) / 100;
}

export function zipfToFreq(zipf: number): number {
  return 10 ** zipf / 1e9;
}

export function freqToZipf(freq: number): number {
  return Math.log10(freq) + 9;
}
