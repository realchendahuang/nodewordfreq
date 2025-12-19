import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * 数据目录的环境变量名称。
 * 提供该变量是为了支持用户在不同部署环境下自定义词频数据位置，满足“可配置路径”这一需求。
 */
export const DATA_ENV_KEY = "WORDFREQ_DATA";

/**
 * 解析出当前编译后文件所在目录，再向上回退到项目根目录，拼出默认的数据目录。
 * 这样设计是为了兼顾 ESM 与 CJS 输出：不依赖 __dirname，改用 import.meta.url 提供的绝对定位。
 */
const moduleDir =
  typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

// 说明：在 CJS 中 __dirname 本身已是当前文件所在目录，Bun 的 ESM 也会注入 __dirname。
// 需求：定位到打包输出的 dist 目录，再回退到 data。若对 __dirname 再调一次 dirname 会误跳到上一级 node_modules，导致找不到内置数据。
// 兼容源码运行场景（vitest 等），额外增加 ../../data 作为候选，确保 tests 从 src 入口跑时也能找到根级 data。
const defaultDataDir = path.resolve(moduleDir, "../data");
const sourceDataDir = path.resolve(moduleDir, "../../data");

/**
 * 返回词频数据所在的目录。
 * 优先使用用户指定的环境变量，未指定时退回到包内自带的 data 目录。
 */
export function getDataDir(): string {
  const override = process.env[DATA_ENV_KEY];
  const candidates = [
    override && override.trim().length > 0 ? path.resolve(override) : null,
    sourceDataDir,
    defaultDataDir,
    path.resolve(process.cwd(), "node_modules", "nodewordfreq", "data"),
    path.resolve(process.cwd(), "data"),
  ].filter((p): p is string => Boolean(p));

  for (const dir of candidates) {
    if (fs.existsSync(dir)) {
      return dir;
    }
  }

  throw new Error(
    `无法找到词频数据目录，请设置 ${DATA_ENV_KEY} 指向含有 msgpack.gz 数据的路径`,
  );
}

/**
 * 拼接出具体数据文件的绝对路径，便于其他模块统一获取数据。
 */
export function getDataPath(filename: string): string {
  return path.resolve(getDataDir(), filename);
}
