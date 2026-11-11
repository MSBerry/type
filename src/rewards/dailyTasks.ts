import { type DailyLog, type Profile, addStars, today } from '../storage/profile';
import { DAILY_CHAR_GOAL, DAILY_TASK_BONUS } from './config';

export type DailyTask = { id: string; title: string; done: boolean; progress: string };

export function dailyTasks(p: Profile, date: string): DailyTask[] {
  const day = p.daily[date];
  const segments = day?.segments ?? 0;
  const chars = day?.chars ?? 0;
  const quiz = day?.quizRight ?? 0;
  return [
    { id: 'segment', title: '打一段课外书', done: segments >= 1, progress: `${Math.min(segments, 1)} / 1` },
    {
      id: 'chars',
      title: `今天打满 ${DAILY_CHAR_GOAL} 字`,
      done: chars >= DAILY_CHAR_GOAL,
      progress: `${Math.min(chars, DAILY_CHAR_GOAL)} / ${DAILY_CHAR_GOAL}`,
    },
    { id: 'quiz', title: '答对一道小考考', done: quiz >= 1, progress: `${Math.min(quiz, 1)} / 1` },
  ];
}

export function grantDailyBonus(p: Profile, date: string): Profile {
  const day = p.daily[date];
  if (!day || day.taskBonus || !dailyTasks(p, date).every((t) => t.done)) return p;
  return { ...addStars(p, DAILY_TASK_BONUS), daily: { ...p.daily, [date]: { ...day, taskBonus: true } } };
}

export function streakDays(daily: Record<string, DailyLog>, date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  const cursor = new Date(y, m - 1, d);
  const practiced = () => (daily[today(cursor)]?.chars ?? 0) > 0;
  if (!practiced()) cursor.setDate(cursor.getDate() - 1);
  let n = 0;
  while (practiced()) {
    n += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return n;
}
