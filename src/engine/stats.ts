import type { Session } from './types';

export function hanziDone(s: Session): number {
  return s.cursor;
}

export function accuracy(s: Session): number {
  const total = s.right + s.wrong;
  return total === 0 ? 100 : Math.round((s.right * 100) / total);
}

export function speedCpm(s: Session): number {
  if (s.activeMs < 3000) return 0;
  return Math.round(s.cursor / (s.activeMs / 60000));
}

export function starsFor(acc: number): 1 | 2 | 3 {
  if (acc >= 95) return 3;
  if (acc >= 85) return 2;
  return 1;
}

export function topErrorKeys(errors: Record<string, number>, n = 3): { key: string; count: number }[] {
  return Object.entries(errors)
    .filter(([, c]) => c > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n)
    .map(([key, count]) => ({ key, count }));
}

export type Unlocks = { skins: string[]; badges: string[]; speedLevel: number | null };

export type SegmentResult = {
  bookId: string;
  segmentId: string;
  hanzi: number;
  speed: number;
  accuracy: number;
  stars: 1 | 2 | 3;
  activeMs: number;
  keyErrors: Record<string, number>;
  topErrors: { key: string; count: number }[];
  maxStreak: number;
  /** 这一段新解锁的奖励，保存成绩时填入 */
  unlocks?: Unlocks;
  /** 读书小考考选了第几个；答过就不能再答 */
  quizPick?: number;
};

export function buildResult(s: Session, bookId: string, segmentId: string): SegmentResult {
  const acc = accuracy(s);
  return {
    bookId,
    segmentId,
    hanzi: hanziDone(s),
    speed: speedCpm(s),
    accuracy: acc,
    stars: starsFor(acc),
    activeMs: s.activeMs,
    keyErrors: { ...s.errorsByKey },
    topErrors: topErrorKeys(s.errorsByKey),
    maxStreak: s.maxStreak,
  };
}
