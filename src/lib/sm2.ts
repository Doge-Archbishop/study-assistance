/**
 * SM-2 间隔重复算法
 *
 * 基于 SuperMemo 2 算法，用于计算下次复习时间。
 *
 * @param quality   - 回忆质量 0~5（0=完全忘记, 5=完全掌握）
 * @param repetitions - 当前连续正确次数
 * @param easeFactor  - 难度因子（默认 2.5，最小 1.3）
 * @param interval    - 当前间隔（天）
 * @returns 更新后的 { repetitions, easeFactor, interval, nextReviewDate }
 */
export function sm2(
  quality: number,
  repetitions: number,
  easeFactor: number,
  interval: number,
): {
  repetitions: number;
  easeFactor: number;
  interval: number;
  nextReviewDate: Date;
} {
  // 边界检查
  if (quality < 0 || quality > 5) {
    throw new Error("quality must be between 0 and 5");
  }

  let newRepetitions = repetitions;
  let newInterval = interval;
  const newEaseFactor = Math.max(
    1.3,
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
  );

  if (quality >= 3) {
    // 回忆成功
    if (newRepetitions === 0) {
      newInterval = 1;
    } else if (newRepetitions === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval * newEaseFactor);
    }
    newRepetitions += 1;
  } else {
    // 回忆失败 → 重置
    newRepetitions = 0;
    newInterval = 1;
  }

  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);

  return {
    repetitions: newRepetitions,
    easeFactor: Math.round(newEaseFactor * 100) / 100,
    interval: newInterval,
    nextReviewDate,
  };
}

/**
 * 获取今日待复习的错题 / 单词
 */
export function getDueItems<T extends { sm2NextReviewDate: Date }>(
  items: T[],
): T[] {
  const now = new Date();
  return items.filter((item) => item.sm2NextReviewDate <= now);
}
