# 计划 2：奖励与皮肤 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 孩子打字能赢皮肤和徽章：每累计 500 字解锁小皮肤，读完一本书或速度升级解锁大皮肤，可以在衣橱里换装，键宝在各页面穿着选好的皮肤。

**Architecture:** 奖励规则写成纯函数（`src/rewards/`），依赖档案和书库，不依赖界面。奖励在打完一段保存成绩时就判断并写入档案，结果放在 `SegmentResult.unlocks` 上，结算页只负责庆祝，所以孩子不进结算页也不会丢奖励。键宝用分层 SVG 换装。

**Tech Stack:** 沿用计划 1：Vite、React 19、TypeScript、Vitest + Testing Library。

**设计依据:** `docs/superpowers/specs/2026-11-09-kids-typing-design.md` 第 6 节；视觉稿 https://claude.ai/artifact/7YWKQKkXZvTSFnaS8UStKe 的「皮肤衣橱」页。

**本计划做的决定:**
- 重打同一段会再得星星和字数，「再练一次」后小考考也能再答。接受：星星目前不能兑换任何东西，字数来自真实练习，速度等级有 30 字和 90% 正确率的门槛，所以刷不出皮肤。
- 徽章先做 15 枚（现在就能获得的）。设计里的 30 枚，其余的随计划 3、4 的指法关卡和各书章节补齐。
- 今日任务先用现有功能：打一段、打满 100 字、答对一道小考考。计划 3 再加指法和游戏任务。

---

## 文件结构

```
src/rewards/config.ts        可调参数（500 字步长、速度门槛）
src/rewards/skins.ts         18 套皮肤目录
src/rewards/badges.ts        徽章目录
src/rewards/rewards.ts       奖励判断：速度等级、皮肤、徽章、下一个目标
src/rewards/dailyTasks.ts    今日任务、连续天数
src/ui/mascotLayers.tsx      键宝的配饰图层
src/ui/Mascot.tsx            （改）按 skinId 换装
src/ui/WornMascot.tsx        穿着孩子选好皮肤的键宝
src/pages/Wardrobe.tsx + .css  皮肤衣橱
```

---

### Task 1: 引擎记录最长连对，成绩带上奖励

**Files:**
- Modify: `src/engine/types.ts`, `src/engine/session.ts`, `src/engine/stats.ts`
- Test: `src/engine/session.test.ts`, `src/engine/stats.test.ts`, 以及 `src/storage/profile.test.ts`、`src/pages/Result.test.tsx` 的测试数据

- [ ] **Step 1: 写失败的测试**

在 `src/engine/session.test.ts` 的 `describe('press', ...)` 里加：

```ts
  it('记录这一段最长的连对', () => {
    let s = typeAll(createSession(TOKENS), 'nih');
    s = press(s, 'x', 1000).session;
    s = press(s, 'a', 1100).session;
    expect(s.streak).toBe(1);
    expect(s.maxStreak).toBe(3);
  });
```

在 `src/engine/stats.test.ts` 的 `buildResult` 测试末尾加：

```ts
    expect(r.maxStreak).toBe(6);
```

- [ ] **Step 2: 运行，确认失败**

Run: `npx vitest run src/engine/session.test.ts src/engine/stats.test.ts`
Expected: 2 个新断言 FAIL

- [ ] **Step 3: 实现**

`src/engine/types.ts`，在 `streak: number;` 下面加：

```ts
  /** 这一段里最长连对了多少个字母 */
  maxStreak: number;
```

`src/engine/session.ts`：`createSession` 的返回对象里，`streak: 0,` 下面加 `maxStreak: 0,`。`press` 按对的分支里，`streak: s.streak + 1,` 下面加：

```ts
      maxStreak: Math.max(s.maxStreak, s.streak + 1),
```

`src/engine/stats.ts`：在 `export type SegmentResult` 前面加：

```ts
export type Unlocks = { skins: string[]; badges: string[]; speedLevel: number | null };
```

`SegmentResult` 里，`topErrors` 下面加：

```ts
  maxStreak: number;
  /** 这一段新解锁的奖励，保存成绩时填入 */
  unlocks?: Unlocks;
```

`buildResult` 的返回对象里，`topErrors: topErrorKeys(s.errorsByKey),` 下面加 `maxStreak: s.maxStreak,`。

`src/storage/profile.test.ts` 和 `src/pages/Result.test.tsx` 的 `RESULT` 常量里，各加一行 `maxStreak: 0,`。

- [ ] **Step 4: 运行，确认通过**

Run: `npm test` 和 `npx tsc --noEmit; echo "tsc exit: $?"`
Expected: 全部 PASS，`tsc exit: 0`

- [ ] **Step 5: 提交**

```bash
git add src/engine/types.ts src/engine/session.ts src/engine/stats.ts src/engine/session.test.ts src/engine/stats.test.ts src/storage/profile.test.ts src/pages/Result.test.tsx
git commit -m "feat: 记录最长连对，成绩可以带上解锁的奖励"
```

---

### Task 2: 皮肤和徽章目录

**Files:**
- Create: `src/rewards/config.ts`, `src/rewards/skins.ts`, `src/rewards/badges.ts`
- Test: `src/rewards/catalog.test.ts`

- [ ] **Step 1: 写失败的测试 `src/rewards/catalog.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { getBook } from '../content/library';
import { SHELF } from '../content/shelf';
import { BADGES } from './badges';
import { SPEED_LEVELS } from './config';
import { SKINS, SMALL_SKIN_ORDER, skinById } from './skins';

describe('皮肤目录', () => {
  it('8 个小皮肤、6 个读书大皮肤、4 个速度大皮肤', () => {
    const count = (kind: string) => SKINS.filter((s) => s.kind === kind).length;
    expect([count('small'), count('book'), count('speed')]).toEqual([8, 6, 4]);
  });

  it('id 不重复', () => {
    expect(new Set(SKINS.map((s) => s.id)).size).toBe(SKINS.length);
  });

  it('解锁顺序里的都是小皮肤', () => {
    for (const id of SMALL_SKIN_ORDER) expect(skinById(id).kind).toBe('small');
  });

  it('速度等级对应的皮肤都存在', () => {
    for (const l of SPEED_LEVELS) expect(skinById(l.skinId).id).toBe(l.skinId);
  });

  it('读书大皮肤都对应书架上的书', () => {
    for (const s of SKINS.filter((x) => x.kind === 'book')) {
      expect(SHELF.some((b) => b.skinId === s.id)).toBe(true);
    }
  });

  it('已上线的书，皮肤都在目录里', () => {
    for (const b of SHELF.filter((x) => getBook(x.id))) {
      expect(SKINS.some((s) => s.id === b.skinId)).toBe(true);
    }
  });

  it('找不到时退回经典键宝', () => {
    expect(skinById('nope').id).toBe('classic');
  });
});

describe('徽章目录', () => {
  it('id 不重复', () => {
    expect(new Set(BADGES.map((b) => b.id)).size).toBe(BADGES.length);
  });
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `npx vitest run src/rewards/catalog.test.ts`
Expected: FAIL，提示找不到 `./badges`

- [ ] **Step 3: 写 `src/rewards/config.ts`**

```ts
/** 累计打字量每满这么多字，解锁下一个小皮肤 */
export const SMALL_SKIN_STEP = 500;

export const SPEED_LEVELS = [
  { level: 1, name: '小兔', minSpeed: 20, skinId: 'bunny' },
  { level: 2, name: '骏马', minSpeed: 30, skinId: 'horse' },
  { level: 3, name: '猎豹', minSpeed: 40, skinId: 'cheetah' },
  { level: 4, name: '火箭', minSpeed: 50, skinId: 'rocket' },
] as const;

/** 一段至少这么多字，才能认定速度等级 */
export const SPEED_MIN_HANZI = 30;
export const SPEED_MIN_ACCURACY = 90;

export const DAILY_CHAR_GOAL = 100;
export const DAILY_TASK_BONUS = 3;
```

- [ ] **Step 4: 写 `src/rewards/skins.ts`**

```ts
import { SMALL_SKIN_STEP } from './config';

export type SkinKind = 'small' | 'book' | 'speed';
export type Layer =
  | 'scarf' | 'glasses' | 'hat' | 'bow' | 'monkey' | 'beret' | 'leaf'
  | 'guan' | 'fan' | 'headband' | 'scroll' | 'bunny' | 'knight' | 'spots' | 'astro';

export type Skin = { id: string; name: string; kind: SkinKind; cond: string; body: string; face: string; layers: Layer[] };

const YELLOW = { body: '#FFC93C', face: '#FFE08A' };

/** 小皮肤按这个顺序解锁，第 n 个需要累计 n × 500 字 */
export const SMALL_SKIN_ORDER = ['scarf', 'mint', 'glasses', 'straw', 'sky', 'bow', 'berry'];

const chars = (id: string) => `累计 ${(SMALL_SKIN_ORDER.indexOf(id) + 1) * SMALL_SKIN_STEP} 字`;

