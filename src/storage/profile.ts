import type { SegmentResult } from '../engine/stats';

export type BookProgress = { done: string[]; lastSegment: string; updatedAt: number };
export type DailyLog = { minutes: number; chars: number };

export type Profile = {
  id: string;
  nickname: string;
  grade: 4 | 5 | 6;
  stars: number;
  totalChars: number;
  bestSpeedLevel: 0 | 1 | 2 | 3 | 4;
  badges: string[];
  skinsOwned: string[];
  skinWorn: string;
  bookProgress: Record<string, BookProgress>;
  keyErrors: Record<string, number>;
  daily: Record<string, DailyLog>;
  settings: { dailyLimitMin: number; sound: boolean; showPinyin: boolean };
};

export type Store = { version: 1; activeId: string; profiles: Profile[] };

export const STORAGE_KEY = 'kbd-adventure/v1';

export function newProfile(id: string, nickname: string, grade: Profile['grade']): Profile {
  return {
    id,
    nickname,
    grade,
    stars: 0,
    totalChars: 0,
    bestSpeedLevel: 0,
    badges: [],
    skinsOwned: ['classic'],
    skinWorn: 'classic',
    bookProgress: {},
    keyErrors: {},
    daily: {},
    settings: { dailyLimitMin: 20, sound: true, showPinyin: true },
  };
}

export function defaultStore(): Store {
  const p = newProfile('p1', '小朋友', 5);
  return { version: 1, activeId: p.id, profiles: [p] };
}

export function migrate(data: unknown): Store {
  const d = data as Partial<Store> | null;
  if (!d || d.version !== 1 || !Array.isArray(d.profiles) || d.profiles.length === 0) {
    throw new Error('存档格式不对');
  }
  const profiles = d.profiles.map((raw) => {
    const grade = [4, 5, 6].includes(raw.grade) ? raw.grade : 5;
    const base = newProfile(String(raw.id ?? 'p1'), String(raw.nickname ?? '小朋友'), grade);
    return { ...base, ...raw, grade, settings: { ...base.settings, ...(raw.settings ?? {}) } };
  });
  const activeId = profiles.some((p) => p.id === d.activeId) ? (d.activeId as string) : profiles[0].id;
  return { version: 1, activeId, profiles };
}

export function getStorage(): Storage | null {
  try {
    const s = window.localStorage;
    const probe = '__kbd_probe__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

export function loadStore(storage: Storage | null): { store: Store; persistent: boolean } {
  if (!storage) return { store: defaultStore(), persistent: false };
  const raw = storage.getItem(STORAGE_KEY);
  if (raw === null) return { store: defaultStore(), persistent: true };
  try {
    return { store: migrate(JSON.parse(raw)), persistent: true };
  } catch {
    try {
      storage.setItem(`${STORAGE_KEY}/broken-${Date.now()}`, raw);
    } catch {
      // 备份失败也继续，不能让孩子卡在这里
    }
    return { store: defaultStore(), persistent: true };
  }
}

export function saveStore(storage: Storage, store: Store): boolean {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(store));
    return true;
  } catch {
    return false;
  }
}

export function activeProfile(store: Store): Profile {
  return store.profiles.find((p) => p.id === store.activeId) ?? store.profiles[0];
}

export function replaceProfile(store: Store, profile: Profile): Store {
  return { ...store, profiles: store.profiles.map((p) => (p.id === profile.id ? profile : p)) };
}

export function today(d = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function recordSegment(p: Profile, r: SegmentResult, date: string, now = Date.now()): Profile {
  const prev = p.bookProgress[r.bookId];
  const done = prev ? (prev.done.includes(r.segmentId) ? prev.done : [...prev.done, r.segmentId]) : [r.segmentId];
  const keyErrors = { ...p.keyErrors };
  for (const [k, n] of Object.entries(r.keyErrors)) keyErrors[k] = (keyErrors[k] ?? 0) + n;
  const day = p.daily[date] ?? { minutes: 0, chars: 0 };
  return {
    ...p,
    stars: p.stars + r.stars,
    totalChars: p.totalChars + r.hanzi,
    bookProgress: { ...p.bookProgress, [r.bookId]: { done, lastSegment: r.segmentId, updatedAt: now } },
    keyErrors,
    daily: {
      ...p.daily,
      [date]: { minutes: Math.round((day.minutes + r.activeMs / 60000) * 10) / 10, chars: day.chars + r.hanzi },
    },
  };
}

export function addStars(p: Profile, n: number): Profile {
  return { ...p, stars: p.stars + n };
}
