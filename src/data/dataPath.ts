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
const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const defaultDataDir = path.resolve(moduleDir, "../../data");

/**
 * 返回词频数据所在的目录。
 * 优先使用用户指定的环境变量，未指定时退回到包内自带的 data 目录。
 */
export function getDataDir(): string {
  const override = process.env[DATA_ENV_KEY];
  if (override && override.trim().length > 0) {
    return path.resolve(override);
  }
  return defaultDataDir;
}

/**
 * 拼接出具体数据文件的绝对路径，便于其他模块统一获取数据。
 */
export function getDataPath(filename: string): string {
  return path.resolve(getDataDir(), filename);
}