export const SKINS: Skin[] = [
  { id: 'classic', name: '经典键宝', kind: 'small', cond: '一开始就有', ...YELLOW, layers: [] },
  { id: 'scarf', name: '红围巾', kind: 'small', cond: chars('scarf'), ...YELLOW, layers: ['scarf'] },
  { id: 'mint', name: '薄荷键宝', kind: 'small', cond: chars('mint'), body: '#34C38F', face: '#BFF0DA', layers: [] },
  { id: 'glasses', name: '圆圆眼镜', kind: 'small', cond: chars('glasses'), ...YELLOW, layers: ['glasses'] },
  { id: 'straw', name: '小草帽', kind: 'small', cond: chars('straw'), ...YELLOW, layers: ['hat'] },
  { id: 'sky', name: '天空键宝', kind: 'small', cond: chars('sky'), body: '#6FB1FF', face: '#CFE6FF', layers: [] },
  { id: 'bow', name: '蝴蝶结', kind: 'small', cond: chars('bow'), ...YELLOW, layers: ['bow'] },
  { id: 'berry', name: '草莓键宝', kind: 'small', cond: chars('berry'), body: '#FF9FB2', face: '#FFD6DE', layers: [] },
  { id: 'archer', name: '后羿小射手', kind: 'book', cond: '读完《中国古代神话》', ...YELLOW, layers: ['leaf'] },
  { id: 'painter', name: '神笔小画家', kind: 'book', cond: '读完《中国民间故事》', ...YELLOW, layers: ['beret'] },
  { id: 'monkey', name: '美猴王', kind: 'book', cond: '读完《西游记》', body: '#F2A93B', face: '#FFE3B8', layers: ['monkey'] },
  { id: 'strategist', name: '卧龙军师', kind: 'book', cond: '读完《三国演义》', body: '#6FB1FF', face: '#DCEBFF', layers: ['guan', 'fan'] },
  { id: 'hero', name: '梁山好汉', kind: 'book', cond: '读完《水浒传》', body: '#34C38F', face: '#DDF5EA', layers: ['headband'] },
  { id: 'poet', name: '小诗仙', kind: 'book', cond: '读完古诗词小站', body: '#FFF3C4', face: '#FFFFFF', layers: ['guan', 'scroll'] },
  { id: 'bunny', name: '小兔骑士', kind: 'speed', cond: '速度到 20 字/分', body: '#FFFFFF', face: '#FFF3C4', layers: ['bunny'] },
  { id: 'horse', name: '骏马骑士', kind: 'speed', cond: '速度到 30 字/分', ...YELLOW, layers: ['knight'] },
  { id: 'cheetah', name: '猎豹闪电', kind: 'speed', cond: '速度到 40 字/分', body: '#F2A93B', face: '#FFE3B8', layers: ['spots'] },
  { id: 'rocket', name: '火箭飞行员', kind: 'speed', cond: '速度到 50 字/分', body: '#F1F3F8', face: '#FFFFFF', layers: ['astro'] },
];

export function skinById(id: string): Skin {
  return SKINS.find((s) => s.id === id) ?? SKINS[0];
}
```

- [ ] **Step 5: 写 `src/rewards/badges.ts`**

```ts
export type Badge = { id: string; name: string; desc: string };

export const BADGES: Badge[] = [
  { id: 'first', name: '初次上手', desc: '打完第一段' },
  { id: 'perfect', name: '一个不错', desc: '30 字以上的一段全对' },
  { id: 'streak-50', name: '连对 50', desc: '一段里连续按对 50 个键' },
  { id: 'chars-1000', name: '千字小将', desc: '累计打 1000 字' },
  { id: 'chars-5000', name: '五千字达人', desc: '累计打 5000 字' },
  { id: 'chars-10000', name: '万字大师', desc: '累计打 10000 字' },
  { id: 'days-3', name: '坚持 3 天', desc: '连续 3 天练习' },
  { id: 'days-7', name: '坚持 7 天', desc: '连续 7 天练习' },
  { id: 'book-1', name: '读完 1 本', desc: '读完一整本书' },
  { id: 'book-3', name: '读完 3 本', desc: '读完三本书' },
  { id: 'speed-1', name: '小兔速度', desc: '速度到 20 字/分' },
  { id: 'speed-2', name: '骏马速度', desc: '速度到 30 字/分' },
  { id: 'speed-3', name: '猎豹速度', desc: '速度到 40 字/分' },
  { id: 'speed-4', name: '火箭速度', desc: '速度到 50 字/分' },
  { id: 'huaguoshan', name: '花果山', desc: '打完《西游记》第一回' },
];
```

- [ ] **Step 6: 运行，确认通过**

Run: `npx vitest run src/rewards/catalog.test.ts` 和 `npx tsc --noEmit; echo "tsc exit: $?"`
Expected: PASS（8 个测试），`tsc exit: 0`

- [ ] **Step 7: 提交**

```bash
git add src/rewards
git commit -m "feat: 皮肤和徽章目录"
```

---

### Task 3: 档案支持新皮肤、当天记录

**Files:**
- Modify: `src/storage/profile.ts`, `src/storage/ProfileContext.tsx`
- Test: `src/storage/profile.test.ts`, `src/storage/ProfileContext.test.tsx`

- [ ] **Step 1: 写失败的测试**

`src/storage/profile.test.ts`：在 import 列表里加 `markSkinSeen`、`recordQuizRight`、`wearSkin`。把 `recordSegment` 的两处断言改成：

```ts
    expect(p.daily['2026-11-09']).toEqual({ minutes: 1.5, chars: 52, segments: 1 });
```

```ts
    expect(p.daily['2026-11-09']).toEqual({ minutes: 3, chars: 104, segments: 2 });
```

在文件末尾加：

```ts
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
```

`src/storage/ProfileContext.test.tsx`，在 `describe('ProfileProvider', ...)` 里加：

```tsx
  it('档案没有变化时不写存储', () => {
    function NoChange() {
      const { update } = useProfile();
      return (
        <button type="button" onClick={() => update((p) => p)}>
          不变
        </button>
      );
    }
    render(
      <ProfileProvider storage={localStorage}>
        <NoChange />
      </ProfileProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: '不变' }));
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
```

- [ ] **Step 2: 运行，确认失败**

Run: `npx vitest run src/storage/`
Expected: FAIL

- [ ] **Step 3: 实现 `src/storage/profile.ts`**

把 `DailyLog` 改成：

```ts
export type DailyLog = { minutes: number; chars: number; segments?: number; quizRight?: number; taskBonus?: boolean };
```

`Profile` 里 `skinsOwned: string[];` 下面加 `skinsNew: string[];`。`newProfile` 里 `skinsOwned: ['classic'],` 下面加 `skinsNew: [],`。

`recordSegment` 的 `daily` 字段改成：

```ts
    daily: {
      ...p.daily,
      [date]: {
        ...day,
        minutes: day.minutes + r.activeMs / 60000,
        chars: day.chars + r.hanzi,
        segments: (day.segments ?? 0) + 1,
      },
    },
```

在文件末尾加：

```ts
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
```

- [ ] **Step 4: 实现 `src/storage/ProfileContext.tsx`**

把 `update` 里的这几行：

```tsx
      const store = replaceProfile(prev.store, fn(activeProfile(prev.store)));
```

改成：

```tsx
      const current = activeProfile(prev.store);
      const next = fn(current);
      if (next === current) return prev;
      const store = replaceProfile(prev.store, next);
```

- [ ] **Step 5: 运行，确认通过**

Run: `npm test` 和 `npx tsc --noEmit; echo "tsc exit: $?"`
Expected: 全部 PASS，`tsc exit: 0`

- [ ] **Step 6: 提交**

```bash
git add src/storage
git commit -m "feat: 档案记录新皮肤和当天的段数、答题"
```

---

### Task 4: 奖励规则和今日任务

**Files:**
- Create: `src/rewards/dailyTasks.ts`, `src/rewards/rewards.ts`
- Test: `src/rewards/dailyTasks.test.ts`, `src/rewards/rewards.test.ts`

- [ ] **Step 1: 写失败的测试 `src/rewards/dailyTasks.test.ts`**

```ts
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
```

- [ ] **Step 2: 运行，确认失败**

Run: `npx vitest run src/rewards/dailyTasks.test.ts`
Expected: FAIL，提示找不到 `./dailyTasks`

- [ ] **Step 3: 写 `src/rewards/dailyTasks.ts`**

```ts
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
```

- [ ] **Step 4: 运行，确认通过**

Run: `npx vitest run src/rewards/dailyTasks.test.ts`
Expected: PASS（10 个测试）

- [ ] **Step 5: 写失败的测试 `src/rewards/rewards.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import type { SegmentResult } from '../engine/stats';
import { type Profile, newProfile } from '../storage/profile';
import { finishedBookIds, nextSmallSkin, nextSpeedLevel, smallSkinsFor, speedLevelOf, syncRewards } from './rewards';

const DATE = '2026-11-09';
const base = newProfile('p1', '小明', 5);
const result = (over: Partial<SegmentResult> = {}): SegmentResult => ({
  bookId: 'xiyouji',
  segmentId: 'c1-1',
  hanzi: 52,
  speed: 10,
  accuracy: 80,
  stars: 1,
  activeMs: 60000,
  keyErrors: {},
  topErrors: [],
  maxStreak: 5,
  ...over,
});
const ALL = ['c1-1', 'c1-2', 'c1-3', 'c1-4'];
const finished = (p: Profile): Profile => ({ ...p, bookProgress: { xiyouji: { done: ALL, lastSegment: 'c1-4', updatedAt: 1 } } });

