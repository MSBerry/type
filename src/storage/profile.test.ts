import { describe, expect, it } from 'vitest';
import type { Book } from '../content/schema';
import type { SegmentResult } from '../engine/stats';
import {
  STORAGE_KEY,
  activeProfile,
  addCustomBook,
  addStars,
  defaultStore,
  exportStore,
  loadStore,
  markSkinSeen,
  migrate,
  newProfile,
  parseBackup,
  passFingerLevel,
  recordGameScore,
  recordPractice,
  recordQuizRight,
  recordSegment,
  removeCustomBook,
  saveStore,
  setupChild,
  switchProfile,
  today,
  wearSkin,
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
    expect(p.daily['2026-11-09']).toEqual({ minutes: 1.5, chars: 52, segments: 1 });
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
    expect(p.daily['2026-11-09']).toEqual({ minutes: 3, chars: 104, segments: 2 });
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

describe('recordQuizRight', () => {
  it('加一颗星，并记到当天', () => {
    const p = recordQuizRight(newProfile('p1', '小明', 5), '2026-11-09');
    expect(p.stars).toBe(1);
    expect(p.daily['2026-11-09'].quizRight).toBe(1);
  });
});

describe('皮肤', () => {
  const withScarf = { ...newProfile('p1', '小明', 5), skinsOwned: ['classic', 'scarf'], skinsNew: ['scarf'] };

  it('穿上已拥有的皮肤，并去掉 NEW 标记', () => {
    const p = wearSkin(withScarf, 'scarf');
    expect(p.skinWorn).toBe('scarf');
    expect(p.skinsNew).toEqual([]);
  });

  it('没有的皮肤穿不上', () => {
    expect(wearSkin(withScarf, 'rocket').skinWorn).toBe('classic');
  });

  it('看过之后去掉 NEW 标记', () => {
    expect(markSkinSeen(withScarf, 'scarf').skinsNew).toEqual([]);
  });

  it('旧存档补上 skinsNew', () => {
    const store = migrate({ version: 1, activeId: 'p1', profiles: [{ id: 'p1', nickname: '小明', grade: 6 }] });
    expect(activeProfile(store).skinsNew).toEqual([]);
  });
});

describe('指法、拼音、游戏的成绩', () => {
  const p = newProfile('p1', '小明', 5);

  it('recordPractice 记星星、打字量和当天时长', () => {
    const next = recordPractice(p, { chars: 20, stars: 2, activeMs: 60000 }, '2026-11-09');
    expect(next.stars).toBe(2);
    expect(next.totalChars).toBe(20);
    expect(next.daily['2026-11-09']).toEqual({ minutes: 1, chars: 20 });
  });

  it('指法关卡只升不降', () => {
    expect(passFingerLevel(p, 3).fingerLevel).toBe(3);
    const at5 = { ...p, fingerLevel: 5 };
    expect(passFingerLevel(at5, 3)).toBe(at5);
  });

  it('游戏只记最高分', () => {
    expect(recordGameScore(p, 120).gameBest).toBe(120);
    const best = { ...p, gameBest: 300 };
    expect(recordGameScore(best, 120)).toBe(best);
  });

  it('新档案和旧存档都从第 0 关、0 分开始', () => {
    expect(p.fingerLevel).toBe(0);
    expect(p.gameBest).toBe(0);
    const store = migrate({ version: 1, activeId: 'p1', profiles: [{ id: 'p1', nickname: '小明', grade: 6 }] });
    expect(activeProfile(store).fingerLevel).toBe(0);
  });
});

describe('首次启动和多个小朋友', () => {
  it('本机没有存档才算第一次打开', () => {
    const empty = { getItem: () => null, setItem: () => undefined } as unknown as Storage;
    expect(loadStore(empty).store.setupDone).toBe(false);
    expect(defaultStore().setupDone).toBe(true);
    const old = migrate({ version: 1, activeId: 'p1', profiles: [{ id: 'p1', nickname: '小明', grade: 6 }] });
    expect(old.setupDone).toBe(true);
    expect(old.customBooks).toEqual([]);
  });

  it('第一次建档是给默认档案起名字', () => {
    const fresh = { ...defaultStore(), setupDone: false };
    const s = setupChild(fresh, { nickname: '小红', grade: 4, avatar: 'mint' });
    expect(s.setupDone).toBe(true);
    expect(s.profiles).toHaveLength(1);
    expect(activeProfile(s)).toMatchObject({ id: 'p1', nickname: '小红', grade: 4, avatar: 'mint' });
  });

  it('以后再建档是加一个新的小朋友，并切换过去', () => {
    const s = setupChild(defaultStore(), { nickname: '小刚', grade: 6, avatar: 'blue' });
    expect(s.profiles.map((p) => p.id)).toEqual(['p1', 'p2']);
    expect(activeProfile(s).nickname).toBe('小刚');
    const back = switchProfile(s, 'p1');
    expect(activeProfile(back).id).toBe('p1');
    expect(switchProfile(back, 'nope')).toBe(back);
  });
});

describe('migrate 逐个字段校验', () => {
  it('类型不对的字段换成默认值，不认识的字段丢掉', () => {
    const s = migrate({
      version: 1,
      activeId: 'p1',
      profiles: [
        {
          id: 'p1',
          nickname: '小明',
          grade: 5,
          stars: 'lots',
          totalChars: -3,
          bestSpeedLevel: 9,
          skinsOwned: ['monkey', 3],
          skinWorn: 'rocket',
          bookProgress: { xiyouji: { done: ['c1-1', 2], lastSegment: 'c1-1', updatedAt: 5 }, bad: 'x' },
          keyErrors: { a: 2, b: 'x' },
          daily: { '2026-11-09': { minutes: 3, chars: 10, segments: 1 }, nonsense: { minutes: 1 } },
          settings: { sound: 'yes', dailyLimitMin: 30 },
          hacked: true,
        },
      ],
    });
    const p = activeProfile(s);
    expect(p.stars).toBe(0);
    expect(p.totalChars).toBe(0);
    expect(p.bestSpeedLevel).toBe(0);
    expect(p.skinsOwned).toEqual(['classic', 'monkey']);
    expect(p.skinWorn).toBe('classic');
    expect(p.bookProgress).toEqual({ xiyouji: { done: ['c1-1'], lastSegment: 'c1-1', updatedAt: 5 } });
    expect(p.keyErrors).toEqual({ a: 2 });
    expect(p.daily).toEqual({ '2026-11-09': { minutes: 3, chars: 10, segments: 1 } });
    expect(p.settings).toEqual({ dailyLimitMin: 30, sound: true, showPinyin: true });
    expect('hacked' in p).toBe(false);
  });

  it('重复的档案编号会改开', () => {
    const s = migrate({ version: 1, activeId: 'p1', profiles: [{ id: 'p1', nickname: 'A', grade: 5 }, { id: 'p1', nickname: 'B', grade: 5 }] });
    expect(new Set(s.profiles.map((p) => p.id)).size).toBe(2);
  });

  it('自己导入的文章：格式不对的丢掉', () => {
    const good = { id: 'my-1', title: '小猫', segments: [{ id: 's1', title: '第 1 段', tokens: [{ kind: 'hanzi', char: '猫', key: 'mao', tone: 'māo' }] }] };
    const bad = { id: 'my-2', title: '坏', segments: [{ id: 's1', title: '第 1 段', tokens: [{ kind: 'hanzi', char: '猫', key: 'MAO!', tone: '' }] }] };
    const notMine = { ...good, id: 'xiyouji' };
    const s = migrate({ version: 1, activeId: 'p1', profiles: [{ id: 'p1', nickname: 'A', grade: 5 }], customBooks: [good, bad, notMine] });
    expect(s.customBooks.map((b) => b.id)).toEqual(['my-1']);
  });
});

describe('导入文章和备份', () => {
  const book = { id: 'my-abc', title: '小猫', segments: [] } as unknown as Book;

  it('加文章和删文章', () => {
    const s = addCustomBook(defaultStore(), book);
    expect(s.customBooks).toHaveLength(1);
    expect(removeCustomBook(s, 'my-abc').customBooks).toHaveLength(0);
  });

  it('导出再导入，内容不变', () => {
    const s = setupChild(defaultStore(), { nickname: '小刚', grade: 6, avatar: 'blue' });
    expect(parseBackup(exportStore(s))).toEqual(s);
  });

  it('坏的备份给出原因', () => {
    expect(() => parseBackup('not json')).toThrow('读不出内容');
    expect(() => parseBackup('{"version":1}')).toThrow('格式不对');
    expect(() => parseBackup('{"version":2,"profiles":[]}')).toThrow('更新版本');
  });

  it('导入的备份算已经建过档', () => {
    const fresh = { ...defaultStore(), setupDone: false };
    expect(parseBackup(exportStore(fresh)).setupDone).toBe(true);
  });
});
