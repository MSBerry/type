import { describe, expect, it } from 'vitest';
import { lastDays, topErrorKeys } from './parentStats';

describe('lastDays', () => {
  it('列出到今天为止的 7 天，没练的天是 0', () => {
    const rows = lastDays({ '2026-11-09': { minutes: 10.4, chars: 260 }, '2026-11-03': { minutes: 2, chars: 40 } }, '2026-11-09');
    expect(rows).toHaveLength(7);
    expect(rows[0]).toMatchObject({ date: '2026-11-03', minutes: 2, chars: 40, speed: 20 });
    expect(rows[6]).toMatchObject({ date: '2026-11-09', label: '11/9 周一', minutes: 10, chars: 260, speed: 25 });
    expect(rows[3]).toMatchObject({ minutes: 0, chars: 0, speed: 0 });
  });

  it('跨月也对', () => {
    expect(lastDays({}, '2026-12-02').map((r) => r.date)[0]).toBe('2026-11-26');
  });
});

describe('topErrorKeys', () => {
  it('按出错次数排序，只取前几个', () => {
    expect(topErrorKeys({ a: 2, s: 9, d: 5, f: 1 }, 3)).toEqual([
      ['s', 9],
      ['d', 5],
      ['a', 2],
    ]);
  });
});
