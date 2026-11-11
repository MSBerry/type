import { type Book, CUSTOM_BOOK_PREFIX } from '../content/schema';
import type { SegmentResult } from '../engine/stats';

export type BookProgress = { done: string[]; lastSegment: string; updatedAt: number };
export type DailyLog = { minutes: number; chars: number; segments?: number; quizRight?: number; taskBonus?: boolean };

export type Profile = {
  id: string;
  nickname: string;
  grade: 4 | 5 | 6;
  /** 头像颜色，见 src/ui/Avatar.tsx */
  avatar: string;
  stars: number;
  totalChars: number;
  bestSpeedLevel: 0 | 1 | 2 | 3 | 4;
  /** 指法训练营已通过的最高关（0 表示还没通过） */
  fingerLevel: number;
  /** 龙宫泡泡最高分 */
  gameBest: number;
  badges: string[];
  skinsOwned: string[];
  skinsNew: string[];
  skinWorn: string;
  bookProgress: Record<string, BookProgress>;
  keyErrors: Record<string, number>;
  daily: Record<string, DailyLog>;
  settings: { dailyLimitMin: number; sound: boolean; showPinyin: boolean };
};

export type Store = {
  version: 1;
  activeId: string;
  profiles: Profile[];
  /** false 表示第一次打开，还没给孩子建档 */
  setupDone: boolean;
  /** 家长导入的文章，所有小朋友共用 */
  customBooks: Book[];
};

export const STORAGE_KEY = 'kbd-adventure/v1';

export function newProfile(id: string, nickname: string, grade: Profile['grade'], avatar = 'sun'): Profile {
  return {
    id,
    nickname,
    grade,
    avatar,
    stars: 0,
    totalChars: 0,
    bestSpeedLevel: 0,
    fingerLevel: 0,
    gameBest: 0,
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
  return { version: 1, activeId: p.id, profiles: [p], setupDone: true, customBooks: [] };
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : d);
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

function cleanProfile(raw: unknown, index: number): Profile {
  if (!isObj(raw)) throw new Error('存档格式不对');
  const grade = raw.grade === 4 || raw.grade === 5 || raw.grade === 6 ? raw.grade : 5;
  const id = typeof raw.id === 'string' && raw.id ? raw.id : `p${index + 1}`;
  const nickname = typeof raw.nickname === 'string' && raw.nickname.trim() ? raw.nickname.trim().slice(0, 8) : '小朋友';
  const base = newProfile(id, nickname, grade, typeof raw.avatar === 'string' ? raw.avatar : 'sun');

  const bookProgress: Record<string, BookProgress> = {};
  if (isObj(raw.bookProgress)) {
    for (const [bookId, bp] of Object.entries(raw.bookProgress)) {
      if (!isObj(bp)) continue;
      bookProgress[bookId] = { done: strs(bp.done), lastSegment: typeof bp.lastSegment === 'string' ? bp.lastSegment : '', updatedAt: num(bp.updatedAt, 0) };
    }
  }
  const keyErrors: Record<string, number> = {};
  if (isObj(raw.keyErrors)) {
    for (const [k, n] of Object.entries(raw.keyErrors)) if (typeof n === 'number' && n > 0) keyErrors[k] = n;
  }
  const daily: Record<string, DailyLog> = {};
  if (isObj(raw.daily)) {
    for (const [date, d] of Object.entries(raw.daily)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !isObj(d)) continue;
      const log: DailyLog = { minutes: num(d.minutes, 0), chars: num(d.chars, 0) };
      if (typeof d.segments === 'number') log.segments = num(d.segments, 0);
      if (typeof d.quizRight === 'number') log.quizRight = num(d.quizRight, 0);
      if (d.taskBonus === true) log.taskBonus = true;
      daily[date] = log;
    }
  }
  const owned = strs(raw.skinsOwned);
  const skinsOwned = owned.includes('classic') ? owned : ['classic', ...owned];
  const level = num(raw.bestSpeedLevel, 0);
  const s = isObj(raw.settings) ? raw.settings : {};
  return {
    ...base,
    stars: num(raw.stars, 0),
    totalChars: num(raw.totalChars, 0),
    bestSpeedLevel: (Number.isInteger(level) && level <= 4 ? level : 0) as Profile['bestSpeedLevel'],
    fingerLevel: Math.min(12, Math.floor(num(raw.fingerLevel, 0))),
    gameBest: num(raw.gameBest, 0),
    badges: strs(raw.badges),
    skinsOwned,
    skinsNew: strs(raw.skinsNew),
    skinWorn: typeof raw.skinWorn === 'string' && skinsOwned.includes(raw.skinWorn) ? raw.skinWorn : 'classic',
    bookProgress,
    keyErrors,
    daily,
    settings: {
      dailyLimitMin: num(s.dailyLimitMin, base.settings.dailyLimitMin),
      sound: typeof s.sound === 'boolean' ? s.sound : base.settings.sound,
      showPinyin: typeof s.showPinyin === 'boolean' ? s.showPinyin : base.settings.showPinyin,
    },
  };
}

