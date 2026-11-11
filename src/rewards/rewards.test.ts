import { describe, expect, it } from 'vitest';
import type { SegmentResult } from '../engine/stats';
import { type Profile, newProfile } from '../storage/profile';
import { finishedBookIds, nextSmallSkin, nextSpeedLevel, smallSkinsFor, speedLevelOf, syncRewards } from './rewards';

const DATE = '2026-11-09';
const base = newProfile('p1', '小明', 5);
const result = (over: Partial<SegmentResult> = {}): SegmentResult => ({
  bookId: 'xiyouji',
  segmentId: 'c1-1',
  hanzi: 52,
  speed: 10,
  accuracy: 80,
  stars: 1,
  activeMs: 60000,
  keyErrors: {},
  topErrors: [],
  maxStreak: 5,
  ...over,
});
const ALL = ['c1-1', 'c1-2', 'c1-3', 'c1-4'];
const finished = (p: Profile): Profile => ({ ...p, bookProgress: { xiyouji: { done: ALL, lastSegment: 'c1-4', updatedAt: 1 } } });

describe('speedLevelOf', () => {
  it('按速度门槛定等级', () => {
    expect(speedLevelOf(result({ speed: 19, accuracy: 95 }))).toBe(0);
    expect(speedLevelOf(result({ speed: 20, accuracy: 95 }))).toBe(1);
    expect(speedLevelOf(result({ speed: 35, accuracy: 95 }))).toBe(2);
    expect(speedLevelOf(result({ speed: 50, accuracy: 95 }))).toBe(4);
  });

  it('字数不够或正确率不够都不算', () => {
    expect(speedLevelOf(result({ speed: 60, accuracy: 95, hanzi: 29 }))).toBe(0);
    expect(speedLevelOf(result({ speed: 60, accuracy: 89 }))).toBe(0);
  });
});

describe('smallSkinsFor', () => {
  it('每 500 字解锁一个，经典键宝一开始就有', () => {
    expect(smallSkinsFor(499)).toEqual(['classic']);
    expect(smallSkinsFor(500)).toEqual(['classic', 'scarf']);
    expect(smallSkinsFor(1000)).toEqual(['classic', 'scarf', 'mint']);
  });

  it('全部解锁后不再增加', () => {
    expect(smallSkinsFor(99999)).toHaveLength(8);
  });
});

describe('finishedBookIds', () => {
  it('所有段落都打完才算读完', () => {
    expect(finishedBookIds(finished(base))).toEqual(['xiyouji']);
    expect(finishedBookIds({ ...base, bookProgress: { xiyouji: { done: ['c1-1'], lastSegment: 'c1-1', updatedAt: 1 } } })).toEqual([]);
  });
});

describe('syncRewards', () => {
  it('12 关指法全部通过得指法毕业徽章', () => {
    expect(syncRewards({ ...base, fingerLevel: 12 }, undefined, DATE).unlocks.badges).toContain('finger-grad');
    expect(syncRewards({ ...base, fingerLevel: 11 }, undefined, DATE).unlocks.badges).not.toContain('finger-grad');
  });

  it('打满 500 字解锁红围巾，并标记为新皮肤', () => {
    const { profile, unlocks } = syncRewards({ ...base, totalChars: 500 }, undefined, DATE);
    expect(unlocks.skins).toEqual(['scarf']);
    expect(profile.skinsOwned).toContain('scarf');
    expect(profile.skinsNew).toEqual(['scarf']);
  });

  it('读完一本书解锁对应的大皮肤', () => {
    expect(syncRewards(finished(base), undefined, DATE).unlocks.skins).toContain('monkey');
  });

  it('速度第一次升级解锁速度皮肤', () => {
    const { profile, unlocks } = syncRewards(base, result({ speed: 32, accuracy: 95 }), DATE);
    expect(profile.bestSpeedLevel).toBe(2);
    expect(unlocks.speedLevel).toBe(2);
    expect(unlocks.skins).toEqual(expect.arrayContaining(['bunny', 'horse']));
  });

  it('速度变慢不会降级', () => {
    const { profile, unlocks } = syncRewards({ ...base, bestSpeedLevel: 3 }, result({ speed: 21, accuracy: 95 }), DATE);
    expect(profile.bestSpeedLevel).toBe(3);
    expect(unlocks.speedLevel).toBeNull();
  });

  it('已拥有的不重复解锁', () => {
    const once = syncRewards({ ...base, totalChars: 500 }, undefined, DATE).profile;
    const again = syncRewards(once, undefined, DATE);
    expect(again.unlocks.skins).toEqual([]);
    expect(again.profile).toBe(once);
  });

  it('按成绩发徽章', () => {
    const p = { ...base, totalChars: 52 };
    const { unlocks } = syncRewards(p, result({ accuracy: 100, maxStreak: 50 }), DATE);
    expect(unlocks.badges).toEqual(expect.arrayContaining(['first', 'perfect', 'streak-50']));
  });

  it('打完第一回得花果山徽章，读完整本得读完 1 本', () => {
    const { unlocks } = syncRewards(finished(base), undefined, DATE);
    expect(unlocks.badges).toEqual(expect.arrayContaining(['huaguoshan', 'book-1']));
  });

  it('连续 3 天得徽章', () => {
    const day = { minutes: 1, chars: 10 };
    const p = { ...base, daily: { '2026-11-07': day, '2026-11-08': day, [DATE]: day } };
    expect(syncRewards(p, undefined, DATE).unlocks.badges).toContain('days-3');
  });
});

describe('下一个目标', () => {
  it('下一个小皮肤和还差的字数', () => {
    expect(nextSmallSkin(374)).toEqual({ skinId: 'scarf', remaining: 126, percent: 75 });
    expect(nextSmallSkin(500)).toEqual({ skinId: 'mint', remaining: 500, percent: 0 });
  });

  it('全部解锁后没有下一个', () => {
    expect(nextSmallSkin(99999)).toBeNull();
  });

  it('下一个速度等级', () => {
    expect(nextSpeedLevel(0)?.name).toBe('小兔');
    expect(nextSpeedLevel(1)?.name).toBe('骏马');
    expect(nextSpeedLevel(4)).toBeNull();
  });
});