describe('speedLevelOf', () => {
  it('按速度门槛定等级', () => {
    expect(speedLevelOf(result({ speed: 19, accuracy: 95 }))).toBe(0);
    expect(speedLevelOf(result({ speed: 20, accuracy: 95 }))).toBe(1);
    expect(speedLevelOf(result({ speed: 35, accuracy: 95 }))).toBe(2);
    expect(speedLevelOf(result({ speed: 50, accuracy: 95 }))).toBe(4);
  });

  it('字数不够或正确率不够都不算', () => {
    expect(speedLevelOf(result({ speed: 60, accuracy: 95, hanzi: 29 }))).toBe(0);
    expect(speedLevelOf(result({ speed: 60, accuracy: 89 }))).toBe(0);
  });
});

describe('smallSkinsFor', () => {
  it('每 500 字解锁一个，经典键宝一开始就有', () => {
    expect(smallSkinsFor(499)).toEqual(['classic']);
    expect(smallSkinsFor(500)).toEqual(['classic', 'scarf']);
    expect(smallSkinsFor(1000)).toEqual(['classic', 'scarf', 'mint']);
  });

  it('全部解锁后不再增加', () => {
    expect(smallSkinsFor(99999)).toHaveLength(8);
  });
});

describe('finishedBookIds', () => {
  it('所有段落都打完才算读完', () => {
    expect(finishedBookIds(finished(base))).toEqual(['xiyouji']);
    expect(finishedBookIds({ ...base, bookProgress: { xiyouji: { done: ['c1-1'], lastSegment: 'c1-1', updatedAt: 1 } } })).toEqual([]);
  });
});

describe('syncRewards', () => {
  it('打满 500 字解锁红围巾，并标记为新皮肤', () => {
    const { profile, unlocks } = syncRewards({ ...base, totalChars: 500 }, undefined, DATE);
    expect(unlocks.skins).toEqual(['scarf']);
    expect(profile.skinsOwned).toContain('scarf');
    expect(profile.skinsNew).toEqual(['scarf']);
  });

  it('读完一本书解锁对应的大皮肤', () => {
    expect(syncRewards(finished(base), undefined, DATE).unlocks.skins).toContain('monkey');
  });

  it('速度第一次升级解锁速度皮肤', () => {
    const { profile, unlocks } = syncRewards(base, result({ speed: 32, accuracy: 95 }), DATE);
    expect(profile.bestSpeedLevel).toBe(2);
    expect(unlocks.speedLevel).toBe(2);
    expect(unlocks.skins).toEqual(expect.arrayContaining(['bunny', 'horse']));
  });

  it('速度变慢不会降级', () => {
    const { profile, unlocks } = syncRewards({ ...base, bestSpeedLevel: 3 }, result({ speed: 21, accuracy: 95 }), DATE);
    expect(profile.bestSpeedLevel).toBe(3);
    expect(unlocks.speedLevel).toBeNull();
  });

  it('已拥有的不重复解锁', () => {
    const once = syncRewards({ ...base, totalChars: 500 }, undefined, DATE).profile;
    const again = syncRewards(once, undefined, DATE);
    expect(again.unlocks.skins).toEqual([]);
    expect(again.profile).toBe(once);
  });

  it('按成绩发徽章', () => {
    const p = { ...base, totalChars: 52 };
    const { unlocks } = syncRewards(p, result({ accuracy: 100, maxStreak: 50 }), DATE);
    expect(unlocks.badges).toEqual(expect.arrayContaining(['first', 'perfect', 'streak-50']));
  });

  it('打完第一回得花果山徽章，读完整本得读完 1 本', () => {
    const { unlocks } = syncRewards(finished(base), undefined, DATE);
    expect(unlocks.badges).toEqual(expect.arrayContaining(['huaguoshan', 'book-1']));
  });

  it('连续 3 天得徽章', () => {
    const day = { minutes: 1, chars: 10 };
    const p = { ...base, daily: { '2026-11-07': day, '2026-11-08': day, [DATE]: day } };
    expect(syncRewards(p, undefined, DATE).unlocks.badges).toContain('days-3');
  });
});

describe('下一个目标', () => {
  it('下一个小皮肤和还差的字数', () => {
    expect(nextSmallSkin(374)).toEqual({ skinId: 'scarf', remaining: 126, percent: 75 });
    expect(nextSmallSkin(500)).toEqual({ skinId: 'mint', remaining: 500, percent: 0 });
  });

  it('全部解锁后没有下一个', () => {
    expect(nextSmallSkin(99999)).toBeNull();
  });

  it('下一个速度等级', () => {
    expect(nextSpeedLevel(0)?.name).toBe('小兔');
    expect(nextSpeedLevel(1)?.name).toBe('骏马');
    expect(nextSpeedLevel(4)).toBeNull();
  });
});
```

- [ ] **Step 6: 运行，确认失败**

Run: `npx vitest run src/rewards/rewards.test.ts`
Expected: FAIL，提示找不到 `./rewards`

- [ ] **Step 7: 写 `src/rewards/rewards.ts`**

```ts
import { getBook } from '../content/library';
import type { SegmentResult, Unlocks } from '../engine/stats';
import { type Profile, today } from '../storage/profile';
import { BADGES } from './badges';
import { SMALL_SKIN_STEP, SPEED_LEVELS, SPEED_MIN_ACCURACY, SPEED_MIN_HANZI } from './config';
import { streakDays } from './dailyTasks';
import { SKINS, SMALL_SKIN_ORDER } from './skins';

type Level = Profile['bestSpeedLevel'];

export function speedLevelOf(r: Pick<SegmentResult, 'hanzi' | 'accuracy' | 'speed'>): Level {
  if (r.hanzi < SPEED_MIN_HANZI || r.accuracy < SPEED_MIN_ACCURACY) return 0;
  let level: Level = 0;
  for (const l of SPEED_LEVELS) if (r.speed >= l.minSpeed) level = l.level;
  return level;
}

export function smallSkinsFor(totalChars: number): string[] {
  return ['classic', ...SMALL_SKIN_ORDER.slice(0, Math.floor(totalChars / SMALL_SKIN_STEP))];
}

export function finishedBookIds(p: Profile): string[] {
  return Object.entries(p.bookProgress)
    .filter(([id, progress]) => {
      const book = getBook(id);
      return book !== null && book.segments.every((s) => progress.done.includes(s.id));
    })
    .map(([id]) => id);
}

function skinsEarned(p: Profile): string[] {
  const books = finishedBookIds(p)
    .map((id) => getBook(id)?.skinId ?? '')
    .filter((id) => SKINS.some((s) => s.id === id));
  const speed = SPEED_LEVELS.filter((l) => l.level <= p.bestSpeedLevel).map((l) => l.skinId as string);
  return [...smallSkinsFor(p.totalChars), ...books, ...speed];
}

function badgesEarned(p: Profile, r: SegmentResult | undefined, date: string): string[] {
  const books = finishedBookIds(p).length;
  const days = streakDays(p.daily, date);
  const chapter1 = getBook('xiyouji')?.segments.filter((s) => s.id.startsWith('c1-')) ?? [];
  const done = p.bookProgress.xiyouji?.done ?? [];
  const earned: Record<string, boolean> = {
    first: p.totalChars > 0,
    perfect: r !== undefined && r.accuracy === 100 && r.hanzi >= SPEED_MIN_HANZI,
    'streak-50': r !== undefined && r.maxStreak >= 50,
    'chars-1000': p.totalChars >= 1000,
    'chars-5000': p.totalChars >= 5000,
    'chars-10000': p.totalChars >= 10000,
    'days-3': days >= 3,
    'days-7': days >= 7,
    'book-1': books >= 1,
    'book-3': books >= 3,
    'speed-1': p.bestSpeedLevel >= 1,
    'speed-2': p.bestSpeedLevel >= 2,
    'speed-3': p.bestSpeedLevel >= 3,
    'speed-4': p.bestSpeedLevel >= 4,
    huaguoshan: chapter1.length > 0 && chapter1.every((s) => done.includes(s.id)),
  };
  return BADGES.filter((b) => earned[b.id]).map((b) => b.id);
}

/** 按档案（和这一段的成绩）补发该得的奖励。没有新奖励时返回原来的档案对象。 */
export function syncRewards(p: Profile, r?: SegmentResult, date = today()): { profile: Profile; unlocks: Unlocks } {
  const reached = r ? speedLevelOf(r) : 0;
  const level = Math.max(p.bestSpeedLevel, reached) as Level;
  const leveled = level === p.bestSpeedLevel ? p : { ...p, bestSpeedLevel: level };
  const skins = skinsEarned(leveled).filter((id) => !p.skinsOwned.includes(id));
  const badges = badgesEarned(leveled, r, date).filter((id) => !p.badges.includes(id));
  const unlocks: Unlocks = { skins, badges, speedLevel: level > p.bestSpeedLevel ? level : null };
  if (leveled === p && skins.length === 0 && badges.length === 0) return { profile: p, unlocks };
  return {
    profile: {
      ...leveled,
      skinsOwned: [...p.skinsOwned, ...skins],
      skinsNew: [...p.skinsNew, ...skins],
      badges: [...p.badges, ...badges],
    },
    unlocks,
  };
}

