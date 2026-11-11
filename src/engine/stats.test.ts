import { describe, expect, it } from 'vitest';
import { createSession, press } from './session';
import { accuracy, buildResult, speedCpm, starsFor, topErrorKeys } from './stats';
import type { Token } from './types';

const base = createSession([]);

describe('accuracy', () => {
  it('还没按键时算 100%', () => {
    expect(accuracy(base)).toBe(100);
  });
  it('按对次数 ÷ 总次数，四舍五入', () => {
    expect(accuracy({ ...base, right: 3, wrong: 1 })).toBe(75);
    expect(accuracy({ ...base, right: 2, wrong: 1 })).toBe(67);
  });
});

describe('speedCpm', () => {
  it('完成字数 ÷ 有效分钟', () => {
    expect(speedCpm({ ...base, cursor: 10, activeMs: 30000 })).toBe(20);
  });
  it('有效时间不到 3 秒时显示 0，避免一开始数字乱跳', () => {
    expect(speedCpm({ ...base, cursor: 2, activeMs: 2000 })).toBe(0);
  });
});

describe('starsFor', () => {
  it('95% 以上 3 星，85% 以上 2 星，其余 1 星', () => {
    expect(starsFor(100)).toBe(3);
    expect(starsFor(95)).toBe(3);
    expect(starsFor(94)).toBe(2);
    expect(starsFor(85)).toBe(2);
    expect(starsFor(84)).toBe(1);
  });
});

describe('topErrorKeys', () => {
  it('按错的次数从多到少，次数一样按字母排', () => {
    expect(topErrorKeys({ h: 1, z: 3, g: 1, a: 0, n: 2 })).toEqual([
      { key: 'z', count: 3 },
      { key: 'n', count: 2 },
      { key: 'g', count: 1 },
    ]);
  });
});

describe('buildResult', () => {
  it('汇总一段的成绩', () => {
    const tokens: Token[] = [
      { kind: 'hanzi', char: '海', key: 'hai', tone: 'hǎi' },
      { kind: 'hanzi', char: '外', key: 'wai', tone: 'wài' },
    ];
    let s = createSession(tokens);
    s = press(s, 'x', 0).session;
    for (const [i, k] of [...'haiwai'].entries()) s = press(s, k, 1000 * (i + 1)).session;
    const r = buildResult(s, 'xiyouji', 'c1-1');
    expect(r).toMatchObject({ bookId: 'xiyouji', segmentId: 'c1-1', hanzi: 2, accuracy: 86, stars: 2, activeMs: 6000 });
    expect(r.speed).toBe(20);
    expect(r.keyErrors).toEqual({ h: 1 });
    expect(r.topErrors).toEqual([{ key: 'h', count: 1 }]);
    expect(r.maxStreak).toBe(6);
  });
});
