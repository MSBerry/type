import { describe, expect, it } from 'vitest';
import { newProfile } from '../storage/profile';
import { dailyTasks, grantDailyBonus, streakDays } from './dailyTasks';

const DATE = '2026-11-09';
const base = newProfile('p1', '小明', 5);

describe('dailyTasks', () => {
  it('一开始都没完成', () => {
    expect(dailyTasks(base, DATE).map((t) => t.done)).toEqual([false, false, false]);
  });

  it('按当天记录判断完成，进度不超过目标', () => {
    const p = { ...base, daily: { [DATE]: { minutes: 1, chars: 120, segments: 2, quizRight: 0 } } };
    const tasks = dailyTasks(p, DATE);
    expect(tasks.map((t) => t.done)).toEqual([true, true, false]);
    expect(tasks[1].progress).toBe('100 / 100');
  });
});

describe('grantDailyBonus', () => {
  const allDone = { ...base, daily: { [DATE]: { minutes: 1, chars: 120, segments: 1, quizRight: 1 } } };

  it('全部完成奖励 3 颗星', () => {
    const p = grantDailyBonus(allDone, DATE);
    expect(p.stars).toBe(3);
    expect(p.daily[DATE].taskBonus).toBe(true);
  });

  it('一天只奖励一次', () => {
    const once = grantDailyBonus(allDone, DATE);
    expect(grantDailyBonus(once, DATE)).toBe(once);
  });

  it('没完成时不变', () => {
    expect(grantDailyBonus(base, DATE)).toBe(base);
  });
});

describe('streakDays', () => {
  const day = { minutes: 1, chars: 10 };

  it('连续练习的天数', () => {
    expect(streakDays({ '2026-11-07': day, '2026-11-08': day, '2026-11-09': day }, DATE)).toBe(3);
  });

  it('今天还没练，从昨天往前数', () => {
    expect(streakDays({ '2026-11-07': day, '2026-11-08': day }, DATE)).toBe(2);
  });

  it('中间断了就重新算', () => {
    expect(streakDays({ '2026-11-06': day, '2026-11-08': day, '2026-11-09': day }, DATE)).toBe(2);
  });

  it('跨月也算连续', () => {
    expect(streakDays({ '2026-10-31': day, '2026-11-01': day }, '2026-11-01')).toBe(2);
  });

  it('没练过是 0', () => {
    expect(streakDays({}, DATE)).toBe(0);
  });
});