export function nextSmallSkin(totalChars: number): { skinId: string; remaining: number; percent: number } | null {
  const index = Math.floor(totalChars / SMALL_SKIN_STEP);
  if (index >= SMALL_SKIN_ORDER.length) return null;
  const into = totalChars % SMALL_SKIN_STEP;
  return { skinId: SMALL_SKIN_ORDER[index], remaining: SMALL_SKIN_STEP - into, percent: Math.round((into * 100) / SMALL_SKIN_STEP) };
}

export function nextSpeedLevel(best: number) {
  return SPEED_LEVELS.find((l) => l.level === best + 1) ?? null;
}
```

- [ ] **Step 8: 运行，确认通过**

Run: `npm test` 和 `npx tsc --noEmit; echo "tsc exit: $?"`
Expected: 全部 PASS，`tsc exit: 0`

- [ ] **Step 9: 提交**

```bash
git add src/rewards
git commit -m "feat: 奖励规则（皮肤、徽章、速度等级）和今日任务"
```

---

### Task 5: 键宝换装

**Files:**
- Create: `src/ui/mascotLayers.tsx`, `src/ui/WornMascot.tsx`
- Modify: `src/ui/Mascot.tsx`
- Test: `src/ui/basics.test.tsx`

- [ ] **Step 1: 写失败的测试**

在 `src/ui/basics.test.tsx` 的 `describe('Mascot', ...)` 里加：

```tsx
  it('按皮肤换身体颜色和配饰', () => {
    const { container } = render(<Mascot skinId="scarf" />);
    expect(container.querySelector('[data-layer="scarf"]')).toBeInTheDocument();
    expect(container.querySelector('[data-part="body"]')).toHaveAttribute('fill', '#FFC93C');
  });

  it('换颜色的皮肤没有配饰', () => {
    const { container } = render(<Mascot skinId="mint" />);
    expect(container.querySelector('[data-part="body"]')).toHaveAttribute('fill', '#34C38F');
    expect(container.querySelector('[data-layer]')).toBeNull();
  });

  it('戴帽子时不显示天线', () => {
    const { container } = render(<Mascot skinId="straw" />);
    expect(container.querySelector('[data-part="antenna"]')).toBeNull();
  });

  it('每套皮肤都画得出来', () => {
    for (const s of SKINS) {
      const { container, unmount } = render(<Mascot skinId={s.id} />);
      for (const layer of s.layers) expect(container.querySelector(`[data-layer="${layer}"]`)).toBeInTheDocument();
      unmount();
    }
  });
```

并在文件顶部加 `import { SKINS } from '../rewards/skins';`。

- [ ] **Step 2: 运行，确认失败**

Run: `npx vitest run src/ui/basics.test.tsx`
Expected: 新测试 FAIL

- [ ] **Step 3: 写 `src/ui/mascotLayers.tsx`**

```tsx
import type { ReactNode } from 'react';
import type { Layer } from '../rewards/skins';

const INK = '#1F2A44';

/** 画在身体后面的配饰 */
export const BEHIND_LAYERS: Partial<Record<Layer, ReactNode>> = {
  bunny: (
    <g data-layer="bunny">
      <ellipse cx="44" cy="2" rx="10" ry="24" fill="#FFFFFF" stroke={INK} strokeWidth="4" />
      <ellipse cx="44" cy="4" rx="4" ry="15" fill="#FF9FB2" />
      <ellipse cx="76" cy="2" rx="10" ry="24" fill="#FFFFFF" stroke={INK} strokeWidth="4" />
      <ellipse cx="76" cy="4" rx="4" ry="15" fill="#FF9FB2" />
    </g>
  ),
};

/** 画在身体前面的配饰 */
export const FRONT_LAYERS: Partial<Record<Layer, ReactNode>> = {
  spots: (
    <g data-layer="spots" fill="#8A5A1E">
      <ellipse cx="30" cy="97" rx="5" ry="3.5" />
      <ellipse cx="54" cy="99" rx="4" ry="3" />
      <ellipse cx="80" cy="97" rx="5" ry="3.5" />
      <ellipse cx="19" cy="62" rx="3" ry="5" />
      <ellipse cx="101" cy="62" rx="3" ry="5" />
    </g>
  ),
  glasses: (
    <g data-layer="glasses" fill="none" stroke={INK} strokeWidth="3.5">
      <circle cx="46" cy="52" r="12" />
      <circle cx="74" cy="52" r="12" />
      <path d="M58 52 H62" />
    </g>
  ),
  scarf: (
    <g data-layer="scarf" stroke={INK} strokeWidth="4" strokeLinejoin="round" fill="#E8483B">
      <path d="M16 84 H104 V96 H16 Z" />
      <path d="M76 94 L84 114 L94 110 L88 94" />
    </g>
  ),
  hat: (
    <g data-layer="hat" stroke={INK} strokeWidth="4" strokeLinejoin="round">
      <path d="M34 26 Q36 2 60 2 Q84 2 86 26 Z" fill="#F4D27A" />
      <path d="M36 15 H84 V22 H35 Z" fill="#E8483B" strokeWidth="3" />
      <ellipse cx="60" cy="26" rx="54" ry="9" fill="#F4D27A" />
    </g>
  ),
  bow: (
    <g data-layer="bow" fill="#FF5C8A" stroke={INK} strokeWidth="3.5" strokeLinejoin="round">
      <path d="M92 20 L76 8 L76 32 Z" />
      <path d="M92 20 L108 8 L108 32 Z" />
      <circle cx="92" cy="20" r="5" />
    </g>
  ),
  monkey: (
    <g data-layer="monkey">
      <circle cx="10" cy="58" r="11" fill="#F2C4A0" stroke={INK} strokeWidth="4" />
      <circle cx="110" cy="58" r="11" fill="#F2C4A0" stroke={INK} strokeWidth="4" />
      <g fill="none" strokeLinecap="round">
        <path d="M18 38 Q60 26 102 38" stroke={INK} strokeWidth="12" />
        <path d="M18 38 Q60 26 102 38" stroke="#F4B400" strokeWidth="6" />
      </g>
    </g>
  ),
  beret: (
    <g data-layer="beret">
      <ellipse cx="56" cy="22" rx="36" ry="12" fill="#6A4DE8" stroke={INK} strokeWidth="4" transform="rotate(-8 56 22)" />
      <rect x="52" y="4" width="6" height="9" rx="3" fill={INK} />
      <path d="M106 66 L118 38" stroke="#8A5A1E" strokeWidth="5" strokeLinecap="round" />
      <circle cx="119" cy="35" r="4.5" fill="#E8483B" stroke={INK} strokeWidth="2" />
    </g>
  ),
  leaf: (
    <g data-layer="leaf" fill="#34C38F" stroke={INK} strokeWidth="3">
      <path d="M28 28 H92" stroke="#2BA57A" strokeWidth="6" strokeLinecap="round" fill="none" />
      <ellipse cx="44" cy="16" rx="6" ry="12" transform="rotate(-28 44 16)" />
      <ellipse cx="60" cy="12" rx="6" ry="13" />
      <ellipse cx="76" cy="16" rx="6" ry="12" transform="rotate(28 76 16)" />
    </g>
  ),
  guan: (
    <g data-layer="guan" stroke={INK} strokeWidth="4" strokeLinejoin="round">
      <path d="M32 26 V8 Q60 -4 88 8 V26 Z" fill="#2B3F6B" />
      <path d="M32 26 H88" strokeWidth="6" />
      <path d="M30 26 L20 40 M90 26 L100 40" strokeLinecap="round" />
    </g>
  ),
  fan: (
    <g data-layer="fan" stroke={INK} strokeWidth="3" strokeLinejoin="round">
      <path d="M112 42 L100 18 Q112 10 126 16 Z" fill="#FFFFFF" />
      <path d="M112 42 L113 16 M112 42 L120 14" fill="none" />
      <path d="M112 42 L110 58" strokeWidth="5" strokeLinecap="round" />
    </g>
  ),
  headband: (
    <g data-layer="headband" stroke={INK} strokeWidth="4" strokeLinejoin="round" fill="#E8483B">
      <path d="M15 34 Q60 24 105 34 V44 Q60 34 15 44 Z" />
      <path d="M104 38 L120 30 L118 44 Z" />
    </g>
  ),
  scroll: (
    <g data-layer="scroll" stroke={INK} strokeWidth="3" strokeLinejoin="round">
      <rect x="104" y="20" width="20" height="30" fill="#FFF3C4" />
      <path d="M100 20 H128 M100 50 H128" strokeWidth="5" strokeLinecap="round" />
    </g>
  ),
  knight: (
    <g data-layer="knight" stroke={INK} strokeLinejoin="round">
      <path d="M60 12 Q66 -12 88 -16 Q78 0 70 12 Z" fill="#E8483B" strokeWidth="3.5" />
      <path d="M16 40 V36 Q16 12 60 12 Q104 12 104 36 V40 Z" fill="#C9D3E3" strokeWidth="4" />
      <path d="M30 30 H90" strokeWidth="3" fill="none" />
    </g>
  ),
  astro: (
    <g data-layer="astro">
      <circle cx="60" cy="58" r="60" fill="#DCEBFF" fillOpacity="0.35" stroke={INK} strokeWidth="4" />
      <path d="M24 34 Q34 12 56 6" fill="none" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" />
    </g>
  ),
};