const isToken = (t: unknown) =>
  isObj(t) &&
  typeof t.char === 'string' &&
  (t.kind === 'skip' || (t.kind === 'hanzi' && typeof t.tone === 'string' && typeof t.key === 'string' && /^[a-z]+$/.test(t.key)));

function cleanBooks(v: unknown): Book[] {
  if (!Array.isArray(v)) return [];
  return v.filter(
    (b): b is Book =>
      isObj(b) &&
      typeof b.id === 'string' &&
      b.id.startsWith(CUSTOM_BOOK_PREFIX) &&
      typeof b.title === 'string' &&
      Array.isArray(b.segments) &&
      b.segments.length > 0 &&
      b.segments.every((s) => isObj(s) && typeof s.id === 'string' && typeof s.title === 'string' && Array.isArray(s.tokens) && s.tokens.every(isToken)),
  );
}

export function migrate(data: unknown): Store {
  if (!isObj(data) || data.version !== 1 || !Array.isArray(data.profiles) || data.profiles.length === 0) {
    throw new Error('存档格式不对');
  }
  const seen = new Set<string>();
  const profiles = data.profiles.map((raw, i) => {
    const p = cleanProfile(raw, i);
    const id = seen.has(p.id) ? `${p.id}-${i + 1}` : p.id;
    seen.add(id);
    return id === p.id ? p : { ...p, id };
  });
  const activeId = profiles.some((p) => p.id === data.activeId) ? (data.activeId as string) : profiles[0].id;
  return { version: 1, activeId, profiles, setupDone: data.setupDone !== false, customBooks: cleanBooks(data.customBooks) };
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
  if (raw === null) return { store: { ...defaultStore(), setupDone: false }, persistent: true };
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

/** 指法、拼音快打、游戏的成绩：加星星、打字量和当天时长（不算段数） */
export function recordPractice(p: Profile, r: { chars: number; stars: number; activeMs: number }, date: string): Profile {
  const day = p.daily[date] ?? { minutes: 0, chars: 0 };
  return {
    ...p,
    stars: p.stars + r.stars,
    totalChars: p.totalChars + r.chars,
    daily: { ...p.daily, [date]: { ...day, minutes: day.minutes + r.activeMs / 60000, chars: day.chars + r.chars } },
  };
}

export function passFingerLevel(p: Profile, level: number): Profile {
  return level > p.fingerLevel ? { ...p, fingerLevel: level } : p;
}

export function recordGameScore(p: Profile, score: number): Profile {
  return score > p.gameBest ? { ...p, gameBest: score } : p;
}

export type ChildInfo = { nickname: string; grade: Profile['grade']; avatar: string };

/** 第一次打开时给默认档案起名字；以后再用，就是加一个新的小朋友并切换过去 */
export function setupChild(store: Store, info: ChildInfo): Store {
  if (!store.setupDone) {
    return { ...replaceProfile(store, { ...activeProfile(store), ...info }), setupDone: true };
  }
  let n = store.profiles.length + 1;
  while (store.profiles.some((p) => p.id === `p${n}`)) n += 1;
  const p = newProfile(`p${n}`, info.nickname, info.grade, info.avatar);
  return { ...store, activeId: p.id, profiles: [...store.profiles, p] };
}

export function switchProfile(store: Store, id: string): Store {
  return store.activeId !== id && store.profiles.some((p) => p.id === id) ? { ...store, activeId: id } : store;
}

export function addCustomBook(store: Store, book: Book): Store {
  return { ...store, customBooks: [...store.customBooks, book] };
}

export function removeCustomBook(store: Store, id: string): Store {
  return { ...store, customBooks: store.customBooks.filter((b) => b.id !== id) };
}

export function exportStore(store: Store): string {
  return JSON.stringify(store, null, 2);
}

/** 读备份文件。格式不对就抛出说明原因的错误，调用方不要改现有数据 */
export function parseBackup(text: string): Store {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('这不是小键盘大冒险的备份文件（读不出内容）');
  }
  if (isObj(data) && typeof data.version === 'number' && data.version > 1) {
    throw new Error('这个备份来自更新版本的小键盘大冒险，请先更新程序');
  }
  try {
    return { ...migrate(data), setupDone: true };
  } catch {
    throw new Error('这不是小键盘大冒险的备份文件（格式不对）');
  }
}
