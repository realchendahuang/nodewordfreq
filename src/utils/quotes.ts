/**
 * 将各种弯引号、全角引号统一成半角直引号，便于与词表匹配。
 * 需求说明：原版在 lossy_tokenize 中会调用 ftfy 的 uncurl_quotes，这里保持等效处理。
 */
export function uncurlQuotes(text: string): string {
  return text.replace(/[\u2018\u2019\u2032]/g, "'").replace(/[\u201C\u201D\u2033]/g, '"');
}
