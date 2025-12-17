/**
 * 缓存与概率计算用到的核心常量。
 * 这些值直接来源于原始 Python 版本的行为，保持一致才能让词频计算结果对齐。
 */
export const CACHE_SIZE = 100000;

/**
 * 在中文分词中，遇到推断出来的分词边界需要衰减概率。
 * 经验值为 10，表示每多一个推断出的空格，频率缩小 10 倍，避免分词把不存在的词拼出来。
 */
export const INFERRED_SPACE_FACTOR = 10;

/**
 * 默认使用的词表名称。与 Python 版保持相同语义：优先 large，不存在则退回 small。
 */
export const DEFAULT_WORDLIST = "best";

/**
 * 单字组合词频的惩罚因子。
 * 当整词不在词库中时，会尝试用单字词频估算，但组合词的实际频率通常低于单字频率的简单组合，
 * 因此需要额外的惩罚因子。值越大，估算出的词频越低。
 * 经验值为 3，表示每多一个字，额外衰减 3 倍。
 */
export const CHAR_COMBINATION_PENALTY = 3;