/** 戴这些配饰时不显示天线 */
export const HEADWEAR: Layer[] = ['hat', 'beret', 'leaf', 'guan', 'knight', 'astro'];
```

- [ ] **Step 4: 替换 `src/ui/Mascot.tsx`**

```tsx
import { skinById } from '../rewards/skins';
import { BEHIND_LAYERS, FRONT_LAYERS, HEADWEAR } from './mascotLayers';

type Props = {
  size?: number;
  mood?: 'happy' | 'oops' | 'cheer';
  label?: string;
  skinId?: string;
};

const INK = '#1F2A44';

export default function Mascot({ size = 120, mood = 'happy', label = '键宝', skinId = 'classic' }: Props) {
  const skin = skinById(skinId);
  const up = mood === 'cheer';
  const hasHeadwear = skin.layers.some((l) => HEADWEAR.includes(l));
  return (
    <svg width={size} height={size} viewBox="-12 -26 144 146" role="img" aria-label={label} data-mood={mood}>
      <ellipse cx="60" cy="113" rx="34" ry="5" fill={INK} opacity="0.18" />
      {skin.layers.map((l) => (
        <g key={l}>{BEHIND_LAYERS[l]}</g>
      ))}
      <path d={up ? 'M16 60 Q4 50 10 36' : 'M16 72 Q4 66 7 54'} fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" />
      <path d={up ? 'M104 60 Q116 50 110 36' : 'M104 64 Q118 56 112 40'} fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" />
      <rect x="36" y="99" width="16" height="10" rx="5" fill={INK} />
      <rect x="68" y="99" width="16" height="10" rx="5" fill={INK} />
      {!hasHeadwear && (
        <g data-part="antenna">
          <path d="M60 22 V11" stroke={INK} strokeWidth="4" strokeLinecap="round" />
          <circle cx="60" cy="9" r="6" fill="#FF7A45" stroke={INK} strokeWidth="3.5" />
        </g>
      )}
      <rect data-part="body" x="14" y="22" width="92" height="84" rx="24" fill={skin.body} stroke={INK} strokeWidth="4" />
      <rect x="24" y="28" width="72" height="60" rx="18" fill={skin.face} />
      {up ? (
        <>
          <path d="M38 52 Q46 44 54 52" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" />
          <path d="M66 52 Q74 44 82 52" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="46" cy="52" r="7" fill={INK} />
          <circle cx="74" cy="52" r="7" fill={INK} />
          <circle cx="48.5" cy="49.5" r="2.4" fill="#FFFFFF" />
          <circle cx="76.5" cy="49.5" r="2.4" fill="#FFFFFF" />
        </>
      )}
      <ellipse cx="35" cy="65" rx="6" ry="3.5" fill="#FF9A76" />
      <ellipse cx="85" cy="65" rx="6" ry="3.5" fill="#FF9A76" />
      {mood === 'oops' ? (
        <path d="M52 70 Q60 63 68 70" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      ) : (
        <path d="M52 64 Q60 72 68 64" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      )}
      {skin.layers.map((l) => (
        <g key={l}>{FRONT_LAYERS[l]}</g>
      ))}
    </svg>
  );
}
```

- [ ] **Step 5: 写 `src/ui/WornMascot.tsx`**

```tsx
import type { ComponentProps } from 'react';
import { useProfile } from '../storage/ProfileContext';
import Mascot from './Mascot';

/** 穿着孩子选好皮肤的键宝 */
export default function WornMascot(props: Omit<ComponentProps<typeof Mascot>, 'skinId'>) {
  const { profile } = useProfile();
  return <Mascot {...props} skinId={profile.skinWorn} />;
}
```

- [ ] **Step 6: 运行，确认通过**

Run: `npx vitest run src/ui/basics.test.tsx`、`npm test`、`npx tsc --noEmit; echo "tsc exit: $?"`
Expected: 全部 PASS，`tsc exit: 0`

- [ ] **Step 7: 提交**

```bash
git add src/ui/mascotLayers.tsx src/ui/WornMascot.tsx src/ui/Mascot.tsx src/ui/basics.test.tsx
git commit -m "feat: 键宝分层换装"
```

---

### Task 6: 皮肤衣橱页和路由

**Files:**
- Create: `src/pages/Wardrobe.tsx`, `src/pages/Wardrobe.css`
- Modify: `src/router.ts`, `src/App.tsx`
- Test: `src/pages/Wardrobe.test.tsx`, `src/router.test.ts`, `src/App.test.tsx`

- [ ] **Step 1: 写失败的测试 `src/pages/Wardrobe.test.tsx`**

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProfileProvider } from '../storage/ProfileContext';
import { STORAGE_KEY, defaultStore, saveStore } from '../storage/profile';
import Wardrobe from './Wardrobe';

function renderPage() {
  return render(
    <ProfileProvider storage={localStorage}>
      <Wardrobe />
    </ProfileProvider>,
  );
}

const saved = () => JSON.parse(localStorage.getItem(STORAGE_KEY)!).profiles[0];

function seedScarf() {
  const store = defaultStore();
  store.profiles[0].skinsOwned = ['classic', 'scarf'];
  store.profiles[0].skinsNew = ['scarf'];
  saveStore(localStorage, store);
}

describe('Wardrobe', () => {
  it('默认显示正穿着的皮肤和拥有数量', () => {
    renderPage();
    expect(screen.getByText('键宝正穿着它')).toBeInTheDocument();
    expect(screen.getByText('已拥有 1 / 18 套')).toBeInTheDocument();
  });

  it('点没解锁的皮肤显示解锁条件', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: '美猴王：读完《西游记》' }));
    expect(screen.getByText('解锁条件：读完《西游记》')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '穿上它' })).not.toBeInTheDocument();
  });

  it('新皮肤有 NEW 标记，试穿后保存，标记消失', () => {
    seedScarf();
    renderPage();
    expect(screen.getByText('NEW')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '红围巾：已拥有' }));
    expect(screen.queryByText('NEW')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '穿上它' }));
    expect(saved().skinWorn).toBe('scarf');
    expect(saved().skinsNew).toEqual([]);
    expect(screen.getByText('键宝正穿着它')).toBeInTheDocument();
  });

  it('显示离下一个小皮肤还差多少字', () => {
    renderPage();
    expect(screen.getByText('再打 500 字得「红围巾」')).toBeInTheDocument();
  });

  it('返回大厅', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: '← 回大厅' }));
    expect(window.location.hash).toBe('#/');
  });
});
```

在 `src/router.test.ts` 的 `routes` 数组里加 `{ name: 'wardrobe' }`，并在「认识四种页面」的测试里加 `expect(parseHash('#/wardrobe')).toEqual({ name: 'wardrobe' });`。

在 `src/App.test.tsx` 的 `describe('App', ...)` 里加（并在顶部加 `import { STORAGE_KEY, defaultStore, saveStore } from './storage/profile';`）：

```tsx
  it('按地址进入衣橱', () => {
    window.location.hash = '#/wardrobe';
    render(<App />);
    expect(screen.getByRole('heading', { name: '我的衣橱' })).toBeInTheDocument();
  });

  it('打开时给旧存档补发该得的皮肤', () => {
    const store = defaultStore();
    store.profiles[0].bookProgress.xiyouji = { done: ['c1-1', 'c1-2', 'c1-3', 'c1-4'], lastSegment: 'c1-4', updatedAt: 1 };
    saveStore(localStorage, store);
    render(<App />);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).profiles[0].skinsOwned).toContain('monkey');
  });
```

- [ ] **Step 2: 运行，确认失败**

Run: `npx vitest run src/pages/Wardrobe.test.tsx src/router.test.ts src/App.test.tsx`
Expected: FAIL

- [ ] **Step 3: 改 `src/router.ts`**

`Route` 类型加一行 `| { name: 'wardrobe' }`。`parseHash` 里，`if (parts[0] === 'result') ...` 下面加：

```ts
  if (parts[0] === 'wardrobe') return { name: 'wardrobe' };
```

`toHash` 的 `switch` 里加：

```ts
    case 'wardrobe':
      return '#/wardrobe';
```

- [ ] **Step 4: 改 `src/App.tsx`**

加 import：`import Wardrobe from './pages/Wardrobe';` 和 `import { syncRewards } from './rewards/rewards';`。

把 `const { persistent } = useProfile();` 改成 `const { persistent, update } = useProfile();`，并在它下面加：

```tsx
  useEffect(() => {
    update((p) => syncRewards(p).profile);
  }, [update]);
```

