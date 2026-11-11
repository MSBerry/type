import type { SegmentResult } from '../engine/stats';

export type BookProgress = { done: string[]; lastSegment: string; updatedAt: number };
export type DailyLog = { minutes: number; chars: number; segments?: number; quizRight?: number; taskBonus?: boolean };

export type Profile = {
  id: string;
  nickname: string;
  grade: 4 | 5 | 6;
  stars: number;
  totalChars: number;
  bestSpeedLevel: 0 | 1 | 2 | 3 | 4;
  badges: string[];
  skinsOwned: string[];
  skinsNew: string[];
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
    skinsNew: [],
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
  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return { store: defaultStore(), persistent: false };
  }
  if (raw === null) return { store: defaultStore(), persistent: true };
  try {
    const data = JSON.parse(raw) as { version?: unknown } | null;
    if (typeof data?.version === 'number' && data.version > 1) {
      // 这是更新版本的程序写的存档：不动它，这次的进度只放在内存里
      return { store: defaultStore(), persistent: false };
    }
    return { store: migrate(data), persistent: true };
  } catch {
    try {
      storage.setItem(`${STORAGE_KEY}/broken`, raw);
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
      [date]: {
        ...day,
        minutes: day.minutes + r.activeMs / 60000,
        chars: day.chars + r.hanzi,
        segments: (day.segments ?? 0) + 1,
      },
    },
  };
}

export function addStars(p: Profile, n: number): Profile {
  return { ...p, stars: p.stars + n };
}

export function recordQuizRight(p: Profile, date: string): Profile {
  const day = p.daily[date] ?? { minutes: 0, chars: 0 };
  return { ...addStars(p, 1), daily: { ...p.daily, [date]: { ...day, quizRight: (day.quizRight ?? 0) + 1 } } };
}

export function markSkinSeen(p: Profile, skinId: string): Profile {
  return p.skinsNew.includes(skinId) ? { ...p, skinsNew: p.skinsNew.filter((id) => id !== skinId) } : p;
}

export function wearSkin(p: Profile, skinId: string): Profile {
  if (!p.skinsOwned.includes(skinId)) return p;
  return { ...markSkinSeen(p, skinId), skinWorn: skinId };
}
