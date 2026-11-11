# 计划 4a：首次启动、多个小朋友、声音、家长中心、导入文章、离线 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 第一次打开先认识孩子（头像、昵称、年级）；一台电脑能有多个小朋友；打字有声音，练习页能「听一听」；练够时长键宝提醒休息；家长中心（算术题进入）能看统计、改设置、导入文章、备份恢复；装成 PWA 后断网也能用。

**Architecture:** 存档（`Store`）加 `setupDone` 和 `customBooks`，`migrate` 改成逐个字段校验类型（导入备份也走它）。`ProfileContext` 多给一个 `updateStore`，所有「整份存档」的操作（建档、切换、导入、加文章）都是 `profile.ts` 里的纯函数。声音用 Web Audio 实时合成，「听一听」用浏览器的中文语音。导入文章在浏览器里按需加载 pinyin-pro（单独一个 chunk），生成的书登记到 `library.ts`，原有的 `getBook` 就能找到。离线用 vite-plugin-pwa。

**Tech Stack:** 沿用前面的计划；新增 vite-plugin-pwa；pinyin-pro 从 devDependencies 移到 dependencies。

**本计划做的决定:**
- 头像是 6 种颜色的圆形，里面写昵称的第一个字（不用 emoji，Mac 和 Windows 显示一致）。
- 只有全新的电脑（本机没有存档）才走首次启动；旧存档和导入的备份都算已经建过档。
- 每日时长提醒只提醒、不强制退出（设计第 9 节）。时长在打完一段、一关、一局时才累加，所以提醒出现在打完之后。
- 「近 7 天速度」用当天字数 ÷ 当天分钟数算平均速度，不新增存档字段。
- 导入的文章不发大皮肤、不算「读完一本书」徽章。
- 孩子怎么打开网页（部署到网址、本地服务还是安装包）不在本计划里决定，构建产物放到任意静态网址都能用。

---

### Task 1: 存档支持首次启动、多个小朋友、导入文章和备份

**Files:**
- Modify: `src/content/schema.ts`, `src/storage/profile.ts`, `src/storage/ProfileContext.tsx`
- Test: `src/storage/profile.test.ts`, `src/storage/ProfileContext.test.tsx`

- [ ] **Step 1: 写失败的测试**

`src/storage/profile.test.ts`：import 列表加 `addCustomBook`、`exportStore`、`parseBackup`、`removeCustomBook`、`setupChild`、`switchProfile`，再加 `import type { Book } from '../content/schema';`。文件末尾加：

```ts
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
```

`src/storage/ProfileContext.test.tsx`：import 里加 `setupChild`（从 `./profile`），文件末尾的 `describe` 里加：

```tsx
  it('updateStore 改整份存档并保存', () => {
    function Probe() {
      const { store, profile, updateStore } = useProfile();
      return (
        <button type="button" onClick={() => updateStore((s) => setupChild(s, { nickname: '小红', grade: 4, avatar: 'mint' }))}>
          {profile.nickname}/{store.profiles.length}
        </button>
      );
    }
    render(
      <ProfileProvider storage={localStorage}>
        <Probe />
      </ProfileProvider>,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button')).toHaveTextContent('小红/1');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).setupDone).toBe(true);
  });
```

（这个文件已有的 import 如果缺 `fireEvent`、`STORAGE_KEY`，一并补上。）

- [ ] **Step 2: 运行，确认失败**

Run: `npx vitest run src/storage`
Expected: 新测试 FAIL

- [ ] **Step 3: `src/content/schema.ts` 末尾加**

```ts
/** 家长导入的文章，书的 id 都以它开头 */
export const CUSTOM_BOOK_PREFIX = 'my-';
```

- [ ] **Step 4: 改 `src/storage/profile.ts`**

1. 顶部加 `import { type Book, CUSTOM_BOOK_PREFIX } from '../content/schema';`
2. `Profile` 里 `grade` 下面加：

```ts
  /** 头像颜色，见 src/ui/Avatar.tsx */
  avatar: string;
```

3. `Store` 改成：

```ts
export type Store = {
  version: 1;
  activeId: string;
  profiles: Profile[];
  /** false 表示第一次打开，还没给孩子建档 */
  setupDone: boolean;
  /** 家长导入的文章，所有小朋友共用 */
  customBooks: Book[];
};
```

4. `newProfile` 改成多一个参数 `avatar = 'sun'`，返回对象里 `grade,` 下面加 `avatar,`：

```ts
export function newProfile(id: string, nickname: string, grade: Profile['grade'], avatar = 'sun'): Profile {
```

5. `defaultStore` 返回值改成 `{ version: 1, activeId: p.id, profiles: [p], setupDone: true, customBooks: [] }`。
6. `loadStore` 里 `if (raw === null) return { store: defaultStore(), persistent: true };` 改成：

```ts
  if (raw === null) return { store: { ...defaultStore(), setupDone: false }, persistent: true };
```

7. 整个 `migrate` 函数换成：

```ts
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
```

8. 文件末尾加：

```ts
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
```

- [ ] **Step 5: 改 `src/storage/ProfileContext.tsx`**

1. import 改成 `import { type Profile, type Store, activeProfile, getStorage, loadStore, replaceProfile, saveStore } from './profile';`
2. `ProfileCtx` 类型里 `profile: Profile;` 下面加：

```ts
  /** 整份存档：所有小朋友、导入的文章 */
  store: Store;
  updateStore: (fn: (s: Store) => Store) => void;
```

3. 原来的 `const update = useCallback(...)` 整个换成：

```tsx
  const updateStore = useCallback((fn: (s: Store) => Store) => {
    setState((prev) => {
      const store = fn(prev.store);
      if (store === prev.store) return prev;
      const ok = prev.persistent && prev.st !== null && saveStore(prev.st, store);
      return { ...prev, store, persistent: prev.persistent && ok };
    });
  }, []);

  const update = useCallback(
    (fn: (p: Profile) => Profile) =>
      updateStore((s) => {
        const current = activeProfile(s);
        const next = fn(current);
        return next === current ? s : replaceProfile(s, next);
      }),
    [updateStore],
  );
```

4. `value` 改成：

```tsx
  const value = useMemo<ProfileCtx>(
    () => ({ profile: activeProfile(state.store), store: state.store, updateStore, persistent: state.persistent, update, lastResult, setLastResult }),
    [state, update, updateStore, lastResult],
  );
```

- [ ] **Step 6: 运行，确认通过**

Run: `npm test` 和 `npx tsc --noEmit; echo "tsc exit: $?"`
Expected: 全部 PASS，`tsc exit: 0`。如果有旧测试依赖「migrate 保留不认识的字段」，按新规则改测试（新规则就是丢掉）。

- [ ] **Step 7: 提交**

```bash
git add src/content/schema.ts src/storage
git commit -m "feat: 存档支持首次启动、多个小朋友、导入文章和备份校验"
```

---

### Task 2: 首次启动、换人页、头像

**Files:**
- Create: `src/ui/Avatar.tsx`, `src/pages/Welcome.tsx`, `src/pages/Profiles.tsx`, `src/pages/Family.css`
- Modify: `src/router.ts`, `src/App.tsx`, `src/pages/Home.tsx`, `src/theme.css`
- Test: `src/pages/Welcome.test.tsx`, `src/pages/Profiles.test.tsx`, `src/router.test.ts`, `src/App.test.tsx`

- [ ] **Step 1: 写失败的测试**

`src/router.test.ts`：「认识四种页面」里加

```ts
    expect(parseHash('#/welcome')).toEqual({ name: 'welcome' });
    expect(parseHash('#/profiles')).toEqual({ name: 'profiles' });
    expect(parseHash('#/parent')).toEqual({ name: 'parent' });
```

`toHash` 测试的 `routes` 数组里加 `{ name: 'welcome' }, { name: 'profiles' }, { name: 'parent' }`。

`src/pages/Welcome.test.tsx`：

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProfileProvider } from '../storage/ProfileContext';
import { STORAGE_KEY, defaultStore, saveStore } from '../storage/profile';
import Welcome from './Welcome';

const saved = () => JSON.parse(localStorage.getItem(STORAGE_KEY)!);
const wrap = (mode: 'first' | 'add') =>
  render(
    <ProfileProvider storage={localStorage}>
      <Welcome mode={mode} />
    </ProfileProvider>,
  );