路由分发里，`{route.name === 'result' && <Result />}` 下面加 `{route.name === 'wardrobe' && <Wardrobe />}`。

- [ ] **Step 5: 写 `src/pages/Wardrobe.css`**

```css
.wardrobe-title { font-size: 46px; }
.wardrobe-rules { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; }
.rule-card { padding: 18px 20px; display: flex; flex-direction: column; gap: 10px; }
.rule-title { font-weight: 700; font-size: 19px; }
.wardrobe-main { display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-start; }
.wardrobe-preview { flex: 1 1 320px; min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 12px; text-align: center; }
.wardrobe-stage { width: 260px; height: 260px; max-width: 100%; border-radius: 999px; background: var(--blue-soft); border: 3px solid var(--ink); display: flex; align-items: center; justify-content: center; }
.wardrobe-name { font-size: 38px; line-height: 1.1; }
.wardrobe-preview .btn { width: 100%; }
.wardrobe-worn { width: 100%; min-height: 64px; display: flex; align-items: center; justify-content: center; background: var(--mint-soft); border: 3px solid var(--ink); border-radius: 18px; font-weight: 700; font-size: 20px; }
.wardrobe-locked { width: 100%; padding: 16px; background: #eef1f6; border: 3px dashed var(--ink); border-radius: 18px; font-weight: 700; font-size: 18px; }
.wardrobe-lists { flex: 999 1 640px; min-width: 0; display: flex; flex-direction: column; gap: 24px; }
.skin-section { display: flex; flex-direction: column; gap: 14px; }
.skin-section h2 { font-size: 30px; }
.skin-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 18px; }
.skin-card {
  position: relative; display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 12px 8px;
  background: #fff; border: 3px solid var(--ink); border-radius: 22px; box-shadow: 0 5px 0 var(--ink); cursor: pointer;
}
.skin-card.is-selected { background: var(--sun-soft); border-width: 4px; box-shadow: 0 8px 0 var(--ink); transform: translateY(-3px); }
.skin-card.is-locked svg { opacity: 0.45; }
.skin-name { font-weight: 700; font-size: 18px; }
.skin-new { position: absolute; top: -12px; right: -6px; padding: 2px 10px; background: var(--coral); border: 2px solid var(--ink); border-radius: 999px; font: 700 15px var(--font-latin); }
.skin-lock { position: absolute; top: 8px; left: 8px; width: 30px; height: 30px; background: #fff; border: 2px solid var(--ink); border-radius: 999px; display: flex; align-items: center; justify-content: center; }
```

- [ ] **Step 6: 写 `src/pages/Wardrobe.tsx`**

```tsx
import { useState } from 'react';
import { navigate } from '../router';
import { nextSmallSkin, nextSpeedLevel } from '../rewards/rewards';
import { type Skin, type SkinKind, SKINS, skinById } from '../rewards/skins';
import { useProfile } from '../storage/ProfileContext';
import { markSkinSeen, wearSkin } from '../storage/profile';
import Mascot from '../ui/Mascot';
import ProgressBar from '../ui/ProgressBar';
import './Wardrobe.css';

const SECTIONS: { kind: SkinKind; title: string }[] = [
  { kind: 'small', title: '小皮肤' },
  { kind: 'book', title: '大皮肤 · 读书奖励' },
  { kind: 'speed', title: '大皮肤 · 速度奖励' },
];

export default function Wardrobe() {
  const { profile, update } = useProfile();
  const [selected, setSelected] = useState(profile.skinWorn);
  const skin = skinById(selected);
  const owned = profile.skinsOwned.includes(skin.id);
  const worn = profile.skinWorn === skin.id;
  const nextSmall = nextSmallSkin(profile.totalChars);
  const nextSpeed = nextSpeedLevel(profile.bestSpeedLevel);

  const pick = (id: string) => {
    setSelected(id);
    update((p) => markSkinSeen(p, id));
  };

  return (
    <main className="page">
      <div className="page-inner">
        <header className="row spread">
          <div className="row">
            <button type="button" className="btn" onClick={() => navigate({ name: 'home' })}>
              ← 回大厅
            </button>
            <h1 className="display wardrobe-title">我的衣橱</h1>
          </div>
          <span className="chip">
            已拥有 {profile.skinsOwned.length} / {SKINS.length} 套
          </span>
        </header>

        <section className="wardrobe-rules" aria-label="怎样得到皮肤">
          <div className="card rule-card">
            <div className="rule-title">小皮肤：每累计打 500 字送 1 个</div>
            {nextSmall ? (
              <>
                <div>
                  再打 {nextSmall.remaining} 字得「{skinById(nextSmall.skinId).name}」
                </div>
                <ProgressBar value={nextSmall.percent} label="离下一个小皮肤的进度" color="var(--purple)" />
              </>
            ) : (
              <div>小皮肤全部集齐啦！</div>
            )}
          </div>
          <div className="card rule-card">
            <div className="rule-title">大皮肤：读完一整本书</div>
            <div>去读书岛，每本书都对应一套装扮</div>
          </div>
          <div className="card rule-card">
            <div className="rule-title">大皮肤：速度升到新等级</div>
            <div>{nextSpeed ? `打到 ${nextSpeed.minSpeed} 字/分，升级「${nextSpeed.name}」` : '已经是最高等级啦！'}</div>
          </div>
        </section>

        <div className="wardrobe-main">
          <section className="card wardrobe-preview" aria-label="皮肤预览">
            <div className="wardrobe-stage">
              <Mascot size={230} skinId={skin.id} label={skin.name} />
            </div>
            <div className="display wardrobe-name">{skin.name}</div>
            {worn && <div className="wardrobe-worn">键宝正穿着它</div>}
            {owned && !worn && (
              <button type="button" className="btn btn-primary" onClick={() => update((p) => wearSkin(p, skin.id))}>
                穿上它
              </button>
            )}
            {!owned && <div className="wardrobe-locked">解锁条件：{skin.cond}</div>}
          </section>

          <div className="wardrobe-lists">
            {SECTIONS.map((sec) => (
              <section key={sec.kind} className="skin-section" aria-label={sec.title}>
                <h2 className="display">{sec.title}</h2>
                <div className="skin-grid">
                  {SKINS.filter((s) => s.kind === sec.kind).map((s) => (
                    <SkinCard
                      key={s.id}
                      skin={s}
                      owned={profile.skinsOwned.includes(s.id)}
                      isNew={profile.skinsNew.includes(s.id)}
                      selected={s.id === selected}
                      onPick={() => pick(s.id)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

type CardProps = { skin: Skin; owned: boolean; isNew: boolean; selected: boolean; onPick: () => void };

function SkinCard({ skin, owned, isNew, selected, onPick }: CardProps) {
  const cls = ['skin-card', selected ? 'is-selected' : '', owned ? '' : 'is-locked'].filter(Boolean).join(' ');
  return (
    <button type="button" className={cls} aria-pressed={selected} aria-label={`${skin.name}：${owned ? '已拥有' : skin.cond}`} onClick={onPick}>
      {isNew && <span className="skin-new">NEW</span>}
      {!owned && (
        <span className="skin-lock" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1F2A44" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
        </span>
      )}
      <Mascot size={110} skinId={skin.id} label={skin.name} />
      <span className="skin-name">{skin.name}</span>
    </button>
  );
}
```

- [ ] **Step 7: 运行，确认通过**

Run: `npm test` 和 `npx tsc --noEmit; echo "tsc exit: $?"`
Expected: 全部 PASS，`tsc exit: 0`

- [ ] **Step 8: 提交**

```bash
git add src/pages/Wardrobe.tsx src/pages/Wardrobe.css src/pages/Wardrobe.test.tsx src/router.ts src/router.test.ts src/App.tsx src/App.test.tsx
git commit -m "feat: 皮肤衣橱页"
```

---

### Task 7: 打字页发奖励，结算页庆祝

**Files:**
- Modify: `src/pages/Practice.tsx`, `src/pages/Practice.css`, `src/pages/Result.tsx`, `src/pages/Result.css`
- Test: `src/pages/Practice.test.tsx`, `src/pages/Result.test.tsx`

- [ ] **Step 1: 写失败的测试**

`src/pages/Practice.test.tsx` 顶部的 profile import 改成 `import { STORAGE_KEY, defaultStore, saveStore } from '../storage/profile';`，并在 `describe('Practice 的计时和重打', ...)` 里加：

```tsx
  it('打完时解锁奖励，就算不进结算页也已保存', () => {
    const store = defaultStore();
    store.profiles[0].totalChars = 480;
    saveStore(localStorage, store);
    renderPractice();
    typeKeys(lettersOf('c1-1'));
    expect(saved().skinsOwned).toContain('scarf');
    expect(saved().skinsNew).toContain('scarf');
    expect(saved().badges).toContain('first');
    expect(screen.getByText('有新奖励等你领！')).toBeInTheDocument();
  });

  it('键宝穿着选好的皮肤', () => {
    const store = defaultStore();
    store.profiles[0].skinsOwned = ['classic', 'mint'];
    store.profiles[0].skinWorn = 'mint';
    saveStore(localStorage, store);
    const { container } = renderPractice();
    expect(container.querySelector('[data-part="body"]')).toHaveAttribute('fill', '#34C38F');
  });
```

