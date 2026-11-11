import { getBook } from '../content/library';
import type { SegmentResult, Unlocks } from '../engine/stats';
import { type Profile, today } from '../storage/profile';
import { BADGES } from './badges';
import { FINGER_LEVEL_COUNT, SMALL_SKIN_STEP, SPEED_LEVELS, SPEED_MIN_ACCURACY, SPEED_MIN_HANZI } from './config';
import { streakDays } from './dailyTasks';
import { SKINS, SMALL_SKIN_ORDER } from './skins';

type Level = Profile['bestSpeedLevel'];

export function speedLevelOf(r: Pick<SegmentResult, 'hanzi' | 'accuracy' | 'speed'>): Level {
  if (r.hanzi < SPEED_MIN_HANZI || r.accuracy < SPEED_MIN_ACCURACY) return 0;
  let level: Level = 0;
  for (const l of SPEED_LEVELS) if (r.speed >= l.minSpeed) level = l.level;
  return level;
}

export function smallSkinsFor(totalChars: number): string[] {
  return ['classic', ...SMALL_SKIN_ORDER.slice(0, Math.floor(totalChars / SMALL_SKIN_STEP))];
}

export function finishedBookIds(p: Profile): string[] {
  return Object.entries(p.bookProgress)
    .filter(([id, progress]) => {
      const book = getBook(id);
      return book !== null && book.segments.every((s) => progress.done.includes(s.id));
    })
    .map(([id]) => id);
}

function skinsEarned(p: Profile): string[] {
  const books = finishedBookIds(p)
    .map((id) => getBook(id)?.skinId ?? '')
    .filter((id) => SKINS.some((s) => s.id === id));
  const speed = SPEED_LEVELS.filter((l) => l.level <= p.bestSpeedLevel).map((l) => l.skinId as string);
  return [...smallSkinsFor(p.totalChars), ...books, ...speed];
}

function badgesEarned(p: Profile, r: SegmentResult | undefined, date: string): string[] {
  const books = finishedBookIds(p).length;
  const days = streakDays(p.daily, date);
  const chapter1 = getBook('xiyouji')?.segments.filter((s) => s.id.startsWith('c1-')) ?? [];
  const done = p.bookProgress.xiyouji?.done ?? [];
  const earned: Record<string, boolean> = {
    first: p.totalChars > 0,
    perfect: r !== undefined && r.accuracy === 100 && r.hanzi >= SPEED_MIN_HANZI,
    'streak-50': r !== undefined && r.maxStreak >= 50,
    'chars-1000': p.totalChars >= 1000,
    'chars-5000': p.totalChars >= 5000,
    'chars-10000': p.totalChars >= 10000,
    'days-3': days >= 3,
    'days-7': days >= 7,
    'book-1': books >= 1,
    'book-3': books >= 3,
    'speed-1': p.bestSpeedLevel >= 1,
    'speed-2': p.bestSpeedLevel >= 2,
    'speed-3': p.bestSpeedLevel >= 3,
    'speed-4': p.bestSpeedLevel >= 4,
    'finger-grad': p.fingerLevel >= FINGER_LEVEL_COUNT,
    huaguoshan: chapter1.length > 0 && chapter1.every((s) => done.includes(s.id)),
  };
  return BADGES.filter((b) => earned[b.id]).map((b) => b.id);
}

/** 按档案（和这一段的成绩）补发该得的奖励。没有新奖励时返回原来的档案对象。 */
export function syncRewards(p: Profile, r?: SegmentResult, date = today()): { profile: Profile; unlocks: Unlocks } {
  const reached = r ? speedLevelOf(r) : 0;
  const level = Math.max(p.bestSpeedLevel, reached) as Level;
  const leveled = level === p.bestSpeedLevel ? p : { ...p, bestSpeedLevel: level };
  const skins = skinsEarned(leveled).filter((id) => !p.skinsOwned.includes(id));
  const badges = badgesEarned(leveled, r, date).filter((id) => !p.badges.includes(id));
  const unlocks: Unlocks = { skins, badges, speedLevel: level > p.bestSpeedLevel ? level : null };
  if (leveled === p && skins.length === 0 && badges.length === 0) return { profile: p, unlocks };
  return {
    profile: {
      ...leveled,
      skinsOwned: [...p.skinsOwned, ...skins],
      skinsNew: [...p.skinsNew, ...skins],
      badges: [...p.badges, ...badges],
    },
    unlocks,
  };
}

export function nextSmallSkin(totalChars: number): { skinId: string; remaining: number; percent: number } | null {
  const index = Math.floor(totalChars / SMALL_SKIN_STEP);
  if (index >= SMALL_SKIN_ORDER.length) return null;
  const into = totalChars % SMALL_SKIN_STEP;
  return { skinId: SMALL_SKIN_ORDER[index], remaining: SMALL_SKIN_STEP - into, percent: Math.round((into * 100) / SMALL_SKIN_STEP) };
}

export function nextSpeedLevel(best: number) {
  return SPEED_LEVELS.find((l) => l.level === best + 1) ?? null;
}
