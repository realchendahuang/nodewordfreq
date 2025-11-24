import fs from "node:fs";
import { gunzipSync } from "node:zlib";
import { Unpackr } from "msgpackr";

/**
 * cBpack 解析器，用来把压缩的 msgpack 词频文件加载成内存结构。
 * 采用同步读取是为了与 Python 版一致的阻塞式 API，方便在计算词频的调用链里直接使用。
 * 如果需要流式读取以降低内存占用，可以在后续迭代中再扩展异步版本。
 */
export function readCBPack(filePath: string): string[][] {
  const packed = fs.readFileSync(filePath);
  const uncompressed = gunzipSync(packed);

  const unpackr = new Unpackr({ useRecords: false });
  const decoded = unpackr.unpack(uncompressed) as unknown[];
  const [header, ...buckets] = decoded as [Record<string, unknown>, ...string[][]];

  if (
    !header ||
    typeof header !== "object" ||
    (header as Record<string, unknown>).format !== "cB" ||
    (header as Record<string, unknown>).version !== 1
  ) {
    throw new Error(`非法的 cBpack 头部: ${JSON.stringify(header)}`);
  }

  return buckets;
}