`src/pages/Result.test.tsx`：顶部的 profile import 改成 `import { STORAGE_KEY, defaultStore, saveStore, today } from '../storage/profile';`，并在 `describe('Result', ...)` 里加：

```tsx
  it('显示新解锁的奖励，可以马上穿上', () => {
    const store = defaultStore();
    store.profiles[0].skinsOwned = ['classic', 'scarf'];
    store.profiles[0].skinsNew = ['scarf'];
    saveStore(localStorage, store);
    renderResult({ ...RESULT, unlocks: { skins: ['scarf'], badges: ['first'], speedLevel: 1 } });
    expect(screen.getByRole('heading', { name: '获得奖励' })).toBeInTheDocument();
    expect(screen.getByText('红围巾')).toBeInTheDocument();
    expect(screen.getByText('初次上手')).toBeInTheDocument();
    expect(screen.getByText('速度升到「小兔」啦！')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '马上穿上：红围巾' }));
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).profiles[0].skinWorn).toBe('scarf');
    expect(screen.getByText('穿好啦')).toBeInTheDocument();
  });

  it('没有新奖励时不显示奖励区', () => {
    renderResult({ ...RESULT, unlocks: { skins: [], badges: [], speedLevel: null } });
    expect(screen.queryByRole('heading', { name: '获得奖励' })).not.toBeInTheDocument();
  });

  it('答对小考考记到当天，完成全部任务再奖励', () => {
    const store = defaultStore();
    const date = today();
    store.profiles[0].daily[date] = { minutes: 1, chars: 120, segments: 1 };
    saveStore(localStorage, store);
    renderResult();
    fireEvent.click(screen.getByRole('button', { name: '傲来国' }));
    const p = JSON.parse(localStorage.getItem(STORAGE_KEY)!).profiles[0];
    expect(p.daily[date].quizRight).toBe(1);
    expect(p.stars).toBe(4);
  });
```

- [ ] **Step 2: 运行，确认失败**

Run: `npx vitest run src/pages/Practice.test.tsx src/pages/Result.test.tsx`
Expected: 新测试 FAIL

- [ ] **Step 3: 改 `src/pages/Practice.tsx`**

加 import：

```tsx
import { grantDailyBonus } from '../rewards/dailyTasks';
import { syncRewards } from '../rewards/rewards';
import WornMascot from '../ui/WornMascot';
```

删掉 `import Mascot from '../ui/Mascot';`。

把 `const { profile, update, setLastResult } = useProfile();` 改成 `const { profile, update, lastResult, setLastResult } = useProfile();`。

把「打完一段：记成绩」的 `useEffect` 整个换成：

```tsx
  // 打完一段：记成绩、发奖励，只记一次。奖励在这里就保存，孩子不进结算页也不会丢。
  useEffect(() => {
    if (!session.done || saved.current) return;
    saved.current = true;
    const result = buildResult(session, book.id, segment.id);
    const date = today();
    const { profile: rewarded, unlocks } = syncRewards(recordSegment(profile, result, date), result, date);
    setLastResult({ ...result, unlocks });
    update(() => grantDailyBonus(rewarded, date));
  }, [session, book.id, segment.id, profile, setLastResult, update]);
```

把 `<Mascot size={72} mood={session.lastWrongKey ? 'oops' : 'happy'} />` 改成 `<WornMascot size={72} mood={session.lastWrongKey ? 'oops' : 'happy'} />`。

在 `const showPinyin = profile.settings.showPinyin;` 下面加：

```tsx
  const u = lastResult?.unlocks;
  const hasNewRewards = session.done && u !== undefined && (u.skins.length > 0 || u.badges.length > 0 || u.speedLevel !== null);
```

完成卡片里，`<h2 className="display">整段完成！</h2>` 下面加：

```tsx
                {hasNewRewards && <p className="done-new">有新奖励等你领！</p>}
```

- [ ] **Step 4: `src/pages/Practice.css` 加一行**

```css
.done-card .done-new { color: var(--purple-ink); }
```

- [ ] **Step 5: 改 `src/pages/Result.tsx`**

加 import：

```tsx
import { BADGES } from '../rewards/badges';
import { SPEED_LEVELS } from '../rewards/config';
import { grantDailyBonus } from '../rewards/dailyTasks';
import { skinById } from '../rewards/skins';
import WornMascot from '../ui/WornMascot';
```

`import Mascot from '../ui/Mascot';` 保留（奖励卡片要用）。把 `import { addStars } from '../storage/profile';` 改成 `import { recordQuizRight, today, wearSkin } from '../storage/profile';`。

`pick` 里的 `if (i === quiz.answer) update((p) => addStars(p, 1));` 改成：

```tsx
    if (i === quiz.answer) {
      const date = today();
      update((p) => grantDailyBonus(recordQuizRight(p, date), date));
    }
```

把 `<Mascot size={180} mood="cheer" label="键宝在欢呼" />` 改成 `<WornMascot size={180} mood="cheer" label="键宝在欢呼" />`。

在 `const pick = ...` 块的下面加：

```tsx
  const u = r.unlocks;
  const hasRewards = u !== undefined && (u.skins.length > 0 || u.badges.length > 0 || u.speedLevel !== null);
  const levelName = u?.speedLevel ? SPEED_LEVELS.find((l) => l.level === u.speedLevel)?.name : undefined;
```

在 `<section className="stat-grid" ...>` 的前面插入：

```tsx
        {u && hasRewards && (
          <section className="card rewards-card" aria-label="获得奖励">
            <h2 className="display">获得奖励</h2>
            {levelName && <p className="rewards-level">速度升到「{levelName}」啦！</p>}
            <div className="rewards-list">
              {u.skins.map((id) => {
                const skin = skinById(id);
                return (
                  <div key={id} className="reward-item reward-pop">
                    <Mascot size={110} skinId={id} label={skin.name} />
                    <b>{skin.name}</b>
                    {profile.skinWorn === id ? (
                      <span className="tag">穿好啦</span>
                    ) : (
                      <button type="button" className="btn" aria-label={`马上穿上：${skin.name}`} onClick={() => update((p) => wearSkin(p, id))}>
                        马上穿上
                      </button>
                    )}
                  </div>
                );
              })}
              {u.badges.map((id) => {
                const badge = BADGES.find((b) => b.id === id);
                return (
                  <div key={id} className="reward-item reward-pop">
                    <span className="reward-badge" aria-hidden="true">
                      ★
                    </span>
                    <b>{badge?.name}</b>
                    <span>{badge?.desc}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

```

- [ ] **Step 6: `src/pages/Result.css` 加**

```css
.rewards-card { display: flex; flex-direction: column; gap: 12px; background: var(--lav); }
.rewards-card h2 { font-size: 32px; }
.rewards-level { margin: 0; font-weight: 700; font-size: 20px; }
.rewards-list { display: flex; flex-wrap: wrap; gap: 14px; }
.reward-item { display: flex; flex-direction: column; align-items: center; gap: 8px; min-width: 150px; padding: 14px; background: #fff; border: 3px solid var(--ink); border-radius: 20px; text-align: center; }
.reward-badge { width: 72px; height: 72px; display: flex; align-items: center; justify-content: center; background: var(--sun); border: 3px solid var(--ink); border-radius: 999px; font-size: 36px; }
.reward-pop { animation: reward-pop 0.45s ease-out backwards; }
@keyframes reward-pop { from { transform: scale(0.4); opacity: 0; } 70% { transform: scale(1.08); } to { transform: scale(1); opacity: 1; } }
```

- [ ] **Step 7: 运行，确认通过**

Run: `npm test` 和 `npx tsc --noEmit; echo "tsc exit: $?"`
Expected: 全部 PASS，`tsc exit: 0`

- [ ] **Step 8: 提交**

```bash
git add src/pages/Practice.tsx src/pages/Practice.css src/pages/Practice.test.tsx src/pages/Result.tsx src/pages/Result.css src/pages/Result.test.tsx
git commit -m "feat: 打完一段发奖励，结算页庆祝并可以马上穿上"
```

---

### Task 8: 首页和书架

**Files:**
- Modify: `src/pages/Home.tsx`, `src/pages/Home.css`, `src/pages/Bookshelf.tsx`
- Test: `src/pages/Home.test.tsx`, `src/pages/Bookshelf.test.tsx`

- [ ] **Step 1: 写失败的测试**

`src/pages/Home.test.tsx`，在 `describe('Home', ...)` 里加：

```tsx
  it('显示今日任务、速度等级和徽章', () => {
    renderHome();
    expect(screen.getByRole('heading', { name: '今日任务' })).toBeInTheDocument();
    expect(screen.getByText('打一段课外书')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '速度等级' })).toBeInTheDocument();
    expect(screen.getByText('打到 20 字/分，升级「小兔」，送大皮肤')).toBeInTheDocument();
    expect(screen.getByText('已收集 0 / 15')).toBeInTheDocument();
  });

  it('可以进衣橱，有新皮肤时有提示', () => {
    const store = defaultStore();
    store.profiles[0].skinsNew = ['scarf'];
    saveStore(localStorage, store);
    renderHome();
    fireEvent.click(screen.getByRole('button', { name: '我的衣橱：有新皮肤' }));
    expect(window.location.hash).toBe('#/wardrobe');
  });

  it('显示离下一个小皮肤还差多少字', () => {
    renderHome();
    expect(screen.getByText('再打 500 字，解锁「红围巾」')).toBeInTheDocument();
  });
```