describe('Welcome', () => {
  it('第一次打开：三步建档', () => {
    wrap('first');
    expect(screen.getByRole('heading', { name: '欢迎来到小键盘大冒险！' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '第 1 步：选一个头像' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '头像：薄荷绿' }));
    fireEvent.click(screen.getByRole('button', { name: '下一步' }));

    expect(screen.getByRole('button', { name: '下一步' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('你叫什么名字？'), { target: { value: ' 小红 ' } });
    fireEvent.click(screen.getByRole('button', { name: '下一步' }));

    expect(screen.getByRole('button', { name: '开始冒险！' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '四年级' }));
    fireEvent.click(screen.getByRole('button', { name: '开始冒险！' }));

    const store = saved();
    expect(store.setupDone).toBe(true);
    expect(store.profiles).toHaveLength(1);
    expect(store.profiles[0]).toMatchObject({ nickname: '小红', grade: 4, avatar: 'mint' });
    expect(window.location.hash).toBe('#/');
  });

  it('可以回到上一步', () => {
    wrap('first');
    fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    fireEvent.click(screen.getByRole('button', { name: '上一步' }));
    expect(screen.getByRole('heading', { name: '第 1 步：选一个头像' })).toBeInTheDocument();
  });

  it('加一个小朋友：新建档案并切换过去，可以取消', () => {
    saveStore(localStorage, defaultStore());
    wrap('add');
    expect(screen.getByRole('heading', { name: '加一个小朋友' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    fireEvent.change(screen.getByLabelText('你叫什么名字？'), { target: { value: '小刚' } });
    fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    fireEvent.click(screen.getByRole('button', { name: '六年级' }));
    fireEvent.click(screen.getByRole('button', { name: '开始冒险！' }));
    const store = saved();
    expect(store.profiles).toHaveLength(2);
    expect(store.activeId).toBe('p2');
  });

  it('加一个小朋友时有取消按钮，第一次打开时没有', () => {
    saveStore(localStorage, defaultStore());
    wrap('add');
    fireEvent.click(screen.getByRole('button', { name: '← 取消' }));
    expect(window.location.hash).toBe('#/profiles');
  });
});
```

`src/pages/Profiles.test.tsx`：

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProfileProvider } from '../storage/ProfileContext';
import { STORAGE_KEY, defaultStore, saveStore, setupChild } from '../storage/profile';
import Profiles from './Profiles';

describe('Profiles', () => {
  it('列出所有小朋友，点一下就切换并回首页', () => {
    saveStore(localStorage, setupChild(defaultStore(), { nickname: '小刚', grade: 6, avatar: 'blue' }));
    render(
      <ProfileProvider storage={localStorage}>
        <Profiles />
      </ProfileProvider>,
    );
    expect(screen.getByRole('heading', { name: '谁在练习？' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '小刚，6 年级（正在用）' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '小朋友，5 年级' }));
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).activeId).toBe('p1');
    expect(window.location.hash).toBe('#/');
  });

  it('可以去加一个小朋友', () => {
    render(
      <ProfileProvider storage={localStorage}>
        <Profiles />
      </ProfileProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: '＋ 加一个小朋友' }));
    expect(window.location.hash).toBe('#/welcome');
  });
});
```

`src/App.test.tsx`：
1. import 里加 `beforeEach`（从 vitest）。
2. 在 `describe('App', () => {` 下第一行加：

```tsx
  beforeEach(() => {
    saveStore(localStorage, defaultStore());
  });

  it('第一次打开先建档', () => {
    localStorage.clear();
    window.location.hash = '#/books';
    render(<App />);
    expect(screen.getByRole('heading', { name: '欢迎来到小键盘大冒险！' })).toBeInTheDocument();
  });
```

- [ ] **Step 2: 运行，确认失败**

Run: `npx vitest run src/router.test.ts src/pages/Welcome.test.tsx src/pages/Profiles.test.tsx src/App.test.tsx`
Expected: FAIL

- [ ] **Step 3: 改 `src/router.ts`**

`Route` 末尾加 `| { name: 'welcome' } | { name: 'profiles' } | { name: 'parent' }`（接在 `{ name: 'game' }` 后面，分号移到最后）。`parseHash` 里 `if (parts[0] === 'game') ...` 下面加：

```ts
  if (parts[0] === 'welcome') return { name: 'welcome' };
  if (parts[0] === 'profiles') return { name: 'profiles' };
  if (parts[0] === 'parent') return { name: 'parent' };
```

`toHash` 的 `switch` 里加：

```ts
    case 'welcome':
      return '#/welcome';
    case 'profiles':
      return '#/profiles';
    case 'parent':
      return '#/parent';
```

- [ ] **Step 4: 写 `src/ui/Avatar.tsx`**

```tsx
export const AVATARS = [
  { id: 'sun', name: '阳光黄', bg: '#FFC93C', fg: '#1F2A44' },
  { id: 'coral', name: '珊瑚橙', bg: '#FF7A45', fg: '#1F2A44' },
  { id: 'mint', name: '薄荷绿', bg: '#34C38F', fg: '#1F2A44' },
  { id: 'blue', name: '天空蓝', bg: '#2167D8', fg: '#FFFFFF' },
  { id: 'purple', name: '葡萄紫', bg: '#8B6CFF', fg: '#FFFFFF' },
  { id: 'peach', name: '蜜桃粉', bg: '#FFE6D3', fg: '#1F2A44' },
];

export function avatarById(id: string) {
  return AVATARS.find((a) => a.id === id) ?? AVATARS[0];
}

/** 圆形头像：头像颜色 + 昵称的第一个字 */
export default function Avatar({ avatar, name, size = 44 }: { avatar: string; name: string; size?: number }) {
  const a = avatarById(avatar);
  return (
    <span className="avatar" aria-hidden="true" style={{ width: size, height: size, background: a.bg, color: a.fg, fontSize: size * 0.5 }}>
      {[...name.trim()][0] ?? '?'}
    </span>
  );
}
```

`src/theme.css` 末尾加：

```css
.avatar {
  display: inline-flex; align-items: center; justify-content: center; flex: none;
  border: 3px solid var(--ink); border-radius: 999px; font-family: var(--font-display); line-height: 1;
}
```

- [ ] **Step 5: 写 `src/pages/Family.css`**

```css
.family { max-width: 860px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px; }
.family-hero { display: flex; align-items: center; gap: 20px; }
.family-title { font-size: 44px; margin: 0; }
.family-step { font-size: 30px; margin: 0 0 16px; }
.avatar-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 16px; }
.avatar-pick {
  display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 14px; background: #fff;
  border: 3px solid var(--ink); border-radius: 22px; box-shadow: 0 5px 0 var(--ink); font-size: 18px; font-weight: 700; cursor: pointer;
}
.avatar-pick[aria-pressed='true'] { background: var(--sun); transform: translateY(-3px); }
.name-input {
  width: 100%; min-height: 72px; padding: 0 20px; border: 3px solid var(--ink); border-radius: 20px;
  font: 400 34px var(--font-display); background: #fff;
}
.grade-row { display: flex; flex-wrap: wrap; gap: 16px; }
.grade-row .btn { flex: 1 1 160px; min-height: 88px; font-size: 28px; }
.grade-row .btn[aria-pressed='true'] { background: var(--sun); }
.family-nav { display: flex; justify-content: space-between; gap: 16px; margin-top: 20px; }
.family-nav .btn-primary { margin-left: auto; min-width: 200px; }
.who-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 18px; }
.who-card {
  display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 22px; background: #fff;
  border: 3px solid var(--ink); border-radius: 26px; box-shadow: 0 6px 0 var(--ink); cursor: pointer; font-size: 18px;
}
.who-card.is-current { background: var(--sun-soft); }
.who-name { font: 400 30px var(--font-display); }
.home-who { gap: 8px; padding-left: 8px; }
```

- [ ] **Step 6: 写 `src/pages/Welcome.tsx`**

```tsx
import { useState } from 'react';
import { navigate } from '../router';
import { useProfile } from '../storage/ProfileContext';
import { type Profile, setupChild } from '../storage/profile';
import Avatar, { AVATARS } from '../ui/Avatar';
import Mascot from '../ui/Mascot';
import './Family.css';

const GRADES: { g: Profile['grade']; label: string }[] = [
  { g: 4, label: '四年级' },
  { g: 5, label: '五年级' },
  { g: 6, label: '六年级' },
];

/** 首次启动（mode=first）和加一个小朋友（mode=add）共用：选头像 → 起名字 → 选年级 */
export default function Welcome({ mode }: { mode: 'first' | 'add' }) {
  const { updateStore, setLastResult } = useProfile();
  const [step, setStep] = useState(0);
  const [avatar, setAvatar] = useState('sun');
  const [nickname, setNickname] = useState('');
  const [grade, setGrade] = useState<Profile['grade'] | null>(null);
  const name = nickname.trim();

  const finish = () => {
    if (!name || grade === null) return;
    updateStore((s) => setupChild(s, { nickname: name, grade, avatar }));
    setLastResult(null);
    navigate({ name: 'home' });
  };

  return (
    <main className="page">
      <div className="page-inner family">
        <header className="family-hero">
          <Mascot size={110} mood="cheer" label="键宝" />
          <div>
            <h1 className="display family-title">{mode === 'first' ? '欢迎来到小键盘大冒险！' : '加一个小朋友'}</h1>
            <p>我是键宝，先来认识一下你吧～</p>
          </div>
          {mode === 'add' && (
            <button type="button" className="btn" style={{ marginLeft: 'auto' }} onClick={() => navigate({ name: 'profiles' })}>
              ← 取消
            </button>
          )}
        </header>

        <section className="card">
          {step === 0 && (
            <>
              <h2 className="display family-step">第 1 步：选一个头像</h2>
              <div className="avatar-grid">
                {AVATARS.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    className="avatar-pick"
                    aria-pressed={avatar === a.id}
                    aria-label={`头像：${a.name}`}
                    onClick={() => setAvatar(a.id)}
                  >
                    <Avatar avatar={a.id} name={name || '我'} size={72} />
                    {a.name}
                  </button>
                ))}
              </div>
            </>
          )}
          {step === 1 && (
            <>
              <h2 className="display family-step">第 2 步：你叫什么名字？</h2>
              <input
                className="name-input"
                aria-label="你叫什么名字？"
                placeholder="比如：小明"
                maxLength={8}
                value={nickname}
                autoFocus
                onChange={(e) => setNickname(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && name) setStep(2);
                }}
              />
            </>
          )}
          {step === 2 && (
            <>
              <h2 className="display family-step">第 3 步：你上几年级？</h2>
              <div className="grade-row">
                {GRADES.map(({ g, label }) => (
                  <button key={g} type="button" className="btn" aria-pressed={grade === g} onClick={() => setGrade(g)}>
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="family-nav">
            {step > 0 && (
              <button type="button" className="btn" onClick={() => setStep(step - 1)}>
                上一步
              </button>
            )}
            {step < 2 ? (
              <button type="button" className="btn btn-primary" disabled={step === 1 && !name} onClick={() => setStep(step + 1)}>
                下一步
              </button>
            ) : (
              <button type="button" className="btn btn-primary" disabled={grade === null} onClick={finish}>
                开始冒险！
              </button>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
```

- [ ] **Step 7: 写 `src/pages/Profiles.tsx`**

```tsx
import { navigate } from '../router';
import { useProfile } from '../storage/ProfileContext';
import { switchProfile } from '../storage/profile';
import Avatar from '../ui/Avatar';
import './Family.css';

export default function Profiles() {
  const { store, updateStore, setLastResult } = useProfile();
  const pick = (id: string) => {
    if (id !== store.activeId) {
      updateStore((s) => switchProfile(s, id));
      setLastResult(null);
    }
    navigate({ name: 'home' });
  };

  return (
    <main className="page">
      <div className="page-inner family">
        <header className="row spread">
          <button type="button" className="btn" onClick={() => navigate({ name: 'home' })}>
            ← 回大厅
          </button>
          <h1 className="display family-title">谁在练习？</h1>
          <span />
        </header>
        <div className="who-list">
          {store.profiles.map((p) => {
            const current = p.id === store.activeId;
            return (
              <button
                key={p.id}
                type="button"
                className={current ? 'who-card is-current' : 'who-card'}
                aria-label={`${p.nickname}，${p.grade} 年级${current ? '（正在用）' : ''}`}
                onClick={() => pick(p.id)}
              >
                <Avatar avatar={p.avatar} name={p.nickname} size={88} />
                <span className="who-name">{p.nickname}</span>
                <span>
                  {p.grade} 年级 · 星星 <b className="latin">{p.stars}</b>
                </span>
                {current && <span className="tag">正在用</span>}
              </button>
            );
          })}
        </div>
        <button type="button" className="btn btn-primary" onClick={() => navigate({ name: 'welcome' })}>
          ＋ 加一个小朋友
        </button>
      </div>
    </main>
  );
}
```

- [ ] **Step 8: 改 `src/App.tsx`**

1. 加 import：`import Profiles from './pages/Profiles';` 和 `import Welcome from './pages/Welcome';`。
2. `Screens` 里 `const { persistent, update } = useProfile();` 改成 `const { persistent, update, store } = useProfile();`。
3. 把 `return (` 到函数结尾的 JSX 改成先算出提示条，再根据 `store.setupDone` 分支（所有 hook 仍然在最前面）：

```tsx
  const banner = !persistent && (
    <div role="alert" className="banner storage-banner">
      这台电脑的浏览器不允许保存，关掉页面后这次的进度就没了。
    </div>
  );
  if (!store.setupDone) {
    return (
      <>
        {banner}
        <Welcome mode="first" />
      </>
    );
  }
  return (
    <>
      {banner}
      {route.name === 'home' && <Home />}
      ……（原来的各个路由保持不变）……
      {route.name === 'welcome' && <Welcome mode="add" />}
      {route.name === 'profiles' && <Profiles />}
    </>
  );
```

- [ ] **Step 9: 改 `src/pages/Home.tsx`**

加 import `import Avatar from '../ui/Avatar';`。把头部的 `<span className="chip">{profile.nickname}</span>` 换成：

```tsx
            <button
              type="button"
              className="btn home-who"
              aria-label={`换人：现在是${profile.nickname}`}
              onClick={() => navigate({ name: 'profiles' })}
            >
              <Avatar avatar={profile.avatar} name={profile.nickname} size={36} />
              {profile.nickname}
            </button>
```

并在 `Home.css` 引入的地方不用改（`.home-who` 写在 Family.css 里，Home 加一行 `import './Family.css';`）。

- [ ] **Step 10: 运行，确认通过**

Run: `npm test` 和 `npx tsc --noEmit; echo "tsc exit: $?"`
Expected: 全部 PASS，`tsc exit: 0`

- [ ] **Step 11: 提交**

```bash
git add src/ui/Avatar.tsx src/pages/Welcome.tsx src/pages/Welcome.test.tsx src/pages/Profiles.tsx src/pages/Profiles.test.tsx src/pages/Family.css src/router.ts src/router.test.ts src/App.tsx src/App.test.tsx src/pages/Home.tsx src/theme.css
git commit -m "feat: 首次启动建档、换人页和头像"
```

---

### Task 3: 声音和「听一听」

**Files:**
- Create: `src/audio/sound.ts`, `src/audio/useSfx.ts`, `src/audio/speech.ts`
- Modify: `src/pages/Practice.tsx`, `src/pages/Practice.css`, `src/pages/Drill.tsx`, `src/pages/Game.tsx`
- Test: `src/audio/useSfx.test.tsx`, `src/audio/speech.test.ts`, `src/pages/Practice.test.tsx`

- [ ] **Step 1: 写失败的测试**

`src/audio/useSfx.test.tsx`：

```tsx
import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSession, press } from '../engine/session';
import type { Session, Token } from '../engine/types';
import { ProfileProvider } from '../storage/ProfileContext';
import { defaultStore, saveStore } from '../storage/profile';
import { sfx } from './sound';
import { useTypingSounds } from './useSfx';

const TOKENS: Token[] = [
  { kind: 'hanzi', char: '大', key: 'da', tone: 'dà' },
];

function Probe({ session }: { session: Session }) {
  useTypingSounds(session);
  return null;
}

function setup(sound = true) {
  const store = defaultStore();
  store.profiles[0].settings.sound = sound;
  saveStore(localStorage, store);
  const s0 = createSession(TOKENS);
  const ui = (s: Session) => (
    <ProfileProvider storage={localStorage}>
      <Probe session={s} />
    </ProfileProvider>
  );
  const view = render(ui(s0));
  return { s0, rerender: (s: Session) => view.rerender(ui(s)) };
}

describe('useTypingSounds', () => {
  afterEach(() => vi.restoreAllMocks());

  it('按对、按错、打完各有声音', () => {
    const key = vi.spyOn(sfx, 'key').mockImplementation(() => undefined);
    const wrong = vi.spyOn(sfx, 'wrong').mockImplementation(() => undefined);
    const cheer = vi.spyOn(sfx, 'cheer').mockImplementation(() => undefined);
    const { s0, rerender } = setup();
    const s1 = press(s0, 'x', 1000).session;
    rerender(s1);
    expect(wrong).toHaveBeenCalledTimes(1);
    const s2 = press(s1, 'd', 1100).session;
    rerender(s2);
    expect(key).toHaveBeenCalledTimes(1);
    const s3 = press(s2, 'a', 1200).session;
    rerender(s3);
    expect(cheer).toHaveBeenCalledTimes(1);
    expect(key).toHaveBeenCalledTimes(1);
  });

  it('声音关掉就不响', () => {
    const wrong = vi.spyOn(sfx, 'wrong').mockImplementation(() => undefined);
    const { s0, rerender } = setup(false);
    rerender(press(s0, 'x', 1000).session);
    expect(wrong).not.toHaveBeenCalled();
  });

  it('没有 Web Audio 的浏览器里调用也不会出错', () => {
    expect(() => sfx.key()).not.toThrow();
  });
});
```

（如果 `Session` 类型不在 `../engine/types` 里，改成从实际定义它的模块导入。）

`src/audio/speech.test.ts`：

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { findChineseVoice, speak } from './speech';

function installSpeech(voices: { lang: string; name: string }[]) {
  const synth = { getVoices: () => voices, speak: vi.fn(), cancel: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() };
  vi.stubGlobal('speechSynthesis', synth);
  vi.stubGlobal(
    'SpeechSynthesisUtterance',
    class {
      text: string;
      voice: unknown = null;
      lang = '';
      rate = 1;
      constructor(text: string) {
        this.text = text;
      }
    },
  );
  return synth;
}

describe('speech', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('优先选普通话语音', () => {
    installSpeech([
      { lang: 'en-US', name: 'Alex' },
      { lang: 'zh-HK', name: 'Sinji' },
      { lang: 'zh-CN', name: 'Tingting' },
    ]);
    expect(findChineseVoice()?.name).toBe('Tingting');
  });

  it('没有中文语音就返回 null', () => {
    installSpeech([{ lang: 'en-US', name: 'Alex' }]);
    expect(findChineseVoice()).toBeNull();
  });

  it('浏览器不支持语音也返回 null', () => {
    expect(findChineseVoice()).toBeNull();
  });

  it('朗读前先停掉上一次', () => {
    const synth = installSpeech([{ lang: 'zh-CN', name: 'Tingting' }]);
    speak('花果山', findChineseVoice()!);
    expect(synth.cancel).toHaveBeenCalled();
    expect(synth.speak).toHaveBeenCalledWith(expect.objectContaining({ text: '花果山', lang: 'zh-CN' }));
  });
});
```

`src/pages/Practice.test.tsx`：import 里加 `vi`（如果没有）。在最外层 `describe` 里加：

```tsx
  it('有中文语音时可以听一听这一段', () => {
    const speakFn = vi.fn();
    vi.stubGlobal('speechSynthesis', {
      getVoices: () => [{ lang: 'zh-CN', name: 'Tingting' }],
      speak: speakFn,
      cancel: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    vi.stubGlobal(
      'SpeechSynthesisUtterance',
      class {
        text: string;
        voice: unknown = null;
        lang = '';
        rate = 1;
        constructor(text: string) {
          this.text = text;
        }
      },
    );
    renderPractice();
    fireEvent.click(screen.getByRole('button', { name: '听一听' }));
    expect(speakFn).toHaveBeenCalledTimes(1);
    expect(speakFn.mock.calls[0][0].text.length).toBeGreaterThan(10);
    vi.unstubAllGlobals();
  });

  it('没有中文语音时不显示听一听', () => {
    renderPractice();
    expect(screen.queryByRole('button', { name: '听一听' })).not.toBeInTheDocument();
  });
```

（`renderPractice` 换成这个测试文件里实际用来渲染《西游记》第一段练习页的帮助函数或写法。）

- [ ] **Step 2: 运行，确认失败**

Run: `npx vitest run src/audio src/pages/Practice.test.tsx`
Expected: FAIL

- [ ] **Step 3: 写 `src/audio/sound.ts`**

```ts
type AudioCtor = typeof AudioContext;
let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const C: AudioCtor | undefined = window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext;
  if (!C) return null;
  try {
    ctx ??= new C();
  } catch {
    return null;
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(freq: number, ms: number, type: OscillatorType, volume: number, delayMs = 0) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + delayMs / 1000;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
  osc.connect(gain).connect(a.destination);
  osc.start(t);
  osc.stop(t + ms / 1000 + 0.02);
}

/** 实时合成的音效，不需要音频文件 */
export const sfx = {
  key: () => tone(700, 45, 'triangle', 0.05),
  wrong: () => tone(200, 140, 'square', 0.035),
  pop: () => {
    tone(660, 70, 'sine', 0.08);
    tone(990, 90, 'sine', 0.06, 60);
  },
  cheer: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 160, 'triangle', 0.07, i * 110)),
};

export type SfxName = keyof typeof sfx;
```

- [ ] **Step 4: 写 `src/audio/useSfx.ts`**

```ts
import { useCallback, useEffect, useRef } from 'react';
import type { Session } from '../engine/types';
import { useProfile } from '../storage/ProfileContext';
import { type SfxName, sfx } from './sound';

/** 按档案里的「声音」开关决定响不响 */
export function useSfx() {
  const { profile } = useProfile();
  const on = profile.settings.sound;
  return useCallback(
    (name: SfxName) => {
      if (on) sfx[name]();
    },
    [on],
  );
}

/** 跟着打字会话放声音：按对、按错、打完 */
export function useTypingSounds(session: Session) {
  const play = useSfx();
  const prev = useRef({ right: session.right, wrong: session.wrong, done: session.done });
  useEffect(() => {
    const p = prev.current;
    if (session.done && !p.done) play('cheer');
    else if (session.wrong > p.wrong) play('wrong');
    else if (session.right > p.right) play('key');
    prev.current = { right: session.right, wrong: session.wrong, done: session.done };
  }, [session.right, session.wrong, session.done, play]);
}
```

（`Session` 的导入路径同测试，以仓库实际为准。）

- [ ] **Step 5: 写 `src/audio/speech.ts`**

```ts
import { useEffect, useState } from 'react';

function synth(): SpeechSynthesis | null {
  return typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
}

/** 找一个中文语音，普通话优先；没有就返回 null（这时隐藏「听一听」） */
export function findChineseVoice(): SpeechSynthesisVoice | null {
  const s = synth();
  if (!s) return null;
  const voices = s.getVoices();
  return voices.find((v) => /^zh[-_]CN/i.test(v.lang)) ?? voices.find((v) => /^zh/i.test(v.lang)) ?? null;
}

/** 语音列表有的浏览器要过一会儿才加载好，这里跟着更新 */
export function useChineseVoice(): SpeechSynthesisVoice | null {
  const [voice, setVoice] = useState(findChineseVoice);
  useEffect(() => {
    const s = synth();
    if (!s) return;
    const onChange = () => setVoice(findChineseVoice());
    s.addEventListener?.('voiceschanged', onChange);
    onChange();
    return () => s.removeEventListener?.('voiceschanged', onChange);
  }, []);
  return voice;
}

export function speak(text: string, voice: SpeechSynthesisVoice) {
  const s = synth();
  if (!s) return;
  s.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.voice = voice;
  u.lang = voice.lang;
  u.rate = 0.85;
  s.speak(u);
}

export function stopSpeaking() {
  synth()?.cancel();
}
```

- [ ] **Step 6: 接到练习页、Drill 和游戏**

`src/pages/Practice.tsx`：
1. 加 import：`import { useChineseVoice, speak, stopSpeaking } from '../audio/speech';` 和 `import { useTypingSounds } from '../audio/useSfx';`。
2. `PracticeSession` 里 `const saved = useRef(false);` 下面加：

```tsx
  useTypingSounds(session);
  const voice = useChineseVoice();
  useEffect(() => stopSpeaking, []);
```

3. 把 `<p className="practice-tip">…</p>` 换成：

```tsx
              <div className="practice-tools">
                <p className="practice-tip">小提示：只打拼音字母，不用打声调；标点会自动跳过。ü 用 V 键。</p>
                {voice && (
                  <button
                    type="button"
                    className="btn"
                    onMouseDown={keepFocus}
                    onClick={() => speak(segment.tokens.map((t) => t.char).join(''), voice)}
                  >
                    听一听
                  </button>
                )}
              </div>
```

`src/pages/Practice.css`：把 `.practice-tip` 里的 `var(--ink-2)` 改成 `var(--muted)`（`--ink-2` 不存在），并加一行：

```css
.practice-tools { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
```

`src/pages/Drill.tsx`：加 import `import { useTypingSounds } from '../audio/useSfx';`，在 `const reported = useRef(false);` 下面加 `useTypingSounds(session);`。

`src/pages/Game.tsx`：
1. 加 import `import { useSfx } from '../audio/useSfx';`。
2. `const saved = useRef(false);` 下面加：

```tsx
  const play = useSfx();
  const last = useRef({ popped: 0, wrong: 0 });
  useEffect(() => {
    if (!game) return;
    const p = last.current;
    if (game.status === 'won' && game.popped > p.popped) play('cheer');
    else if (game.popped > p.popped) play('pop');
    else if (game.wrong > p.wrong) play('wrong');
    last.current = { popped: game.popped, wrong: game.wrong };
  }, [game, play]);
```

3. `start` 函数里加一行 `last.current = { popped: 0, wrong: 0 };`。

- [ ] **Step 7: 运行，确认通过**

Run: `npm test` 和 `npx tsc --noEmit; echo "tsc exit: $?"`
Expected: 全部 PASS，`tsc exit: 0`

- [ ] **Step 8: 提交**

```bash
git add src/audio src/pages/Practice.tsx src/pages/Practice.css src/pages/Practice.test.tsx src/pages/Drill.tsx src/pages/Game.tsx
git commit -m "feat: 打字音效和听一听"
```

---

### Task 4: 练够时长，键宝提醒休息

**Files:**
- Create: `src/ui/RestReminder.tsx`
- Modify: `src/App.tsx`, `src/theme.css`
- Test: `src/ui/RestReminder.test.tsx`

- [ ] **Step 1: 写失败的测试 `src/ui/RestReminder.test.tsx`**

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProfileProvider } from '../storage/ProfileContext';
import { defaultStore, saveStore, today } from '../storage/profile';
import RestReminder from './RestReminder';

function seed(minutes: number, limit: number) {
  const store = defaultStore();
  store.profiles[0].daily[today()] = { minutes, chars: 100 };
  store.profiles[0].settings.dailyLimitMin = limit;
  saveStore(localStorage, store);
  render(
    <ProfileProvider storage={localStorage}>
      <RestReminder />
    </ProfileProvider>,
  );
}

describe('RestReminder', () => {
  it('练够了时长就提醒，点「知道啦」关掉', () => {
    seed(21.4, 20);
    expect(screen.getByRole('heading', { name: '休息一下吧！' })).toBeInTheDocument();
    expect(screen.getByText(/今天已经练了 21 分钟/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '知道啦' }));
    expect(screen.queryByRole('heading', { name: '休息一下吧！' })).not.toBeInTheDocument();
  });

  it('没练够不提醒', () => {
    seed(5, 20);
    expect(screen.queryByRole('heading', { name: '休息一下吧！' })).not.toBeInTheDocument();
  });

  it('家长设成「不提醒」就不提醒', () => {
    seed(90, 0);
    expect(screen.queryByRole('heading', { name: '休息一下吧！' })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `npx vitest run src/ui/RestReminder.test.tsx`
Expected: FAIL

- [ ] **Step 3: 写 `src/ui/RestReminder.tsx`**

```tsx
import { useState } from 'react';
import { useProfile } from '../storage/ProfileContext';
import { today } from '../storage/profile';
import WornMascot from './WornMascot';

/** 今天练够家长设的时长后，键宝提醒休息（不强制退出） */
export default function RestReminder() {
  const { profile } = useProfile();
  const [dismissed, setDismissed] = useState<string | null>(null);
  const date = today();
  const key = `${profile.id}/${date}`;
  const limit = profile.settings.dailyLimitMin;
  const minutes = profile.daily[date]?.minutes ?? 0;
  if (limit <= 0 || minutes < limit || dismissed === key) return null;
  return (
    <div role="alertdialog" aria-labelledby="rest-title" className="card rest-reminder">
      <WornMascot size={90} label="键宝" />
      <div>
        <h2 id="rest-title" className="display">
          休息一下吧！
        </h2>
        <p>今天已经练了 {Math.floor(minutes)} 分钟啦。站起来活动活动，看看远处，让眼睛歇一歇。</p>
      </div>
      <button type="button" className="btn btn-primary" onClick={() => setDismissed(key)}>
        知道啦
      </button>
    </div>
  );
}
```

`src/theme.css` 末尾加：

```css
.rest-reminder {
  position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); z-index: 50;
  display: flex; align-items: center; gap: 16px; width: min(680px, calc(100vw - 32px)); background: var(--sun-soft);
}
.rest-reminder h2 { margin: 0 0 4px; font-size: 28px; }
.rest-reminder p { margin: 0; font-size: 18px; line-height: 1.5; }
@media (max-width: 640px) { .rest-reminder { flex-wrap: wrap; } }
```

- [ ] **Step 4: 改 `src/App.tsx`**

加 import `import RestReminder from './ui/RestReminder';`，在 `setupDone` 之后那个 `return` 的 fragment 末尾加 `<RestReminder />`（首次启动页不显示）。

- [ ] **Step 5: 运行，确认通过**

Run: `npm test` 和 `npx tsc --noEmit; echo "tsc exit: $?"`
Expected: 全部 PASS，`tsc exit: 0`

- [ ] **Step 6: 提交**

```bash
git add src/ui/RestReminder.tsx src/ui/RestReminder.test.tsx src/App.tsx src/theme.css
git commit -m "feat: 练够时长键宝提醒休息"
```

---

### Task 5: 家长中心（算术题进入、统计、设置、小朋友、备份）

**Files:**
- Create: `src/pages/parentStats.ts`, `src/pages/Parent.tsx`, `src/pages/Parent.css`
- Modify: `src/App.tsx`, `src/pages/Home.tsx`
- Test: `src/pages/parentStats.test.ts`, `src/pages/Parent.test.tsx`, `src/pages/Home.test.tsx`

- [ ] **Step 1: 写失败的测试**

`src/pages/parentStats.test.ts`：

```ts
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
```

`src/pages/Parent.test.tsx`：

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProfileProvider } from '../storage/ProfileContext';
import { STORAGE_KEY, defaultStore, exportStore, saveStore, setupChild, today } from '../storage/profile';
import Parent from './Parent';

const saved = () => JSON.parse(localStorage.getItem(STORAGE_KEY)!);
const renderParent = () =>
  render(
    <ProfileProvider storage={localStorage}>
      <Parent rng={() => 0} />
    </ProfileProvider>,
  );
const unlock = () => {
  fireEvent.change(screen.getByLabelText('答案'), { target: { value: '20' } });
  fireEvent.click(screen.getByRole('button', { name: '进入' }));
};

describe('Parent', () => {
  afterEach(() => vi.restoreAllMocks());

  it('先做一道加法题才能进', () => {
    renderParent();
    expect(screen.getByText('10 + 10 = ?')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('答案'), { target: { value: '19' } });
    fireEvent.click(screen.getByRole('button', { name: '进入' }));
    expect(screen.getByText('不对哦，换一道题再试试')).toBeInTheDocument();
    unlock();
    expect(screen.getByRole('heading', { name: '家长中心' })).toBeInTheDocument();
  });

  it('看到近 7 天和易错键', () => {
    const store = defaultStore();
    store.profiles[0].daily[today()] = { minutes: 12, chars: 300 };
    store.profiles[0].keyErrors = { s: 7, k: 3 };
    saveStore(localStorage, store);
    renderParent();
    unlock();
    expect(screen.getByRole('heading', { name: '近 7 天' })).toBeInTheDocument();
    expect(screen.getByText('300')).toBeInTheDocument();
    expect(screen.getByText('S × 7')).toBeInTheDocument();
  });

  it('改每日时长和声音，马上保存', () => {
    renderParent();
    unlock();
    fireEvent.change(screen.getByLabelText('每天练习时长'), { target: { value: '30' } });
    fireEvent.click(screen.getByRole('button', { name: '声音：开' }));
    expect(saved().profiles[0].settings).toMatchObject({ dailyLimitMin: 30, sound: false });
  });

  it('可以切换小朋友、去加小朋友', () => {
    saveStore(localStorage, setupChild(defaultStore(), { nickname: '小刚', grade: 6, avatar: 'blue' }));
    renderParent();
    unlock();
    fireEvent.click(screen.getByRole('button', { name: '看小朋友的' }));
    expect(saved().activeId).toBe('p1');
    fireEvent.click(screen.getByRole('button', { name: '＋ 加一个小朋友' }));
    expect(window.location.hash).toBe('#/welcome');
  });

  it('导出备份：下载一个 JSON 文件', () => {
    const create = vi.fn(() => 'blob:x');
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: create, revokeObjectURL: vi.fn() }));
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    renderParent();
    unlock();
    fireEvent.click(screen.getByRole('button', { name: '导出备份' }));
    expect(create).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it('导入备份：成功就替换，失败就说原因、不动现有数据', async () => {
    saveStore(localStorage, defaultStore());
    renderParent();
    unlock();
    const input = screen.getByLabelText('导入备份');

    fireEvent.change(input, { target: { files: [new File(['oops'], 'bad.json', { type: 'application/json' })] } });
    expect(await screen.findByText('这不是小键盘大冒险的备份文件（读不出内容）')).toBeInTheDocument();
    expect(saved().profiles).toHaveLength(1);

    const backup = exportStore(setupChild(defaultStore(), { nickname: '小刚', grade: 6, avatar: 'blue' }));
    fireEvent.change(input, { target: { files: [new File([backup], 'good.json', { type: 'application/json' })] } });
    expect(await screen.findByText('已恢复 2 个小朋友的进度')).toBeInTheDocument();
    expect(saved().profiles).toHaveLength(2);
  });
});
```

`src/pages/Home.test.tsx` 末尾的 `describe` 里加：

```tsx
  it('有家长中心入口', () => {
    renderHome();
    fireEvent.click(screen.getByRole('button', { name: '家长中心' }));
    expect(window.location.hash).toBe('#/parent');
  });
```

- [ ] **Step 2: 运行，确认失败**

Run: `npx vitest run src/pages/parentStats.test.ts src/pages/Parent.test.tsx src/pages/Home.test.tsx`
Expected: FAIL

- [ ] **Step 3: 写 `src/pages/parentStats.ts`**

```ts
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
```

- [ ] **Step 4: 写 `src/pages/Parent.css`**

```css
.parent { display: flex; flex-direction: column; gap: 24px; }
.parent-title { font-size: 44px; margin: 0; }
.parent-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 24px; align-items: start; }
.parent-grid .card { display: flex; flex-direction: column; gap: 14px; }
.parent-grid h2 { margin: 0; font-size: 28px; }
.parent-note { margin: 0; color: var(--muted); font-size: 17px; line-height: 1.5; }
.gate { max-width: 520px; margin: 40px auto; display: flex; flex-direction: column; align-items: center; gap: 18px; text-align: center; }
.gate-q { font: 700 44px var(--font-latin); }
.gate input, .parent select, .parent textarea, .parent .text-input {
  border: 3px solid var(--ink); border-radius: 16px; background: #fff; font-size: 20px; padding: 10px 14px; font-family: var(--font-body);
}
.gate input { width: 200px; text-align: center; font: 700 32px var(--font-latin); }
.day-table { width: 100%; border-collapse: collapse; font-size: 17px; }
.day-table th, .day-table td { padding: 6px 4px; text-align: left; border-bottom: 2px dashed #d5dbe8; }
.day-bar { height: 12px; border-radius: 6px; background: var(--mint); min-width: 2px; }
.stat-list { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 0; }
.stat-list div { background: var(--sky); border-radius: 14px; padding: 10px 14px; }
.stat-list dt { font-size: 15px; color: var(--muted); }
.stat-list dd { margin: 0; font: 700 24px var(--font-latin); }
.kid-row { display: flex; align-items: center; gap: 12px; }
.kid-row .btn { margin-left: auto; }
.msg-ok { color: var(--mint-ink); font-weight: 700; margin: 0; }
.msg-bad { color: #b3261e; font-weight: 700; margin: 0; }
.file-btn { position: relative; overflow: hidden; }
.file-btn input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
```

- [ ] **Step 5: 写 `src/pages/Parent.tsx`**

```tsx
import { type ChangeEvent, type FormEvent, useState } from 'react';
import { navigate } from '../router';
import { SPEED_LEVELS } from '../rewards/config';
import { finishedBookIds } from '../rewards/rewards';
import { useProfile } from '../storage/ProfileContext';
import { exportStore, parseBackup, switchProfile, today } from '../storage/profile';
import Avatar from '../ui/Avatar';
import { lastDays, topErrorKeys } from './parentStats';
import './Parent.css';

const LIMITS = [0, 10, 15, 20, 30, 45, 60];

function question(rng: () => number) {
  return { a: 10 + Math.floor(rng() * 40), b: 10 + Math.floor(rng() * 40) };
}

function readText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('读不出这个文件'));
    reader.readAsText(file);
  });
}

export default function Parent({ rng = Math.random }: { rng?: () => number }) {
  const [unlocked, setUnlocked] = useState(false);
  return unlocked ? <ParentCenter /> : <ParentGate rng={rng} onPass={() => setUnlocked(true)} />;
}

function ParentGate({ rng, onPass }: { rng: () => number; onPass: () => void }) {
  const [q, setQ] = useState(() => question(rng));
  const [answer, setAnswer] = useState('');
  const [wrong, setWrong] = useState(false);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (Number(answer.trim()) === q.a + q.b) {
      onPass();
      return;
    }
    setWrong(true);
    setAnswer('');
    setQ(question(rng));
  };
  return (
    <main className="page">
      <div className="page-inner">
        <button type="button" className="btn" onClick={() => navigate({ name: 'home' })}>
          ← 回大厅
        </button>
        <form className="card gate" onSubmit={submit}>
          <h1 className="display">请家长来回答</h1>
          <div className="gate-q">
            {q.a} + {q.b} = ?
          </div>
          <input aria-label="答案" inputMode="numeric" autoComplete="off" value={answer} onChange={(e) => setAnswer(e.target.value)} />
          {wrong && <p className="msg-bad">不对哦，换一道题再试试</p>}
          <button type="submit" className="btn btn-primary">
            进入
          </button>
        </form>
      </div>
    </main>
  );
}

function ParentCenter() {
  const { profile, store, update, updateStore, setLastResult } = useProfile();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const rows = lastDays(profile.daily, today());
  const maxMin = Math.max(1, ...rows.map((r) => r.minutes));
  const errors = topErrorKeys(profile.keyErrors);
  const level = SPEED_LEVELS.find((l) => l.level === profile.bestSpeedLevel);

  const setLimit = (n: number) => update((p) => ({ ...p, settings: { ...p.settings, dailyLimitMin: n } }));
  const toggleSound = () => update((p) => ({ ...p, settings: { ...p.settings, sound: !p.settings.sound } }));

  const exportBackup = () => {
    const blob = new Blob([exportStore(store)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `小键盘大冒险-备份-${today()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const importBackup = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const next = parseBackup(await readText(file));
      updateStore(() => next);
      setLastResult(null);
      setMsg({ ok: true, text: `已恢复 ${next.profiles.length} 个小朋友的进度` });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : '导入失败' });
    }
  };

  return (
    <main className="page">
      <div className="page-inner parent">
        <header className="row spread">
          <div className="row">
            <button type="button" className="btn" onClick={() => navigate({ name: 'home' })}>
              ← 回大厅
            </button>
            <h1 className="display parent-title">家长中心</h1>
          </div>
          <span className="chip">
            <Avatar avatar={profile.avatar} name={profile.nickname} size={32} /> 正在看：{profile.nickname}
          </span>
        </header>

        <div className="parent-grid">
          <section className="card">
            <h2 className="display">近 7 天</h2>
            <table className="day-table">
              <thead>
                <tr>
                  <th>日期</th>
                  <th>分钟</th>
                  <th>字数</th>
                  <th>字/分</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.date}>
                    <td>{r.label}</td>
                    <td>
                      <div className="row" style={{ gap: 8 }}>
                        <span className="latin">{r.minutes}</span>
                        <div className="day-bar" style={{ width: `${(r.minutes * 80) / maxMin}px` }} />
                      </div>
                    </td>
                    <td className="latin">{r.chars}</td>
                    <td className="latin">{r.speed || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="parent-note">字/分是当天打的字数除以练习分钟数，指法训练营只算时间不算字数。</p>
          </section>

          <section className="card">
            <h2 className="display">学习概况</h2>
            <dl className="stat-list">
              <div>
                <dt>累计打字</dt>
                <dd>{profile.totalChars}</dd>
              </div>
              <div>
                <dt>速度等级</dt>
                <dd>{level ? level.name : '蜗牛'}</dd>
              </div>
              <div>
                <dt>读完的书</dt>
                <dd>{finishedBookIds(profile).length}</dd>
              </div>
              <div>
                <dt>指法关卡</dt>
                <dd>{profile.fingerLevel} / 12</dd>
              </div>
            </dl>
            <b>最容易按错的键</b>
            {errors.length === 0 ? (
              <p className="parent-note">还没有记录。</p>
            ) : (
              <div className="row">
                {errors.map(([k, n]) => (
                  <span key={k} className="tag">
                    {k.toUpperCase()} × {n}
                  </span>
                ))}
              </div>
            )}
          </section>

          <section className="card">
            <h2 className="display">设置</h2>
            <label className="row">
              每天练习时长
              <select value={profile.settings.dailyLimitMin} onChange={(e) => setLimit(Number(e.target.value))}>
                {LIMITS.map((n) => (
                  <option key={n} value={n}>
                    {n === 0 ? '不提醒' : `${n} 分钟`}
                  </option>
                ))}
              </select>
            </label>
            <p className="parent-note">到时间后键宝会提醒孩子休息，不会强制退出。</p>
            <button type="button" className="btn" aria-pressed={profile.settings.sound} onClick={toggleSound}>
              声音：{profile.settings.sound ? '开' : '关'}
            </button>
          </section>

          <section className="card">
            <h2 className="display">小朋友</h2>
            {store.profiles.map((p) => (
              <div key={p.id} className="kid-row">
                <Avatar avatar={p.avatar} name={p.nickname} size={40} />
                <span>
                  {p.nickname} · {p.grade} 年级
                </span>
                {p.id === store.activeId ? (
                  <span className="tag">正在看</span>
                ) : (
                  <button
                    type="button"
                    className="btn"
                    aria-label={`看${p.nickname}的`}
                    onClick={() => {
                      updateStore((s) => switchProfile(s, p.id));
                      setLastResult(null);
                    }}
                  >
                    看{p.nickname}的
                  </button>
                )}
              </div>
            ))}
            <button type="button" className="btn" onClick={() => navigate({ name: 'welcome' })}>
              ＋ 加一个小朋友
            </button>
          </section>

          <section className="card">
            <h2 className="display">备份和恢复</h2>
            <p className="parent-note">进度只存在这台电脑的浏览器里。换电脑或清理浏览器前，先导出一份备份。</p>
            <div className="row">
              <button type="button" className="btn btn-primary" onClick={exportBackup}>
                导出备份
              </button>
              <label className="btn file-btn">
                导入备份
                <input type="file" accept="application/json,.json" aria-label="导入备份" onChange={importBackup} />
              </label>
            </div>
            {msg && <p className={msg.ok ? 'msg-ok' : 'msg-bad'}>{msg.text}</p>}
            <p className="parent-note">导入会替换这台电脑上所有小朋友的进度。</p>
          </section>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 6: 改 `src/App.tsx` 和 `src/pages/Home.tsx`**

`App.tsx`：加 import `import Parent from './pages/Parent';`，路由里加 `{route.name === 'parent' && <Parent />}`。

`Home.tsx`：在 `</main>` 前、`page-inner` 的最后加：

```tsx
        <footer className="row" style={{ justifyContent: 'center' }}>
          <button type="button" className="btn" onClick={() => navigate({ name: 'parent' })}>
            家长中心
          </button>
        </footer>
```

- [ ] **Step 7: 运行，确认通过**

Run: `npm test` 和 `npx tsc --noEmit; echo "tsc exit: $?"`
Expected: 全部 PASS，`tsc exit: 0`

- [ ] **Step 8: 提交**

```bash
git add src/pages/parentStats.ts src/pages/parentStats.test.ts src/pages/Parent.tsx src/pages/Parent.css src/pages/Parent.test.tsx src/App.tsx src/pages/Home.tsx src/pages/Home.test.tsx
git commit -m "feat: 家长中心（统计、设置、小朋友、备份恢复）"
```

---

### Task 6: 家长导入文章，生成「我的文章」

**Files:**
- Create: `src/content/importArticle.ts`
- Modify: `package.json`, `src/content/library.ts`, `src/storage/ProfileContext.tsx`, `src/rewards/rewards.ts`, `src/pages/Bookshelf.tsx`, `src/pages/Parent.tsx`
- Test: `src/content/importArticle.test.ts`, `src/content/library.test.ts`, `src/rewards/rewards.test.ts`, `src/pages/Bookshelf.test.tsx`, `src/pages/Parent.test.tsx`

- [ ] **Step 1: pinyin-pro 改成正式依赖**

Run: `npm install --save-exact --save-prod pinyin-pro@3.29.5`
Expected: `package.json` 里 pinyin-pro 从 devDependencies 移到 dependencies。

- [ ] **Step 2: 写失败的测试**

`src/content/importArticle.test.ts`：

```ts
import { describe, expect, it } from 'vitest';
import type { PinyinFn } from './annotate';
import { buildCustomBook, loadPinyinFn, splitArticle } from './importArticle';

const han = (s: string) => [...s].filter((c) => /\p{Script=Han}/u.test(c)).length;

describe('splitArticle', () => {
  it('短文章就是一段，换行和空格去掉', () => {
    expect(splitArticle('  小猫钓鱼。\n\n 它很开心！ ')).toEqual(['小猫钓鱼。它很开心！']);
  });

  it('长文章按句子切，每段不超过 80 个字', () => {
    const text = '小猫跟着妈妈到河边去钓鱼，一会儿看蜻蜓，一会儿追蝴蝶。'.repeat(12);
    const parts = splitArticle(text);
    expect(parts.length).toBeGreaterThan(3);
    for (const p of parts) expect(han(p)).toBeLessThanOrEqual(80);
    expect(parts.join('')).toBe(text);
  });

  it('没有句号的超长句子在逗号处切开', () => {
    const text = `${'春天来了，'.repeat(40)}`;
    for (const p of splitArticle(text)) expect(han(p)).toBeLessThanOrEqual(80);
  });
});

describe('buildCustomBook', () => {
  const fake: PinyinFn = (text) =>
    [...text].map((c) => ({ origin: c, pinyin: c === '龘' ? '' : 'mā', isZh: /\p{Script=Han}/u.test(c), polyphonic: [] }));

  it('生成一本「我的文章」书', () => {
    const { book } = buildCustomBook(' 小猫钓鱼 ', '小猫钓鱼。', fake, 1000);
    expect(book).toMatchObject({ id: 'my-rs', title: '小猫钓鱼', theme: '我的文章', mark: '小', skinId: '' });
    expect(book.segments).toHaveLength(1);
    expect(book.segments[0]).toMatchObject({ id: 's1', title: '第 1 段' });
  });

  it('标不出拼音的字自动跳过，并告诉家长', () => {
    const { book, unknown } = buildCustomBook('', '龘龘小猫。', fake);
    expect(book.title).toBe('我的文章');
    expect(unknown).toEqual(['龘']);
    expect(book.segments[0].tokens[0]).toEqual({ kind: 'skip', char: '龘' });
  });

  it('方括号不会被当成手动拼音', () => {
    const { book } = buildCustomBook('', '小[猫]钓鱼。', fake);
    expect(book.segments[0].tokens.map((t) => t.char).join('')).toBe('小猫钓鱼。');
  });

  it('没有汉字就报错', () => {
    expect(() => buildCustomBook('', 'hello 123', fake)).toThrow('没有汉字');
  });

  it('用真的拼音库', async () => {
    const fn = await loadPinyinFn();
    const { book } = buildCustomBook('', '女孩去上学。', fn);
    expect(book.segments[0].tokens.filter((t) => t.kind === 'hanzi').map((t) => (t.kind === 'hanzi' ? t.key : ''))).toEqual(['nv', 'hai', 'qu', 'shang', 'xue']);
  });
});
```

`src/content/library.test.ts` 末尾加（import 里加 `setCustomBooks`、`listCustomBooks`，以及 `import type { Book } from './schema';`）：

```ts
describe('自己导入的文章', () => {
  it('登记后 getBook 能找到，换一批就替换', () => {
    const book = { id: 'my-1', title: '小猫', segments: [{ id: 's1', title: '第 1 段', tokens: [] }] } as unknown as Book;
    setCustomBooks([book]);
    expect(getBook('my-1')?.title).toBe('小猫');
    expect(getSegment('my-1', 's1')?.title).toBe('第 1 段');
    expect(listCustomBooks()).toHaveLength(1);
    setCustomBooks([]);
    expect(getBook('my-1')).toBeNull();
  });
});
```

`src/rewards/rewards.test.ts` 的 `describe('syncRewards', ...)` 里加（import 里加 `setCustomBooks` 从 `../content/library`，`import type { Book } from '../content/schema';`）：

```ts
  it('读完自己导入的文章不算读完一本书', () => {
    const book = { id: 'my-1', title: '小猫', skinId: '', segments: [{ id: 's1', title: '第 1 段', tokens: [] }] } as unknown as Book;
    setCustomBooks([book]);
    const p = { ...base, bookProgress: { 'my-1': { done: ['s1'], lastSegment: 's1', updatedAt: 1 } } };
    expect(syncRewards(p, undefined, DATE).unlocks.badges).not.toContain('book-1');
    setCustomBooks([]);
  });
```

`src/pages/Bookshelf.test.tsx` 末尾的 `describe` 里加（import 里加 `defaultStore`、`saveStore`，以及 `import type { Book } from '../content/schema';`）：

```tsx
  it('有导入的文章时显示「我的文章」书架', () => {
    const store = defaultStore();
    store.customBooks = [
      { id: 'my-1', title: '小猫钓鱼', author: '我的文章', grade: 0, term: '通用', theme: '我的文章', skinId: '', skinName: '', cover: '#8B6CFF', mark: '小', kind: 'prose', segments: [{ id: 's1', title: '第 1 段', tokens: [{ kind: 'hanzi', char: '猫', key: 'mao', tone: 'māo' }] }] } as Book,
    ];
    saveStore(localStorage, store);
    renderShelf();
    expect(screen.getByRole('heading', { name: /我的文章/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /《小猫钓鱼》/ }));
    expect(window.location.hash).toBe('#/practice/my-1/s1');
  });
```

（`renderShelf` 换成这个测试文件里实际的渲染写法；书架标题的实际标签结构以 `Shelf` 组件为准，断言按实际结构写，意思是能看到「我的文章」书架并能点进去练。）

`src/pages/Parent.test.tsx` 的 `describe` 里加：

```tsx
  it('粘贴文章生成练习，可以删除', async () => {
    renderParent();
    unlock();
    fireEvent.change(screen.getByLabelText('文章标题'), { target: { value: '小猫' } });
    fireEvent.change(screen.getByLabelText('文章内容'), { target: { value: '小猫跟着妈妈到河边去钓鱼。' } });
    fireEvent.click(screen.getByRole('button', { name: '生成练习' }));
    expect(await screen.findByText(/已生成《小猫》，共 1 段/)).toBeInTheDocument();
    expect(saved().customBooks).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: '删除《小猫》' }));
    fireEvent.click(screen.getByRole('button', { name: '确定删除《小猫》' }));
    expect(saved().customBooks).toHaveLength(0);
  });
```

- [ ] **Step 3: 运行，确认失败**

Run: `npx vitest run src/content src/rewards src/pages/Bookshelf.test.tsx src/pages/Parent.test.tsx`
Expected: 新测试 FAIL

- [ ] **Step 4: 写 `src/content/importArticle.ts`**

```ts
import { type PinyinFn, annotateBody } from './annotate';
import { type Book, CUSTOM_BOOK_PREFIX } from './schema';

export const ARTICLE_MAX_CHARS = 3000;
const SEG_MIN = 40;
const SEG_MAX = 80;
const isHan = (c: string) => /\p{Script=Han}/u.test(c);
const hanCount = (s: string) => [...s].filter(isHan).length;
const ENDS = '。！？；!?…';
const CLOSERS = '”’」』）)';

/** 拆成句子：句末标点（连同后面的右引号）结束一句，换行也结束一句 */
function sentences(text: string): string[] {
  const out: string[] = [];
  let cur = '';
  const chars = [...text];
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (c === '\n') {
      if (cur) out.push(cur);
      cur = '';
      continue;
    }
    cur += c;
    if (ENDS.includes(c)) {
      while (i + 1 < chars.length && (ENDS.includes(chars[i + 1]) || CLOSERS.includes(chars[i + 1]))) cur += chars[++i];
      out.push(cur);
      cur = '';
    }
  }
  if (cur) out.push(cur);
  return out;
}

/** 太长的句子：够 40 字后在逗号处切，最多 80 字硬切 */
function hardSplit(s: string): string[] {
  const out: string[] = [];
  let cur = '';
  let n = 0;
  for (const c of s) {
    cur += c;
    if (isHan(c)) n += 1;
    if ((n >= SEG_MIN && /[，、,：:]/.test(c)) || n >= SEG_MAX) {
      out.push(cur);
      cur = '';
      n = 0;
    }
  }
  if (cur) out.push(cur);
  return out;
}

/** 把文章切成一段一段：每段尽量 40–80 个汉字，按句子切 */
export function splitArticle(text: string): string[] {
  const lines = text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => l.replace(/\s+/g, ''))
    .filter(Boolean);
  const parts: string[] = [];
  let cur = '';
  let n = 0;
  const flush = () => {
    if (cur) parts.push(cur);
    cur = '';
    n = 0;
  };
  for (const s of sentences(lines.join('\n'))) {
    const k = hanCount(s);
    if (k > SEG_MAX) {
      flush();
      parts.push(...hardSplit(s));
      continue;
    }
    if (n + k > SEG_MAX) flush();
    cur += s;
    n += k;
    if (n >= SEG_MIN) flush();
  }
  flush();
  if (parts.length > 1) {
    const last = parts[parts.length - 1];
    const prev = parts[parts.length - 2];
    if (hanCount(last) < 20 && hanCount(prev) + hanCount(last) <= 100) parts.splice(-2, 2, prev + last);
  }
  return parts.filter((p) => hanCount(p) > 0);
}

export type ImportResult = { book: Book; unknown: string[] };

export function buildCustomBook(title: string, text: string, pinyinFn: PinyinFn, now = Date.now()): ImportResult {
  const name = title.trim().slice(0, 20) || '我的文章';
  // 方括号在课文源文件里表示手动拼音，这里去掉；超出基本平面的字符（emoji 等）也去掉
  const body = [...text.replace(/[[\]［］]/g, '')].filter((c) => c.length === 1).join('').slice(0, ARTICLE_MAX_CHARS);
  const parts = splitArticle(body);
  if (parts.length === 0) throw new Error('文章里没有汉字');
  const unknown = new Set<string>();
  const segments = parts.map((part, i) => {
    const r = annotateBody(part, pinyinFn);
    for (const u of r.unknown) unknown.add(u.char);
    return { id: `s${i + 1}`, title: `第 ${i + 1} 段`, tokens: r.tokens };
  });
  return {
    book: {
      id: `${CUSTOM_BOOK_PREFIX}${now.toString(36)}`,
      title: name,
      author: '我的文章',
      grade: 0,
      term: '通用',
      theme: '我的文章',
      skinId: '',
      skinName: '',
      cover: '#8B6CFF',
      mark: [...name][0],
      kind: 'prose',
      segments,
    },
    unknown: [...unknown],
  };
}

/** 拼音库比较大，用到时才加载（打包成单独的文件） */
export async function loadPinyinFn(): Promise<PinyinFn> {
  const { pinyin } = await import('pinyin-pro');
  return (text) => pinyin(text, { type: 'all' }).map((x) => ({ origin: x.origin, pinyin: x.pinyin, isZh: x.isZh, polyphonic: x.polyphonic }));
}
```

- [ ] **Step 5: 登记导入的书**

`src/content/library.ts`：

```ts
let CUSTOM = new Map<string, Book>();

/** 家长导入的文章：存档变化时由 ProfileProvider 登记 */
export function setCustomBooks(books: Book[]): void {
  CUSTOM = new Map(books.map((b) => [b.id, b]));
}

export function listCustomBooks(): Book[] {
  return [...CUSTOM.values()];
}
```

`getBook` 改成 `return READY.get(id) ?? CUSTOM.get(id) ?? null;`。

`src/storage/ProfileContext.tsx`：加 import `import { setCustomBooks } from '../content/library';`，在 `const value = useMemo(...)` 前面加：

```tsx
  // 在子组件渲染前登记导入的文章，getBook 才找得到
  useMemo(() => setCustomBooks(state.store.customBooks), [state.store.customBooks]);
```

`src/rewards/rewards.ts`：加 import `import { CUSTOM_BOOK_PREFIX } from '../content/schema';`，`finishedBookIds` 的 filter 第一行改成：

```ts
    .filter(([id, progress]) => {
      if (id.startsWith(CUSTOM_BOOK_PREFIX)) return false;
      const book = getBook(id);
```

- [ ] **Step 6: 书架显示「我的文章」**

`src/pages/Bookshelf.tsx`：
1. `const { profile } = useProfile();` 改成 `const { profile, store } = useProfile();`。
2. 在古诗词那行 `<Shelf term="通用" title="古诗词小站" … />` 后面加：

```tsx
        {store.customBooks.length > 0 && (
          <Shelf
            term="通用"
            title="我的文章"
            note="家长导入的文章"
            books={store.customBooks.map(({ segments, ...meta }) => ({ ...meta, ready: true, segmentIds: segments.map((s) => s.id) }))}
            doneOf={doneOf}
            skinsOwned={profile.skinsOwned}
          />
        )}
```

3. `BookCard` 里显示大皮肤的那行 `<div className="book-reward">…</div>` 改成只在 `book.skinName` 不为空时显示：

```tsx
      {book.skinName && <div className="book-reward">{granted ? `已获得大皮肤「${book.skinName}」` : `读完送大皮肤「${book.skinName}」`}</div>}
```

- [ ] **Step 7: 家长中心加「导入文章」卡片**

`src/pages/Parent.tsx`：
1. import 里加 `import { ARTICLE_MAX_CHARS, buildCustomBook, loadPinyinFn } from '../content/importArticle';`，`../storage/profile` 的 import 加 `addCustomBook, removeCustomBook`。
2. 文件末尾加组件：

```tsx
function ArticleImport() {
  const { store, updateStore } = useProfile();
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const create = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const fn = await loadPinyinFn();
      const { book, unknown } = buildCustomBook(title, text, fn);
      updateStore((s) => addCustomBook(s, book));
      setTitle('');
      setText('');
      const skipped = unknown.length > 0 ? ` 这些字标不出拼音，练习时会自动跳过：${unknown.join(' ')}` : '';
      setMsg({ ok: true, text: `已生成《${book.title}》，共 ${book.segments.length} 段，在读书岛的「我的文章」里。${skipped}` });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : '生成失败' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card">
      <h2 className="display">导入文章</h2>
      <p className="parent-note">粘贴一篇文章（最多 {ARTICLE_MAX_CHARS} 字），自动标上拼音，切成一段一段放进读书岛。多音字由程序自动判断，可能有个别读音不准。</p>
      <input className="text-input" aria-label="文章标题" placeholder="标题，比如：小猫钓鱼" maxLength={20} value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea aria-label="文章内容" rows={6} maxLength={ARTICLE_MAX_CHARS} value={text} onChange={(e) => setText(e.target.value)} />
      <div className="row spread">
        <span className="parent-note">
          {text.length} / {ARTICLE_MAX_CHARS} 字
        </span>
        <button type="button" className="btn btn-primary" disabled={busy || !text.trim()} onClick={create}>
          {busy ? '正在生成…' : '生成练习'}
        </button>
      </div>
      {msg && <p className={msg.ok ? 'msg-ok' : 'msg-bad'}>{msg.text}</p>}
      {store.customBooks.map((b) => (
        <div key={b.id} className="kid-row">
          <span>
            《{b.title}》 · {b.segments.length} 段
          </span>
          {confirmId === b.id ? (
            <button
              type="button"
              className="btn"
              aria-label={`确定删除《${b.title}》`}
              onClick={() => {
                updateStore((s) => removeCustomBook(s, b.id));
                setConfirmId(null);
              }}
            >
              确定删除
            </button>
          ) : (
            <button type="button" className="btn" aria-label={`删除《${b.title}》`} onClick={() => setConfirmId(b.id)}>
              删除
            </button>
          )}
        </div>
      ))}
    </section>
  );
}
```

3. 在 `ParentCenter` 的 `parent-grid` 里、「备份和恢复」卡片前面放 `<ArticleImport />`。

- [ ] **Step 8: 运行，确认通过**

Run: `npm test`、`npx tsc --noEmit; echo "tsc exit: $?"`、`npm run build`
Expected: 全部 PASS，`tsc exit: 0`；构建输出里 pinyin-pro 是单独的一个 js 文件（不在 index-*.js 里）。

- [ ] **Step 9: 提交**

```bash
git add package.json package-lock.json src/content src/storage/ProfileContext.tsx src/rewards src/pages/Bookshelf.tsx src/pages/Bookshelf.test.tsx src/pages/Parent.tsx src/pages/Parent.test.tsx
git commit -m "feat: 家长导入文章，生成「我的文章」"
```

---

### Task 7: PWA 离线

**Files:**
- Create: `scripts/make-icons.ts`, `public/icon-192.png`, `public/icon-512.png`, `public/apple-touch-icon.png`
- Modify: `package.json`, `vite.config.ts`, `index.html`

- [ ] **Step 1: 安装 vite-plugin-pwa**

Run: `npm view vite-plugin-pwa@1 version peerDependencies --json`，选支持 vite 6 的最新 1.x 版本，然后 `npm install --save-exact --save-dev vite-plugin-pwa@<那个版本>`。

- [ ] **Step 2: 写 `scripts/make-icons.ts`（生成键宝图标，不依赖图像库）**

```ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

type RGB = [number, number, number];
const SUN: RGB = [255, 201, 60];
const INK: RGB = [31, 42, 68];
const WHITE: RGB = [255, 255, 255];

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size: number, pixel: (x: number, y: number) => RGB): Buffer {
  const stride = size * 3 + 1;
  const raw = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixel(x, y);
      const o = y * stride + 1 + x * 3;
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

function inRoundRect(x: number, y: number, x0: number, y0: number, x1: number, y1: number, r: number): boolean {
  const cx = Math.min(Math.max(x, x0 + r), x1 - r);
  const cy = Math.min(Math.max(y, y0 + r), y1 - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

/** 黄色底上一个白色键帽（深蓝描边和投影）、两只眼睛、一个小凸点；都在中间 80% 的安全区里 */
function keycap(size: number) {
  return (px: number, py: number): RGB => {
    const x = (px + 0.5) / size;
    const y = (py + 0.5) / size;
    if ((x - 0.4) ** 2 + (y - 0.47) ** 2 < 0.045 ** 2 || (x - 0.6) ** 2 + (y - 0.47) ** 2 < 0.045 ** 2) return INK;
    if (inRoundRect(x, y, 0.42, 0.62, 0.58, 0.665, 0.02)) return INK;
    if (inRoundRect(x, y, 0.23, 0.24, 0.77, 0.78, 0.11)) return WHITE;
    if (inRoundRect(x, y, 0.2, 0.21, 0.8, 0.85, 0.14)) return INK;
    return SUN;
  };
}

mkdirSync('public', { recursive: true });
for (const [name, size] of [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180],
] as const) {
  writeFileSync(`public/${name}`, png(size, keycap(size)));
  console.log(`已生成 public/${name}`);
}
```

`package.json` 的 scripts 里加 `"icons": "tsx scripts/make-icons.ts"`，然后 Run: `npm run icons`。用 Read 工具打开 `public/icon-192.png` 看一眼：黄底、白键帽、两只眼睛。

- [ ] **Step 3: 改 `vite.config.ts`**

```ts
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: '小键盘大冒险',
        short_name: '小键盘',
        description: '4–6 年级儿童打字练习：边读课外书，边学打字',
        lang: 'zh-CN',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#E3F2FF',
        theme_color: '#FFC93C',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // 只缓存 woff2，不缓存 .woff（同一字体的旧格式，白占空间）
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,webmanifest}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
    }),
  ],
  base: './',
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    testTimeout: 15000,
  },
});
```

- [ ] **Step 4: 改 `index.html`**

`<title>` 下面加：

```html
    <meta name="theme-color" content="#FFC93C" />
    <meta name="description" content="4–6 年级儿童打字练习：边读课外书，边学打字" />
    <link rel="icon" type="image/png" href="icon-192.png" />
    <link rel="apple-touch-icon" href="apple-touch-icon.png" />
```

- [ ] **Step 5: 构建并检查**

Run: `npm test`、`npm run build`
Expected: 测试全部 PASS；构建成功，`dist/` 里有 `sw.js`、`manifest.webmanifest`、三个图标；构建日志里 precache 的文件列表没有 `.woff`（只有 `.woff2`）。用 `ls dist` 和 `grep -c "\.woff\"" dist/sw.js`（应为 0）确认。

- [ ] **Step 6: 提交**

```bash
git add scripts/make-icons.ts public package.json package-lock.json vite.config.ts index.html
git commit -m "feat: PWA 离线和应用图标"
```

---

### Task 8: 构建和浏览器验收

- [ ] `npm test`、`npm run build` 通过。
- [ ] 清空本机数据后打开：先出现「欢迎来到小键盘大冒险！」，三步建档后进首页，头部显示头像和昵称。
- [ ] 首页点头像 → 换人页 → 加一个小朋友 → 两个孩子能来回切换，各自进度分开。
- [ ] 练习页：打字有声音（家长中心关掉声音后没有）；系统有中文语音时显示「听一听」并能朗读。
- [ ] 家长中心：算术题进入；近 7 天、易错键正确；改每日时长为 10 分钟，练够后键宝提醒休息。
- [ ] 导入一篇 300 字左右的文章，读书岛出现「我的文章」，能点进去打字。
- [ ] 导出备份，再导入一个坏文件（提示原因、数据不变），再导入刚才的备份（恢复成功）。
- [ ] `npm run preview` 打开，确认 Service Worker 注册成功（`navigator.serviceWorker.controller` 刷新后不为空）。

---

## 完成标准

- `npm test`、`npm run build` 通过。
- 上面验收清单全部走通。
- Mac Safari / Chrome、Windows Edge / Chrome 的实机验收（尤其是中文输入法提示、语音、安装到桌面）留给用户在真机上做。
