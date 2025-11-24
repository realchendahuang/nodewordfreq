/**
 * 简单的字符级转写实现，用于满足 Serbian/Azerbaijani 的罗马化需求。
 * 说明：这里实现的是最小可用的映射表，覆盖常见的西里尔字符；
 * 如果后续需要更完整的学术转写，可在此基础上扩展。
 */
const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  ђ: "đ",
  е: "e",
  ж: "ž",
  з: "z",
  и: "i",
  ј: "j",
  к: "k",
  л: "l",
  љ: "lj",
  м: "m",
  н: "n",
  њ: "nj",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  ћ: "ć",
  у: "u",
  ф: "f",
  х: "h",
  ц: "c",
  ч: "č",
  џ: "dž",
  ш: "š",
};

function preserveCase(source: string, target: string): string {
  if (source.toUpperCase() === source) {
    return target.toUpperCase();
  }
  if (source[0] === source[0]?.toUpperCase()) {
    return target.charAt(0).toUpperCase() + target.slice(1);
  }
  return target;
}

export function transliterate(transliteration: string, text: string): string {
  if (transliteration !== "sr-Latn" && transliteration !== "az-Latn") {
    return text;
  }

  return Array.from(text)
    .map((char) => {
      const lower = char.toLowerCase();
      const mapped = CYRILLIC_TO_LATIN[lower];
      if (!mapped) {
        return char;
      }
      return preserveCase(char, mapped);
    })
    .join("");
}