`src/pages/Bookshelf.test.tsx`，在 `describe('Bookshelf', ...)` 里加：

```tsx
  it('已拥有皮肤时写已获得', () => {
    const store = defaultStore();
    store.profiles[0].skinsOwned = ['classic', 'monkey'];
    saveStore(localStorage, store);
    renderShelf();
    expect(screen.getByText('已获得大皮肤「美猴王」')).toBeInTheDocument();
  });

  it('只读完书但皮肤没发时，不写已获得', () => {
    const store = defaultStore();
    store.profiles[0].bookProgress.xiyouji = { done: ['c1-1', 'c1-2', 'c1-3', 'c1-4'], lastSegment: 'c1-4', updatedAt: 1 };
    saveStore(localStorage, store);
    renderShelf();
    expect(screen.getByText('读完送大皮肤「美猴王」')).toBeInTheDocument();
  });
```

- [ ] **Step 2: 运行，确认失败**

Run: `npx vitest run src/pages/Home.test.tsx src/pages/Bookshelf.test.tsx`
Expected: 新测试 FAIL

- [ ] **Step 3: 改 `src/pages/Bookshelf.tsx`**

把 `import Mascot from '../ui/Mascot';` 改成 `import WornMascot from '../ui/WornMascot';`，把 `<Mascot size={130} label="键宝" />` 改成 `<WornMascot size={130} label="键宝" />`。

`ShelfProps` 加 `skinsOwned: string[]`；`Shelf` 的参数解构加 `skinsOwned`，并把 `<BookCard key={b.id} book={b} done={doneOf(b.id)} />` 改成 `<BookCard key={b.id} book={b} done={doneOf(b.id)} granted={skinsOwned.includes(b.skinId)} />`。

两处 `<Shelf ... doneOf={doneOf} />` 都加上 `skinsOwned={profile.skinsOwned}`。

`BookCard` 的参数改成 `{ book, done, granted }: { book: ShelfBook; done: string[]; granted: boolean }`，把奖励那一行改成：

```tsx
      <div className="book-reward">{granted ? `已获得大皮肤「${book.skinName}」` : `读完送大皮肤「${book.skinName}」`}</div>
```

- [ ] **Step 4: 改 `src/pages/Home.tsx`**

加 import：

```tsx
import { BADGES } from '../rewards/badges';
import { SPEED_LEVELS } from '../rewards/config';
import { dailyTasks, streakDays } from '../rewards/dailyTasks';
import { nextSmallSkin, nextSpeedLevel } from '../rewards/rewards';
import { skinById } from '../rewards/skins';
import { today } from '../storage/profile';
import WornMascot from '../ui/WornMascot';
```

在 `const continueReading = ...` 的前面加：

```tsx
  const date = today();
  const tasks = dailyTasks(profile, date);
  const streak = streakDays(profile.daily, date);
  const nextSmall = nextSmallSkin(profile.totalChars);
  const nextSpeed = nextSpeedLevel(profile.bestSpeedLevel);
  const hasNewSkin = profile.skinsNew.length > 0;
```

把头部右侧的 `<div className="row">...星星...昵称...</div>` 换成：

```tsx
          <div className="row">
            <span className="chip">
              星星 <b className="latin">{profile.stars}</b>
            </span>
            <span className="chip">
              连续 <b className="latin">{streak}</b> 天
            </span>
            <button
              type="button"
              className="btn"
              aria-label={hasNewSkin ? '我的衣橱：有新皮肤' : '我的衣橱'}
              onClick={() => navigate({ name: 'wardrobe' })}
            >
              我的衣橱
              {hasNewSkin && <span className="tag tag-coral">NEW</span>}
            </button>
            <span className="chip">{profile.nickname}</span>
          </div>
```

把 `<Mascot size={180} label="键宝在挥手" />` 改成 `<WornMascot size={180} label="键宝在挥手" />`（头部 logo 的 `Mascot` 保持不变）。

在 `<footer className="home-footer">` 的前面插入：

```tsx
        <section className="home-panels">
          <div className="card home-panel">
            <h2 className="display">今日任务</h2>
            {tasks.map((t, i) => (
              <div key={t.id} className="task-row">
                <span className={t.done ? 'task-mark is-done' : 'task-mark'} aria-hidden="true">
                  {t.done ? '✓' : i + 1}
                </span>
                <span className="task-title">{t.title}</span>
                <span className="latin">{t.done ? '完成' : t.progress}</span>
              </div>
            ))}
            <div className="panel-note">全部完成多得 3 颗星</div>
            {nextSmall && (
              <div className="panel-note">
                再打 {nextSmall.remaining} 字，解锁「{skinById(nextSmall.skinId).name}」
              </div>
            )}
          </div>

          <div className="card home-panel">
            <h2 className="display">速度等级</h2>
            <div className="level-row">
              <span className={profile.bestSpeedLevel === 0 ? 'level-chip is-on' : 'level-chip'}>蜗牛</span>
              {SPEED_LEVELS.map((l) => (
                <span key={l.level} className={profile.bestSpeedLevel === l.level ? 'level-chip is-on' : 'level-chip'}>
                  {l.name}
                </span>
              ))}
            </div>
            <div className="panel-note">
              {nextSpeed ? `打到 ${nextSpeed.minSpeed} 字/分，升级「${nextSpeed.name}」，送大皮肤` : '已经是最高等级啦！'}
            </div>
          </div>

          <div className="card home-panel">
            <h2 className="display">我的徽章</h2>
            <div className="panel-note">
              已收集 {profile.badges.length} / {BADGES.length}
            </div>
            <div className="badge-row">
              {BADGES.map((b) => {
                const earned = profile.badges.includes(b.id);
                return (
                  <span key={b.id} className={earned ? 'badge is-earned' : 'badge'} title={b.desc}>
                    {earned ? '★' : '?'} {b.name}
                  </span>
                );
              })}
            </div>
          </div>
        </section>

```

继续读卡片的按钮保持不变。

- [ ] **Step 5: `src/pages/Home.css` 加**

```css
.home-panels { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px; }
.home-panel { display: flex; flex-direction: column; gap: 12px; }
.home-panel h2 { font-size: 30px; }
.task-row { display: flex; align-items: center; gap: 12px; font-size: 18px; }
.task-title { flex: 1; }
.task-mark { width: 38px; height: 38px; flex: none; display: flex; align-items: center; justify-content: center; background: #fff; border: 3px solid var(--ink); border-radius: 999px; font: 700 18px var(--font-latin); }
.task-mark.is-done { background: var(--mint); }
.panel-note { color: var(--ink-2); font-size: 17px; }
.level-row { display: flex; flex-wrap: wrap; gap: 8px; }
.level-chip { padding: 8px 14px; background: #fff; border: 2px dashed var(--ink-2); border-radius: 14px; font-weight: 700; font-size: 17px; }
.level-chip.is-on { background: var(--sun); border: 3px solid var(--ink); box-shadow: 0 4px 0 var(--ink); }
.badge-row { display: flex; flex-wrap: wrap; gap: 8px; }
.badge { padding: 6px 12px; background: #eef1f6; border: 2px dashed var(--ink-2); border-radius: 999px; font-size: 17px; color: var(--ink-2); }
.badge.is-earned { background: var(--sun-soft); border: 2px solid var(--ink); color: var(--ink); font-weight: 700; }
```

- [ ] **Step 6: 运行，确认通过**

Run: `npm test` 和 `npx tsc --noEmit; echo "tsc exit: $?"`
Expected: 全部 PASS，`tsc exit: 0`

- [ ] **Step 7: 提交**

```bash
git add src/pages/Home.tsx src/pages/Home.css src/pages/Home.test.tsx src/pages/Bookshelf.tsx src/pages/Bookshelf.test.tsx
git commit -m "feat: 首页显示今日任务、速度等级、徽章和衣橱入口"
```

---

### Task 9: 构建和浏览器验收

- [ ] `npm run build` 退出码 0。
- [ ] 打完一段（累计满 500 字）：完成卡片提示「有新奖励等你领！」，结算页显示红围巾，点「马上穿上」后显示「穿好啦」。
- [ ] 进衣橱：18 套皮肤都画得正常，没有配饰跑出画面；新皮肤有 NEW，点开后消失；穿上后回首页，键宝换了装。
- [ ] 打字页仍然放得进一屏（1366×650）。
- [ ] 首页今日任务、速度等级、徽章显示正常。
- [ ] 手机宽度没有横向滚动条。

---

## 完成标准

- `npm test`、`npm run build` 通过。
- 孩子打字能实际赢到皮肤和徽章，能在衣橱换装，键宝在首页、书架、打字页、结算页穿着选好的皮肤。
- 不进结算页也不会丢奖励；旧存档打开时自动补发该得的奖励。
