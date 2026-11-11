import { describe, expect, it } from 'vitest';
import type { SegmentResult } from '../engine/stats';
import {
  STORAGE_KEY,
  activeProfile,
  addStars,
  defaultStore,
  loadStore,
  migrate,
  newProfile,
  recordSegment,
  saveStore,
  today,
} from './profile';

const RESULT: SegmentResult = {
  bookId: 'xiyouji',
  segmentId: 'c1-1',
  hanzi: 52,
  speed: 24,
  accuracy: 96,
  stars: 3,
  activeMs: 90000,
  keyErrors: { z: 2, h: 1 },
  topErrors: [],
  maxStreak: 0,
};

describe('newProfile', () => {
  it('新档案带默认设置和经典皮肤', () => {
    const p = newProfile('p1', '小明', 4);
    expect(p).toMatchObject({ id: 'p1', nickname: '小明', grade: 4, stars: 0, totalChars: 0, skinsOwned: ['classic'], skinWorn: 'classic' });
    expect(p.settings).toEqual({ dailyLimitMin: 20, sound: true, showPinyin: true });
  });
});

describe('loadStore', () => {
  it('不能存储时返回默认档案，并标记为不持久', () => {
    const r = loadStore(null);
    expect(r.persistent).toBe(false);
    expect(activeProfile(r.store).nickname).toBe('小朋友');
  });

  it('第一次打开时返回默认档案', () => {
    const r = loadStore(localStorage);
    expect(r.persistent).toBe(true);
    expect(r.store.profiles).toHaveLength(1);
  });

  it('存档损坏时先备份原数据，再用默认档案', () => {
    localStorage.setItem(STORAGE_KEY, '{坏掉的');
    const r = loadStore(localStorage);
    expect(activeProfile(r.store).stars).toBe(0);
    expect(localStorage.getItem(`${STORAGE_KEY}/broken`)).toBe('{坏掉的');
  });

  it('反复遇到损坏的存档，只保留一份备份', () => {
    localStorage.setItem(STORAGE_KEY, '{坏掉的');
    loadStore(localStorage);
    loadStore(localStorage);
    expect(localStorage.length).toBe(2);
  });

  it('遇到更新版本写的存档：不动原数据，这次不保存', () => {
    const newer = JSON.stringify({ version: 2, profiles: [] });
    localStorage.setItem(STORAGE_KEY, newer);
    const r = loadStore(localStorage);
    expect(r.persistent).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBe(newer);
    expect(localStorage.length).toBe(1);
  });

  it('读取存储出错时不崩溃', () => {
    const blocked = {
      getItem: () => {
        throw new Error('SecurityError');
      },
    } as unknown as Storage;
    expect(loadStore(blocked).persistent).toBe(false);
  });

  it('保存后能原样读回', () => {
    const store = defaultStore();
    store.profiles[0].stars = 9;
    expect(saveStore(localStorage, store)).toBe(true);
    expect(activeProfile(loadStore(localStorage).store).stars).toBe(9);
  });
});

describe('migrate', () => {
  it('补齐旧存档里缺的字段', () => {
    const store = migrate({ version: 1, activeId: 'p1', profiles: [{ id: 'p1', nickname: '小明', grade: 6, stars: 7 }] });
    const p = activeProfile(store);
    expect(p.stars).toBe(7);
    expect(p.grade).toBe(6);
    expect(p.settings.showPinyin).toBe(true);
    expect(p.skinsOwned).toEqual(['classic']);
  });

  it('版本不对时报错', () => {
    expect(() => migrate({ version: 9, profiles: [] })).toThrow();
  });
});

describe('saveStore', () => {
  it('存储空间满了返回 false，不抛错', () => {
    const full = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
      removeItem: () => undefined,
      clear: () => undefined,
      key: () => null,
      length: 0,
    } as Storage;
    expect(saveStore(full, defaultStore())).toBe(false);
  });
});

describe('recordSegment', () => {
  it('记录星星、字数、进度、易错键和当天的时长', () => {
    const p = recordSegment(newProfile('p1', '小明', 5), RESULT, '2026-11-09', 1000);
    expect(p.stars).toBe(3);
    expect(p.totalChars).toBe(52);
    expect(p.bookProgress.xiyouji).toEqual({ done: ['c1-1'], lastSegment: 'c1-1', updatedAt: 1000 });
    expect(p.keyErrors).toEqual({ z: 2, h: 1 });
    expect(p.daily['2026-11-09']).toEqual({ minutes: 1.5, chars: 52 });
  });

  it('很短的段落也计入时长', () => {
    const p = recordSegment(newProfile('p1', '小明', 5), { ...RESULT, activeMs: 1000 }, '2026-11-09', 1);
    expect(p.daily['2026-11-09'].minutes).toBeCloseTo(1 / 60);
  });

  it('同一段打两遍：字数和星星累加，进度不重复', () => {
    let p = newProfile('p1', '小明', 5);
    p = recordSegment(p, RESULT, '2026-11-09', 1000);
    p = recordSegment(p, RESULT, '2026-11-09', 2000);
    expect(p.totalChars).toBe(104);
    expect(p.stars).toBe(6);
    expect(p.bookProgress.xiyouji.done).toEqual(['c1-1']);
    expect(p.keyErrors.z).toBe(4);
    expect(p.daily['2026-11-09']).toEqual({ minutes: 3, chars: 104 });
  });
});

describe('addStars / today', () => {
  it('加星星', () => {
    expect(addStars(newProfile('p1', '小明', 5), 2).stars).toBe(2);
  });
  it('日期用本地时间，格式 YYYY-MM-DD', () => {
    expect(today(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});
