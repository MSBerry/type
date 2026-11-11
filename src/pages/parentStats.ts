import { type DailyLog, today } from '../storage/profile';

export type DayRow = { date: string; label: string; minutes: number; chars: number; speed: number };

/** 到 end 为止的 n 天（含 end），没练的天记 0；速度是当天字数 ÷ 当天分钟数 */
export function lastDays(daily: Record<string, DailyLog>, end: string, n = 7): DayRow[] {
  const [y, m, d] = end.split('-').map(Number);
  const rows: DayRow[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const dt = new Date(y, m - 1, d - i);
    const date = today(dt);
    const log = daily[date];
    const minutes = log?.minutes ?? 0;
    const chars = log?.chars ?? 0;
    rows.push({
      date,
      label: `${dt.getMonth() + 1}/${dt.getDate()} 周${'日一二三四五六'[dt.getDay()]}`,
      minutes: Math.round(minutes),
      chars,
      speed: minutes > 0 ? Math.round(chars / minutes) : 0,
    });
  }
  return rows;
}

export function topErrorKeys(keyErrors: Record<string, number>, n = 5): [string, number][] {
  return Object.entries(keyErrors)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n);
}
