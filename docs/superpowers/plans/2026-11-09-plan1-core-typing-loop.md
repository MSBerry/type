# 计划 1：核心打字闭环 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 做出一个能在 Mac / Windows 浏览器里运行的网页：孩子从首页进入读书岛，选《西游记》，用拼音直打完成一段，看到成绩和读书小考考，进度保存在本机。

**Architecture:** Vite + React + TypeScript 单页应用，用 hash 路由。核心逻辑（打字引擎、统计、内容校验、存档）全部写成纯 TypeScript 函数，用 Vitest 单测。界面组件只负责显示和把键盘事件交给引擎。课文先写成 `.txt` 源文件，用脚本借助 pinyin-pro 生成带拼音的 JSON。

**Tech Stack:** Node 24、Vite 6.4、React 19.1、TypeScript 5.9、Vitest 4.1 + Testing Library + jsdom、pinyin-pro 3.29、tsx、@fontsource（站酷快乐体、Fredoka）

**设计依据:** `docs/superpowers/specs/2026-11-09-kids-typing-design.md`；视觉稿 https://claude.ai/artifact/7YWKQKkXZvTSFnaS8UStKe

---

## 整体路线（第一版拆成 4 个计划，每个都能单独运行、测试）

| 计划 | 内容 | 依赖 |
|---|---|---|
| **计划 1（本文件）** | 脚手架、拼音直打引擎、统计、内容格式与制作脚本、《西游记》样章、存档、首页（简版）、读书岛、打字练习页、结算页 | 无 |
| 计划 2 | 奖励与皮肤：规则模块（500 字小皮肤、读完一本书、速度等级）、键宝分层换装、衣橱、结算页奖励弹窗、徽章、今日任务、首页速度等级卡 | 计划 1 |
| 计划 3 | 指法训练营（12 关）、拼音快打、龙宫泡泡游戏 | 计划 1、2 |
| 计划 4 | 首次启动、家长中心（统计、时长提醒、导入文章、备份恢复）、听一听与音效、PWA 离线、6 本书内容填充、跨平台验收 | 计划 1–3 |

计划 1 里，首页上「指法训练营 / 拼音快打 / 游戏乐园」先显示「即将开放」；书架上没有内容的书显示「即将上线」。

## 文件结构

```
package.json / tsconfig.json / vite.config.ts / index.html / .gitignore
content-src/xiyouji.txt            课文源文件（人写的）
scripts/annotate.ts                源文件 → 带拼音 JSON
scripts/validate.ts                校验所有书的 JSON
src/
  main.tsx                         挂载应用、加载字体和全局样式
  App.tsx                          路由分发、存储提示条
  router.ts                        极简 hash 路由
  theme.css                        颜色、字体、按钮/卡片等通用样式
  test-setup.ts                    测试初始化
  engine/types.ts                  Token、Session 类型
  engine/session.ts                打字引擎（纯函数）
  engine/stats.ts                  速度、正确率、星星、易错键、成绩对象
  engine/fingers.ts                键位 → 手指映射
  content/pinyinKey.ts             带声调拼音 → 按键序列（ü→v）
  content/schema.ts                书和段落的类型、校验
  content/sourceFormat.ts          解析 .txt 源文件
  content/annotate.ts              给正文标拼音（不直接依赖 pinyin-pro）
  content/shelf.ts                 全部书目（含「即将上线」）
  content/library.ts               读取已上线的书、按年级分组
  content/books/xiyouji.json       脚本生成，不要手改
  storage/profile.ts               档案类型、读写本机存储、记录成绩
  storage/ProfileContext.tsx       React 上下文
  hooks/useTypingInput.ts          监听键盘、识别中文输入法、失焦暂停
  ui/Mascot.tsx                    吉祥物键宝
  ui/ProgressBar.tsx / ui/StarRow.tsx
  ui/Keyboard.tsx + Keyboard.css   屏幕键盘 + 手指样式
  ui/Hands.tsx                     手指提示
  ui/Passage.tsx + Passage.css     拼音 + 汉字段落
  pages/coach.ts                   键宝的鼓励语
  pages/format.ts                  时长、标题文案
  pages/Home.tsx + Home.css
  pages/Bookshelf.tsx + Bookshelf.css
  pages/Practice.tsx + Practice.css
  pages/Result.tsx + Result.css
```

测试文件和被测文件放在一起，命名为 `*.test.ts(x)`。

---

### Task 1: 项目脚手架

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore`, `src/main.tsx`, `src/App.tsx`, `src/test-setup.ts`
- Test: `src/App.test.tsx`

- [ ] **Step 1: 初始化 git 仓库**

```bash
cd "F:/workSpace/打字"
git init -b main
```

Expected: `Initialized empty Git repository in .../打字/.git/`

- [ ] **Step 2: 写 `package.json`**

```json
{
  "name": "kbd-adventure",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "npm run validate && tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "annotate": "tsx scripts/annotate.ts",
    "validate": "tsx scripts/validate.ts"
  },
  "dependencies": {
    "@fontsource/fredoka": "5.3.0",
    "@fontsource/zcool-kuaile": "5.3.0",
    "react": "19.1.10",
    "react-dom": "19.1.10"
  },
  "devDependencies": {
    "@testing-library/dom": "10.4.2",
    "@testing-library/jest-dom": "6.9.1",
    "@testing-library/react": "16.3.3",
    "@testing-library/user-event": "14.6.8",
    "@types/node": "22.20.5",
    "@types/react": "19.1.17",
    "@types/react-dom": "19.1.11",
    "@vitejs/plugin-react": "4.7.0",
    "jsdom": "26.1.0",
    "pinyin-pro": "3.29.5",
    "tsx": "4.19.4",
    "typescript": "5.9.3",
    "vite": "6.4.5",
    "vitest": "4.1.12"
  }
}
```

- [ ] **Step 3: 写 `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["node", "vite/client"]
  },
  "include": ["src", "scripts", "vite.config.ts"]
}
```

- [ ] **Step 4: 写 `vite.config.ts`**

```ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  base: './',
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
```

- [ ] **Step 5: 写 `index.html`**

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>小键盘大冒险</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: 写 `.gitignore`**

```
node_modules
dist
*.log
.DS_Store
```

- [ ] **Step 7: 写测试初始化 `src/test-setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
  localStorage.clear();
  window.location.hash = '';
});
```

- [ ] **Step 8: 写临时的 `src/App.tsx` 和 `src/main.tsx`**

`src/App.tsx`（Task 19 会整个替换）：

```tsx
export default function App() {
  return <h1>小键盘大冒险</h1>;
}
```

`src/main.tsx`（Task 12 会补充字体和样式）：

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 9: 写一个冒烟测试 `src/App.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import App from './App';

it('能渲染出应用名字', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: '小键盘大冒险' })).toBeInTheDocument();
});
```

- [ ] **Step 10: 安装依赖并运行测试**

```bash
npm install
npm test
```

Expected: `npm install` 无报错；测试输出 `1 passed`。

- [ ] **Step 11: 提交**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts index.html .gitignore src docs
git commit -m "chore: 搭建 Vite + React + TypeScript 项目"
```

---

### Task 2: 键位 → 手指映射

**Files:**
- Create: `src/engine/fingers.ts`
- Test: `src/engine/fingers.test.ts`

- [ ] **Step 1: 写失败的测试**

```ts
import { describe, expect, it } from 'vitest';
import { FINGER_NAME, KEY_ROWS, fingerOf } from './fingers';

describe('fingerOf', () => {
  it('按标准指法分配手指，大小写一样', () => {
    expect(fingerOf('f')).toBe('li');
    expect(fingerOf('J')).toBe('ri');
    expect(fingerOf('a')).toBe('lp');
    expect(fingerOf(';')).toBe('rp');
    expect(fingerOf('k')).toBe('rm');
    expect(fingerOf('o')).toBe('rr');
  });

  it('空格和不认识的键都归大拇指', () => {
    expect(fingerOf(' ')).toBe('th');
    expect(fingerOf('1')).toBe('th');
  });

  it('键盘上的每个键都有手指（不是大拇指）', () => {
    for (const row of KEY_ROWS) for (const k of row) expect(fingerOf(k)).not.toBe('th');
  });

  it('手指有中文名字', () => {
    expect(FINGER_NAME[fingerOf('h')]).toBe('右手食指');
  });
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `npx vitest run src/engine/fingers.test.ts`
Expected: FAIL，提示找不到 `./fingers`

- [ ] **Step 3: 实现 `src/engine/fingers.ts`**

```ts
export type Finger = 'lp' | 'lr' | 'lm' | 'li' | 'ri' | 'rm' | 'rr' | 'rp' | 'th';

export const KEY_ROWS: string[][] = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/'],
];

export const HOME_KEYS = ['f', 'j'];

const FINGER_BY_KEY: Record<string, Finger> = {
  q: 'lp', a: 'lp', z: 'lp',
  w: 'lr', s: 'lr', x: 'lr',
  e: 'lm', d: 'lm', c: 'lm',
  r: 'li', t: 'li', f: 'li', g: 'li', v: 'li', b: 'li',
  y: 'ri', u: 'ri', h: 'ri', j: 'ri', n: 'ri', m: 'ri',
  i: 'rm', k: 'rm', ',': 'rm',
  o: 'rr', l: 'rr', '.': 'rr',
  p: 'rp', ';': 'rp', '/': 'rp',
};

export function fingerOf(key: string): Finger {
  return FINGER_BY_KEY[key.toLowerCase()] ?? 'th';
}

export const FINGER_NAME: Record<Finger, string> = {
  lp: '左手小指',
  lr: '左手无名指',
  lm: '左手中指',
  li: '左手食指',
  ri: '右手食指',
  rm: '右手中指',
  rr: '右手无名指',
  rp: '右手小指',
  th: '大拇指',
};

export const FINGER_TINT: Record<Finger, string> = {
  lp: '#EDE6FF',
  rp: '#EDE6FF',
  lr: '#DDF5EA',
  rr: '#DDF5EA',
  lm: '#DCEBFF',
  rm: '#DCEBFF',
  li: '#FFE6D3',
  ri: '#FFE6D3',
  th: '#F1F3F8',
};
```

- [ ] **Step 4: 运行，确认通过**

Run: `npx vitest run src/engine/fingers.test.ts`
Expected: PASS（4 个测试）

- [ ] **Step 5: 提交**

```bash
git add src/engine/fingers.ts src/engine/fingers.test.ts
git commit -m "feat: 键位到手指的映射"
```

---

### Task 3: 带声调拼音 → 按键序列

**Files:**
- Create: `src/content/pinyinKey.ts`
- Test: `src/content/pinyinKey.test.ts`

- [ ] **Step 1: 写失败的测试**

```ts
import { describe, expect, it } from 'vitest';
import { toKey } from './pinyinKey';

describe('toKey', () => {
  it('去掉声调', () => {
    expect(toKey('zhōng')).toBe('zhong');
    expect(toKey('hǎi')).toBe('hai');
    expect(toKey('xué')).toBe('xue');
  });

  it('ü 一律打成 v', () => {
    expect(toKey('nǚ')).toBe('nv');
    expect(toKey('lǜ')).toBe('lv');
    expect(toKey('lü')).toBe('lv');
  });

  it('j q x y 后面按课本写法打 u', () => {
    expect(toKey('qù')).toBe('qu');
    expect(toKey('yú')).toBe('yu');
  });

  it('大写也转成小写', () => {
    expect(toKey('Hǎi')).toBe('hai');
  });
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `npx vitest run src/content/pinyinKey.test.ts`
Expected: FAIL，提示找不到 `./pinyinKey`

- [ ] **Step 3: 实现 `src/content/pinyinKey.ts`**

```ts
const U_UMLAUT = /[üǖǘǚǜ]/g;

/** 把「zhōng」「nǚ」这样的带声调拼音变成要按的字母：zhong、nv */
export function toKey(tonePinyin: string): string {
  return tonePinyin
    .toLowerCase()
    .replace(U_UMLAUT, 'v')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}
```

- [ ] **Step 4: 运行，确认通过**

Run: `npx vitest run src/content/pinyinKey.test.ts`
Expected: PASS（4 个测试）

- [ ] **Step 5: 提交**

```bash
git add src/content/pinyinKey.ts src/content/pinyinKey.test.ts
git commit -m "feat: 拼音转按键序列（ü 打 v）"
```

---

### Task 4: 拼音直打引擎

**Files:**
- Create: `src/engine/types.ts`, `src/engine/session.ts`
- Test: `src/engine/session.test.ts`

- [ ] **Step 1: 写类型 `src/engine/types.ts`**

```ts
export type HanziToken = { kind: 'hanzi'; char: string; key: string; tone: string };
export type SkipToken = { kind: 'skip'; char: string };
export type Token = HanziToken | SkipToken;

export type Session = {
  tokens: Token[];
  /** tokens 里所有汉字的下标 */
  hanziIdx: number[];
  /** 当前是第几个汉字（hanziIdx 的下标），也等于已完成的汉字数 */
  cursor: number;
  /** 当前汉字已经打到第几个字母 */
  pos: number;
  right: number;
  wrong: number;
  streak: number;
  /** 刚才按错的键，下次按对后清空 */
  lastWrongKey: string | null;
  /** 应该按的键 → 按错次数 */
  errorsByKey: Record<string, number>;
  /** 有效打字时间（毫秒） */
  activeMs: number;
  lastPressAt: number | null;
  done: boolean;
};

export type PressResult = 'right' | 'wrong' | 'ignored';
```

- [ ] **Step 2: 写失败的测试 `src/engine/session.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import type { Session, Token } from './types';
import { IDLE_CAP_MS, createSession, currentToken, expectedKey, pause, press, tokenStatus } from './session';

const TOKENS: Token[] = [
  { kind: 'hanzi', char: '你', key: 'ni', tone: 'nǐ' },
  { kind: 'hanzi', char: '好', key: 'hao', tone: 'hǎo' },
  { kind: 'skip', char: '，' },
  { kind: 'hanzi', char: '海', key: 'hai', tone: 'hǎi' },
];

function typeAll(s: Session, keys: string, start = 0, step = 100): Session {
  let cur = s;
  [...keys].forEach((k, i) => {
    cur = press(cur, k, start + i * step).session;
  });
  return cur;
}

describe('createSession', () => {
  it('从第一个汉字的第一个字母开始', () => {
    const s = createSession(TOKENS);
    expect(s.cursor).toBe(0);
    expect(s.pos).toBe(0);
    expect(currentToken(s)?.char).toBe('你');
    expect(expectedKey(s)).toBe('n');
    expect(s.done).toBe(false);
  });

  it('没有汉字时直接算完成', () => {
    expect(createSession([{ kind: 'skip', char: '。' }]).done).toBe(true);
  });
});

describe('press', () => {
  it('按对了前进一个字母，打完一个字跳到下一个字', () => {
    let s = createSession(TOKENS);
    const r = press(s, 'n', 0);
    expect(r.result).toBe('right');
    s = r.session;
    expect(s.pos).toBe(1);
    s = press(s, 'i', 100).session;
    expect(currentToken(s)?.char).toBe('好');
    expect(s.pos).toBe(0);
  });

  it('标点自动跳过', () => {
    const s = typeAll(createSession(TOKENS), 'nihao');
    expect(currentToken(s)?.char).toBe('海');
    expect(s.cursor).toBe(2);
  });

  it('按错不前进，记下错键和应该按的键', () => {
    const r = press(createSession(TOKENS), 'x', 0);
    expect(r.result).toBe('wrong');
    expect(r.session.pos).toBe(0);
    expect(r.session.wrong).toBe(1);
    expect(r.session.streak).toBe(0);
    expect(r.session.lastWrongKey).toBe('x');
    expect(r.session.errorsByKey).toEqual({ n: 1 });
  });

  it('按对后清掉错键标记，连对数累加', () => {
    let s = press(createSession(TOKENS), 'x', 0).session;
    s = press(s, 'n', 100).session;
    expect(s.lastWrongKey).toBeNull();
    expect(s.streak).toBe(1);
  });

  it('大写字母也算对', () => {
    expect(press(createSession(TOKENS), 'N', 0).result).toBe('right');
  });

  it('数字、空格、功能键都忽略，不算错', () => {
    const s = createSession(TOKENS);
    for (const k of ['1', ' ', 'Shift', 'Enter', ';']) {
      const r = press(s, k, 0);
      expect(r.result).toBe('ignored');
      expect(r.session).toBe(s);
    }
  });

  it('全部打完后 done，再按也忽略', () => {
    const s = typeAll(createSession(TOKENS), 'nihaohai');
    expect(s.done).toBe(true);
    expect(expectedKey(s)).toBeNull();
    expect(currentToken(s)).toBeNull();
    expect(press(s, 'a', 9999).result).toBe('ignored');
  });

  it('两次按键间隔最多只算 5 秒', () => {
    let s = createSession(TOKENS);
    s = press(s, 'n', 0).session;
    s = press(s, 'i', 1000).session;
    s = press(s, 'h', 20000).session;
    expect(IDLE_CAP_MS).toBe(5000);
    expect(s.activeMs).toBe(6000);
  });

  it('暂停后，下一次按键不计入等待时间', () => {
    let s = press(createSession(TOKENS), 'n', 0).session;
    s = pause(s);
    s = press(s, 'i', 3000).session;
    expect(s.activeMs).toBe(0);
  });
});

describe('tokenStatus', () => {
  it('区分已完成、当前、未开始；中间的标点跟着前面的字', () => {
    const s = typeAll(createSession(TOKENS), 'nihao');
    expect(tokenStatus(s, 0)).toBe('done');
    expect(tokenStatus(s, 1)).toBe('done');
    expect(tokenStatus(s, 2)).toBe('done');
    expect(tokenStatus(s, 3)).toBe('current');
  });

  it('打完后全部算已完成', () => {
    const s = typeAll(createSession(TOKENS), 'nihaohai');
    expect(TOKENS.map((_, i) => tokenStatus(s, i))).toEqual(['done', 'done', 'done', 'done']);
  });
});
```

- [ ] **Step 3: 运行，确认失败**

Run: `npx vitest run src/engine/session.test.ts`
Expected: FAIL，提示找不到 `./session`

- [ ] **Step 4: 实现 `src/engine/session.ts`**

```ts
import type { HanziToken, PressResult, Session, Token } from './types';

/** 两次按键之间最多计入 5 秒，停下来读书不会拉低速度 */
export const IDLE_CAP_MS = 5000;

export function createSession(tokens: Token[]): Session {
  const hanziIdx: number[] = [];
  tokens.forEach((t, i) => {
    if (t.kind === 'hanzi') hanziIdx.push(i);
  });
  return {
    tokens,
    hanziIdx,
    cursor: 0,
    pos: 0,
    right: 0,
    wrong: 0,
    streak: 0,
    lastWrongKey: null,
    errorsByKey: {},
    activeMs: 0,
    lastPressAt: null,
    done: hanziIdx.length === 0,
  };
}

export function currentToken(s: Session): HanziToken | null {
  if (s.done) return null;
  return s.tokens[s.hanziIdx[s.cursor]] as HanziToken;
}

export function expectedKey(s: Session): string | null {
  const t = currentToken(s);
  return t ? t.key.charAt(s.pos) : null;
}

export function tokenStatus(s: Session, index: number): 'done' | 'current' | 'todo' {
  if (s.done) return 'done';
  const cur = s.hanziIdx[s.cursor];
  if (index < cur) return 'done';
  if (index === cur) return 'current';
  return 'todo';
}

export function press(s: Session, rawKey: string, now: number): { session: Session; result: PressResult } {
  if (s.done || rawKey.length !== 1) return { session: s, result: 'ignored' };
  const key = rawKey.toLowerCase();
  if (key < 'a' || key > 'z') return { session: s, result: 'ignored' };

  const gap = s.lastPressAt === null ? 0 : Math.max(0, Math.min(now - s.lastPressAt, IDLE_CAP_MS));
  const timed: Session = { ...s, activeMs: s.activeMs + gap, lastPressAt: now };
  const want = expectedKey(s) as string;

  if (key !== want) {
    return {
      session: {
        ...timed,
        wrong: s.wrong + 1,
        streak: 0,
        lastWrongKey: key,
        errorsByKey: { ...s.errorsByKey, [want]: (s.errorsByKey[want] ?? 0) + 1 },
      },
      result: 'wrong',
    };
  }

  const tok = currentToken(s) as HanziToken;
  let cursor = s.cursor;
  let pos = s.pos + 1;
  if (pos >= tok.key.length) {
    cursor += 1;
    pos = 0;
  }
  return {
    session: {
      ...timed,
      right: s.right + 1,
      streak: s.streak + 1,
      lastWrongKey: null,
      cursor,
      pos,
      done: cursor >= s.hanziIdx.length,
    },
    result: 'right',
  };
}

/** 窗口失焦或长时间不按键时调用：下一次按键不计入等待时间 */
export function pause(s: Session): Session {
  return s.lastPressAt === null ? s : { ...s, lastPressAt: null };
}
```

- [ ] **Step 5: 运行，确认通过**

Run: `npx vitest run src/engine/session.test.ts`
Expected: PASS（13 个测试）

- [ ] **Step 6: 提交**

```bash
git add src/engine/types.ts src/engine/session.ts src/engine/session.test.ts
git commit -m "feat: 拼音直打引擎"
```

---

### Task 5: 统计与成绩

**Files:**
- Create: `src/engine/stats.ts`
- Test: `src/engine/stats.test.ts`

- [ ] **Step 1: 写失败的测试**

```ts
import { describe, expect, it } from 'vitest';
import { createSession, press } from './session';
import { accuracy, buildResult, speedCpm, starsFor, topErrorKeys } from './stats';
import type { Token } from './types';

const base = createSession([]);

describe('accuracy', () => {
  it('还没按键时算 100%', () => {
    expect(accuracy(base)).toBe(100);
  });
  it('按对次数 ÷ 总次数，四舍五入', () => {
    expect(accuracy({ ...base, right: 3, wrong: 1 })).toBe(75);
    expect(accuracy({ ...base, right: 2, wrong: 1 })).toBe(67);
  });
});

describe('speedCpm', () => {
  it('完成字数 ÷ 有效分钟', () => {
    expect(speedCpm({ ...base, cursor: 10, activeMs: 30000 })).toBe(20);
  });
  it('有效时间不到 3 秒时显示 0，避免一开始数字乱跳', () => {
    expect(speedCpm({ ...base, cursor: 2, activeMs: 2000 })).toBe(0);
  });
});

describe('starsFor', () => {
  it('95% 以上 3 星，85% 以上 2 星，其余 1 星', () => {
    expect(starsFor(100)).toBe(3);
    expect(starsFor(95)).toBe(3);
    expect(starsFor(94)).toBe(2);
    expect(starsFor(85)).toBe(2);
    expect(starsFor(84)).toBe(1);
  });
});

describe('topErrorKeys', () => {
  it('按错的次数从多到少，次数一样按字母排', () => {
    expect(topErrorKeys({ h: 1, z: 3, g: 1, a: 0, n: 2 })).toEqual([
      { key: 'z', count: 3 },
      { key: 'n', count: 2 },
      { key: 'g', count: 1 },
    ]);
  });
});

describe('buildResult', () => {
  it('汇总一段的成绩', () => {
    const tokens: Token[] = [
      { kind: 'hanzi', char: '海', key: 'hai', tone: 'hǎi' },
      { kind: 'hanzi', char: '外', key: 'wai', tone: 'wài' },
    ];
    let s = createSession(tokens);
    s = press(s, 'x', 0).session;
    for (const [i, k] of [...'haiwai'].entries()) s = press(s, k, 1000 * (i + 1)).session;
    const r = buildResult(s, 'xiyouji', 'c1-1');
    expect(r).toMatchObject({ bookId: 'xiyouji', segmentId: 'c1-1', hanzi: 2, accuracy: 86, stars: 2, activeMs: 6000 });
    expect(r.speed).toBe(20);
    expect(r.keyErrors).toEqual({ h: 1 });
    expect(r.topErrors).toEqual([{ key: 'h', count: 1 }]);
  });
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `npx vitest run src/engine/stats.test.ts`
Expected: FAIL，提示找不到 `./stats`

- [ ] **Step 3: 实现 `src/engine/stats.ts`**

```ts
import type { Session } from './types';

export function hanziDone(s: Session): number {
  return s.cursor;
}

export function accuracy(s: Session): number {
  const total = s.right + s.wrong;
  return total === 0 ? 100 : Math.round((s.right * 100) / total);
}

export function speedCpm(s: Session): number {
  if (s.activeMs < 3000) return 0;
  return Math.round(s.cursor / (s.activeMs / 60000));
}

export function starsFor(acc: number): 1 | 2 | 3 {
  if (acc >= 95) return 3;
  if (acc >= 85) return 2;
  return 1;
}

export function topErrorKeys(errors: Record<string, number>, n = 3): { key: string; count: number }[] {
  return Object.entries(errors)
    .filter(([, c]) => c > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n)
    .map(([key, count]) => ({ key, count }));
}

export type SegmentResult = {
  bookId: string;
  segmentId: string;
  hanzi: number;
  speed: number;
  accuracy: number;
  stars: 1 | 2 | 3;
  activeMs: number;
  keyErrors: Record<string, number>;
  topErrors: { key: string; count: number }[];
};

export function buildResult(s: Session, bookId: string, segmentId: string): SegmentResult {
  const acc = accuracy(s);
  return {
    bookId,
    segmentId,
    hanzi: hanziDone(s),
    speed: speedCpm(s),
    accuracy: acc,
    stars: starsFor(acc),
    activeMs: s.activeMs,
    keyErrors: { ...s.errorsByKey },
    topErrors: topErrorKeys(s.errorsByKey),
  };
}
```

说明：`buildResult` 测试里，第 1 次按 `x` 在 0 毫秒，之后 6 次按键分别在 1000…6000 毫秒，所以有效时间 = 1000×6 = 6000；2 个字 ÷ 0.1 分钟 = 20 字/分；正确率 6/7 ≈ 86%，得 2 星。

- [ ] **Step 4: 运行，确认通过**

Run: `npx vitest run src/engine/stats.test.ts`
Expected: PASS（7 个测试）

- [ ] **Step 5: 提交**

```bash
git add src/engine/stats.ts src/engine/stats.test.ts
git commit -m "feat: 速度、正确率、星星和成绩汇总"
```

---

### Task 6: 书和段落的格式与校验

**Files:**
- Create: `src/content/schema.ts`
- Test: `src/content/schema.test.ts`

- [ ] **Step 1: 写失败的测试**

```ts
import { describe, expect, it } from 'vitest';
import type { Token } from '../engine/types';
import { type Book, hanziCount, validateBook } from './schema';

function hanzi(n: number): Token[] {
  return Array.from({ length: n }, () => ({ kind: 'hanzi' as const, char: '字', key: 'zi', tone: 'zì' }));
}

function makeBook(over: Partial<Book> = {}): Book {
  return {
    id: 'demo',
    title: '示例',
    author: '测试',
    grade: 5,
    term: '下册',
    theme: '古典名著',
    skinId: 'monkey',
    skinName: '美猴王',
    cover: '#FF7A45',
    mark: '示',
    kind: 'prose',
    segments: [{ id: 's1', title: '第一段', tokens: [...hanzi(50), { kind: 'skip', char: '。' }], quiz: { q: '问题', options: ['甲', '乙'], answer: 0 } }],
    ...over,
  };
}

describe('hanziCount', () => {
  it('只数汉字，不数标点', () => {
    expect(hanziCount(makeBook().segments[0])).toBe(50);
  });
});

describe('validateBook', () => {
  it('合格的书没有错误', () => {
    expect(validateBook(makeBook())).toEqual([]);
  });

  it('普通段落必须 40–80 字', () => {
    const errors = validateBook(makeBook({ segments: [{ id: 's1', title: 't', tokens: hanzi(10) }] }));
    expect(errors.join()).toContain('有 10 个汉字，应在 40–80 之间');
  });

  it('古诗允许 16–120 字', () => {
    expect(validateBook(makeBook({ kind: 'poem', segments: [{ id: 's1', title: 't', tokens: hanzi(20) }] }))).toEqual([]);
  });

  it('按键只能是 a–z', () => {
    const tokens: Token[] = [...hanzi(49), { kind: 'hanzi', char: '女', key: 'nü', tone: 'nǚ' }];
    expect(validateBook(makeBook({ segments: [{ id: 's1', title: 't', tokens }] })).join()).toContain('「女」');
  });

  it('段落 id 不能重复', () => {
    const seg = { id: 's1', title: 't', tokens: hanzi(50) };
    expect(validateBook(makeBook({ segments: [seg, seg] })).join()).toContain('段落 id 重复');
  });

  it('小考考答案下标不能越界', () => {
    const errors = validateBook(makeBook({ segments: [{ id: 's1', title: 't', tokens: hanzi(50), quiz: { q: '?', options: ['甲', '乙'], answer: 2 } }] }));
    expect(errors.join()).toContain('答案下标越界');
  });

  it('没有段落、没有皮肤都要报错', () => {
    const errors = validateBook(makeBook({ segments: [], skinId: '' }));
    expect(errors.join()).toContain('没有任何段落');
    expect(errors.join()).toContain('skinId');
  });
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `npx vitest run src/content/schema.test.ts`
Expected: FAIL，提示找不到 `./schema`

- [ ] **Step 3: 实现 `src/content/schema.ts`**

```ts
import type { Token } from '../engine/types';

export type Quiz = { q: string; options: string[]; answer: number };
export type Segment = { id: string; title: string; tokens: Token[]; quiz?: Quiz };
export type BookKind = 'prose' | 'poem';

export type BookMeta = {
  id: string;
  title: string;
  author: string;
  /** 0 表示通用（古诗词小站） */
  grade: 0 | 4 | 5 | 6;
  term: '上册' | '下册' | '通用';
  theme: string;
  skinId: string;
  skinName: string;
  /** 封面底色 */
  cover: string;
  /** 封面上的大字 */
  mark: string;
  kind: BookKind;
};

export type Book = BookMeta & { segments: Segment[] };

export const SEGMENT_RANGE: Record<BookKind, [number, number]> = {
  prose: [40, 80],
  poem: [16, 120],
};

export function hanziCount(seg: Segment): number {
  return seg.tokens.filter((t) => t.kind === 'hanzi').length;
}

export function validateBook(book: Book): string[] {
  const errors: string[] = [];
  if (!book.skinId) errors.push(`${book.id}: 缺少 skinId`);
  if (book.segments.length === 0) errors.push(`${book.id}: 没有任何段落`);
  const [min, max] = SEGMENT_RANGE[book.kind];
  const seen = new Set<string>();
  for (const seg of book.segments) {
    const where = `${book.id}/${seg.id}`;
    if (seen.has(seg.id)) errors.push(`${where}: 段落 id 重复`);
    seen.add(seg.id);
    const n = hanziCount(seg);
    if (n < min || n > max) errors.push(`${where}: 有 ${n} 个汉字，应在 ${min}–${max} 之间`);
    seg.tokens.forEach((t, i) => {
      if ([...t.char].length !== 1) errors.push(`${where} 第 ${i + 1} 个字符: char 必须是单个字符`);
      if (t.kind === 'hanzi' && !/^[a-z]+$/.test(t.key)) {
        errors.push(`${where} 第 ${i + 1} 个字符「${t.char}」: 按键「${t.key}」只能包含 a–z`);
      }
    });
    if (seg.quiz) {
      const { options, answer } = seg.quiz;
      if (options.length < 2) errors.push(`${where}: 小考考至少要 2 个选项`);
      if (!Number.isInteger(answer) || answer < 0 || answer >= options.length) errors.push(`${where}: 小考考答案下标越界`);
    }
  }
  return errors;
}
```

- [ ] **Step 4: 运行，确认通过**

Run: `npx vitest run src/content/schema.test.ts`
Expected: PASS（8 个测试）

- [ ] **Step 5: 提交**

```bash
git add src/content/schema.ts src/content/schema.test.ts
git commit -m "feat: 书和段落的数据格式与校验"
```

---

### Task 7: 课文源文件解析和拼音标注

**Files:**
- Create: `src/content/sourceFormat.ts`, `src/content/annotate.ts`, `scripts/annotate.ts`
- Test: `src/content/sourceFormat.test.ts`, `src/content/annotate.test.ts`

课文源文件的格式如下。内容编辑只需要写这种 `.txt`，不用碰 JSON：

```
# 井号开头是注释
id: xiyouji              ← 书的信息，「字段: 值」，必须写全 11 个字段
...
=== c1-1 | 第一回 · 标题   ← 段落开始：=== 段落id | 段落标题
正文可以分多行写，会直接拼起来。
多音字写成 字[拼音]，比如 便[biàn]。
? 问题 | *正确答案 | 错误答案 | 错误答案   ← 小考考，可选，正确答案前加 *
```

- [ ] **Step 1: 写解析器的失败测试 `src/content/sourceFormat.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { parseSource } from './sourceFormat';

const HEADER = `# 注释
id: demo
title: 示例书
author: 某某 · 明
grade: 5
term: 下册
theme: 古典名著
skinId: monkey
skinName: 美猴王
cover: #FF7A45
mark: 示
kind: prose
`;

describe('parseSource', () => {
  it('读出书的信息、段落和小考考', () => {
    const { meta, segments } = parseSource(`${HEADER}
=== c1 | 第一段
海外有一国土，
名曰傲来国。
? 叫什么国？ | 女儿国 | *傲来国

=== c2 | 第二段
便[biàn]就学爬。
`);
    expect(meta).toMatchObject({ id: 'demo', title: '示例书', grade: 5, term: '下册', cover: '#FF7A45', kind: 'prose' });
    expect(segments).toHaveLength(2);
    expect(segments[0]).toEqual({
      id: 'c1',
      title: '第一段',
      body: '海外有一国土，名曰傲来国。',
      quiz: { q: '叫什么国？', options: ['女儿国', '傲来国'], answer: 1 },
    });
    expect(segments[1].body).toBe('便[biàn]就学爬。');
    expect(segments[1].quiz).toBeUndefined();
  });

  it('兼容 Windows 换行和 BOM', () => {
    const { segments } = parseSource(`\uFEFF${HEADER}\r\n=== c1 | 一\r\n海外。\r\n`);
    expect(segments[0].body).toBe('海外。');
  });

  it('缺字段时报错并说出字段名', () => {
    expect(() => parseSource(HEADER.replace('mark: 示\n', '') + '=== c1 | 一\n海。')).toThrow('缺少书的信息「mark」');
  });

  it('段落标题写错时报出行号', () => {
    expect(() => parseSource(`${HEADER}=== 没有竖线\n海。`)).toThrow(/第 \d+ 行：段落标题/);
  });

  it('小考考没有标正确答案时报错', () => {
    expect(() => parseSource(`${HEADER}=== c1 | 一\n海。\n? 问题 | 甲 | 乙`)).toThrow(/小考考/);
  });

  it('年级不合法时报错', () => {
    expect(() => parseSource(HEADER.replace('grade: 5', 'grade: 3') + '=== c1 | 一\n海。')).toThrow('grade');
  });
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `npx vitest run src/content/sourceFormat.test.ts`
Expected: FAIL，提示找不到 `./sourceFormat`

- [ ] **Step 3: 实现 `src/content/sourceFormat.ts`**

```ts
import type { BookKind, BookMeta, Quiz } from './schema';

export type RawSegment = { id: string; title: string; body: string; quiz?: Quiz };
export type ParsedSource = { meta: BookMeta; segments: RawSegment[] };

const REQUIRED = ['id', 'title', 'author', 'grade', 'term', 'theme', 'skinId', 'skinName', 'cover', 'mark', 'kind'] as const;

export function parseSource(text: string): ParsedSource {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  const header: Record<string, string> = {};
  const segments: RawSegment[] = [];
  let cur: RawSegment | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const at = `第 ${i + 1} 行`;
    if (line === '' || line.startsWith('#')) continue;

    if (line.startsWith('===')) {
      const m = /^===\s*([A-Za-z0-9_-]+)\s*\|\s*(.+)$/.exec(line);
      if (!m) throw new Error(`${at}：段落标题应写成「=== 段落id | 标题」`);
      cur = { id: m[1], title: m[2].trim(), body: '' };
      segments.push(cur);
      continue;
    }

    if (cur === null) {
      const m = /^([A-Za-z]+)\s*:\s*(.+)$/.exec(line);
      if (!m) throw new Error(`${at}：书的信息应写成「字段: 值」`);
      header[m[1]] = m[2].trim();
      continue;
    }

    if (line.startsWith('?')) {
      const [q, ...opts] = line
        .slice(1)
        .split('|')
        .map((s) => s.trim())
        .filter(Boolean);
      const answer = opts.findIndex((o) => o.startsWith('*'));
      if (!q || opts.length < 2 || answer < 0) throw new Error(`${at}：小考考应写成「? 问题 | *正确答案 | 错误答案」`);
      cur.quiz = { q, options: opts.map((o) => o.replace(/^\*/, '').trim()), answer };
      continue;
    }

    cur.body += line;
  }

  for (const k of REQUIRED) if (!header[k]) throw new Error(`缺少书的信息「${k}」`);
  const grade = Number(header.grade);
  if (![0, 4, 5, 6].includes(grade)) throw new Error('grade 只能是 0、4、5、6');
  if (!['上册', '下册', '通用'].includes(header.term)) throw new Error('term 只能是 上册、下册、通用');
  if (!['prose', 'poem'].includes(header.kind)) throw new Error('kind 只能是 prose 或 poem');
  if (segments.length === 0) throw new Error('至少要有一个段落（=== 开头）');

  const meta: BookMeta = {
    id: header.id,
    title: header.title,
    author: header.author,
    grade: grade as BookMeta['grade'],
    term: header.term as BookMeta['term'],
    theme: header.theme,
    skinId: header.skinId,
    skinName: header.skinName,
    cover: header.cover,
    mark: header.mark,
    kind: header.kind as BookKind,
  };
  return { meta, segments };
}
```

- [ ] **Step 4: 运行，确认通过**

Run: `npx vitest run src/content/sourceFormat.test.ts`
Expected: PASS（6 个测试）

- [ ] **Step 5: 写标注器的失败测试 `src/content/annotate.test.ts`**

这里直接用真实的 pinyin-pro，确保和库的实际输出对得上。

```ts
import { pinyin } from 'pinyin-pro';
import { describe, expect, it } from 'vitest';
import { type PinyinFn, annotateBody } from './annotate';

const realPinyin: PinyinFn = (text) =>
  pinyin(text, { type: 'all' }).map((x) => ({ origin: x.origin, pinyin: x.pinyin, isZh: x.isZh, polyphonic: x.polyphonic }));

describe('annotateBody', () => {
  it('汉字标拼音和按键，标点变成跳过', () => {
    const { tokens } = annotateBody('便就学爬，女儿去。', realPinyin);
    expect(tokens).toHaveLength(9);
    expect(tokens[0]).toEqual({ kind: 'hanzi', char: '便', key: 'bian', tone: 'biàn' });
    expect(tokens[4]).toEqual({ kind: 'skip', char: '，' });
    expect(tokens[5]).toMatchObject({ char: '女', key: 'nv' });
    expect(tokens[7]).toMatchObject({ char: '去', key: 'qu' });
    expect(tokens[8]).toEqual({ kind: 'skip', char: '。' });
  });

  it('多音字可以用 字[拼音] 指定，指定过的不再列入待核对', () => {
    const r = annotateBody('正当[dàng]便', realPinyin);
    expect(r.tokens).toHaveLength(3);
    expect(r.tokens[1]).toEqual({ kind: 'hanzi', char: '当', key: 'dang', tone: 'dàng' });
    expect(r.polyphones.map((p) => p.char)).not.toContain('当');
    expect(r.polyphones.map((p) => p.char)).toContain('便');
  });

  it('拼音库标不出来的字改为跳过，并报告', () => {
    const fake: PinyinFn = (text) => [...text].map((c) => ({ origin: c, pinyin: '', isZh: true, polyphonic: [] }));
    const r = annotateBody('龘', fake);
    expect(r.tokens).toEqual([{ kind: 'skip', char: '龘' }]);
    expect(r.unknown).toEqual([{ index: 0, char: '龘' }]);
  });

  it('拼音库返回的结果和原文对不上时报错', () => {
    expect(() => annotateBody('海外', () => [])).toThrow('对不上');
  });

  it('方括号没闭合时报错', () => {
    expect(() => annotateBody('便[bian', realPinyin)).toThrow('没闭合');
  });
});
```

- [ ] **Step 6: 运行，确认失败**

Run: `npx vitest run src/content/annotate.test.ts`
Expected: FAIL，提示找不到 `./annotate`

- [ ] **Step 7: 实现 `src/content/annotate.ts`**

```ts
import type { Token } from '../engine/types';
import { toKey } from './pinyinKey';

export type PinyinItem = { origin: string; pinyin: string; isZh: boolean; polyphonic: string[] };
export type PinyinFn = (text: string) => PinyinItem[];
export type AnnotateReport = {
  tokens: Token[];
  /** 有多个读音、又没有人工指定的字，需要人核对 */
  polyphones: { index: number; char: string; chosen: string; options: string[] }[];
  /** 标不出拼音的字，已改为自动跳过 */
  unknown: { index: number; char: string }[];
};

export function annotateBody(body: string, pinyinFn: PinyinFn): AnnotateReport {
  const src = [...body];
  const chars: string[] = [];
  const overrides = new Map<number, string>();
  for (let i = 0; i < src.length; i++) {
    if (src[i] === '[' && chars.length > 0) {
      const end = src.indexOf(']', i);
      if (end < 0) throw new Error(`「${body.slice(0, 20)}…」里有没闭合的 [`);
      overrides.set(chars.length - 1, src.slice(i + 1, end).join('').trim());
      i = end;
      continue;
    }
    chars.push(src[i]);
  }

  const items = pinyinFn(chars.join(''));
  if (items.length !== chars.length || items.some((it, i) => it.origin !== chars[i])) {
    throw new Error(`拼音库返回的结果和原文对不上：${chars.join('').slice(0, 20)}…`);
  }

  const report: AnnotateReport = { tokens: [], polyphones: [], unknown: [] };
  items.forEach((it, i) => {
    const char = chars[i];
    if (!it.isZh) {
      report.tokens.push({ kind: 'skip', char });
      return;
    }
    const tone = overrides.get(i) ?? it.pinyin;
    const key = toKey(tone);
    if (!/^[a-z]+$/.test(key)) {
      report.unknown.push({ index: i, char });
      report.tokens.push({ kind: 'skip', char });
      return;
    }
    if (!overrides.has(i) && it.polyphonic.length > 1) {
      report.polyphones.push({ index: i, char, chosen: tone, options: it.polyphonic });
    }
    report.tokens.push({ kind: 'hanzi', char, key, tone });
  });
  return report;
}
```

- [ ] **Step 8: 运行，确认通过**

Run: `npx vitest run src/content/annotate.test.ts`
Expected: PASS（5 个测试）

- [ ] **Step 9: 写命令行脚本 `scripts/annotate.ts`**

```ts
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pinyin } from 'pinyin-pro';
import { type PinyinFn, annotateBody } from '../src/content/annotate';
import type { Book } from '../src/content/schema';
import { parseSource } from '../src/content/sourceFormat';

const pinyinFn: PinyinFn = (text) =>
  pinyin(text, { type: 'all' }).map((x) => ({ origin: x.origin, pinyin: x.pinyin, isZh: x.isZh, polyphonic: x.polyphonic }));

const SRC_DIR = 'content-src';
const OUT_DIR = 'src/content/books';
const files =
  process.argv.length > 2
    ? process.argv.slice(2)
    : readdirSync(SRC_DIR)
        .filter((f) => f.endsWith('.txt'))
        .map((f) => join(SRC_DIR, f));

mkdirSync(OUT_DIR, { recursive: true });

for (const file of files) {
  const { meta, segments } = parseSource(readFileSync(file, 'utf8'));
  const book: Book = { ...meta, segments: [] };
  console.log(`\n《${meta.title}》 ${file}`);
  for (const seg of segments) {
    const r = annotateBody(seg.body, pinyinFn);
    book.segments.push({ id: seg.id, title: seg.title, tokens: r.tokens, ...(seg.quiz ? { quiz: seg.quiz } : {}) });
    for (const p of r.polyphones) {
      console.log(`  [多音字] ${seg.id} 第 ${p.index + 1} 字「${p.char}」用了 ${p.chosen}（可选：${p.options.join(' / ')}）`);
    }
    for (const u of r.unknown) console.log(`  [标不出] ${seg.id} 第 ${u.index + 1} 字「${u.char}」已改为自动跳过`);
  }
  const out = join(OUT_DIR, `${meta.id}.json`);
  writeFileSync(out, JSON.stringify(book, null, 2) + '\n', 'utf8');
  console.log(`  已写入 ${out}`);
}
```

- [ ] **Step 10: 提交**

```bash
git add src/content/sourceFormat.ts src/content/sourceFormat.test.ts src/content/annotate.ts src/content/annotate.test.ts scripts/annotate.ts
git commit -m "feat: 课文源文件解析和拼音标注脚本"
```

---

### Task 8: 《西游记》样章和内容校验脚本

**Files:**
- Create: `content-src/xiyouji.txt`, `scripts/validate.ts`
- Generate: `src/content/books/xiyouji.json`

- [ ] **Step 1: 写源文件 `content-src/xiyouji.txt`**

原文是公版的《西游记》第一回，分成 4 段，每段 52–58 个汉字。多音字已经人工指定。

```
# 《西游记》原著选段（公版）。多音字用 字[拼音] 指定读音。
id: xiyouji
title: 西游记
author: 吴承恩 · 明
grade: 5
term: 下册
theme: 古典名著
skinId: monkey
skinName: 美猴王
cover: #FF7A45
mark: 西
kind: prose

=== c1-1 | 第一回 · 傲来国花果山
海外有一国土，名曰傲来国。国近大海，海中有一座名山，唤为[wéi]花果山。
此山乃十洲之祖脉[mài]，三岛之来龙，自开清浊而立，鸿蒙判后而成。
? 花果山在哪个国家？ | *傲来国 | 女儿国 | 车迟国

=== c1-2 | 第一回 · 山顶的仙石
那座山正当[dāng]顶上，有一块仙石。其石有三丈六尺五寸高，有二丈四尺围圆。
三丈六尺五寸高，按周天三百六十五度；二丈四尺围圆，按政历二十四气。
? 仙石有多高？ | *三丈六尺五寸 | 二丈四尺 | 九丈九尺

=== c1-3 | 第一回 · 天真地秀
上有九窍八孔，按九宫八卦。四面更[gèng]无树木遮阴，左右倒[dào]有芝兰相[xiāng]衬。
盖自开辟[pì]以来，每受天真地秀，日精月华[huá]，感之既久，遂有灵通之意。
? 仙石旁边长着什么？ | *芝兰 | 大树 | 竹子

=== c1-4 | 第一回 · 石猴出世
内育仙胞，一日迸裂，产一石卵，似[sì]圆球样大。因见风，化作[zuò]一个石猴，五官俱备，四肢皆全。
便[biàn]就学爬学走，拜了[le]四方。目运两道金光，射冲[chōng]斗[dǒu]府。
? 石卵见了风，变成了什么？ | *石猴 | 石鸟 | 石龙
```

- [ ] **Step 2: 生成 JSON**

Run: `npm run annotate`
Expected: 输出 `《西游记》 content-src\xiyouji.txt`、若干行 `[多音字] ...`，最后是 `已写入 src\content\books\xiyouji.json`。没有 `[标不出]`。

- [ ] **Step 3: 人工核对多音字**

逐行看 `[多音字]` 输出。如果 pinyin-pro 选的读音在这句话里不对，就在 `content-src/xiyouji.txt` 里给这个字加上 `[正确拼音]`，然后重新运行 `npm run annotate`，直到每一条都确认无误。

需要特别注意的字：「上」（这里是 shàng）、「那」（nà）、「度」（dù）、「气」（qì）、「样」（yàng）、「冲」（chōng）。

- [ ] **Step 4: 写校验脚本 `scripts/validate.ts`**

```ts
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { type Book, validateBook } from '../src/content/schema';

const DIR = 'src/content/books';
let problems = 0;

for (const file of readdirSync(DIR).filter((f) => f.endsWith('.json'))) {
  const book = JSON.parse(readFileSync(join(DIR, file), 'utf8')) as Book;
  const errors = validateBook(book);
  if (`${book.id}.json` !== file) errors.push(`${file}: 文件名应该是 ${book.id}.json`);
  if (errors.length > 0) {
    problems += errors.length;
    for (const e of errors) console.error(`ERR ${e}`);
  } else {
    console.log(`OK  《${book.title}》 ${book.segments.length} 段`);
  }
}

if (problems > 0) {
  console.error(`\n一共 ${problems} 个问题，请修改 content-src 里的源文件后重新运行 npm run annotate`);
  process.exit(1);
}
```

- [ ] **Step 5: 运行校验**

Run: `npm run validate`
Expected: `OK  《西游记》 4 段`，退出码 0。

- [ ] **Step 6: 提交**

```bash
git add content-src/xiyouji.txt scripts/validate.ts src/content/books/xiyouji.json
git commit -m "content: 《西游记》第一回样章 + 内容校验脚本"
```

---

### Task 9: 书目清单和书库

**Files:**
- Create: `src/content/shelf.ts`, `src/content/library.ts`
- Test: `src/content/library.test.ts`

- [ ] **Step 1: 写全部书目 `src/content/shelf.ts`**

```ts
import type { BookMeta } from './schema';

/** 书架上的全部书。有没有内容由 src/content/books/<id>.json 是否存在决定。顺序就是显示顺序。 */
export const SHELF: BookMeta[] = [
  { id: 'zhongguoshenhua', title: '中国古代神话', author: '盘古 · 女娲 · 后羿', grade: 4, term: '上册', theme: '神话故事', skinId: 'archer', skinName: '后羿小射手', cover: '#FFC93C', mark: '神', kind: 'prose' },
  { id: 'xilashenhua', title: '希腊神话故事', author: '施瓦布 整理', grade: 4, term: '上册', theme: '神话故事', skinId: 'pegasus', skinName: '小天马', cover: '#6FB1FF', mark: '希', kind: 'prose' },
  { id: 'shijieshenhua', title: '世界神话传说', author: '各国神话', grade: 4, term: '上册', theme: '神话故事', skinId: 'rainbow', skinName: '彩虹使者', cover: '#B9A4FF', mark: '世', kind: 'prose' },
  { id: 'shiwange', title: '十万个为什么', author: '伊林 · 苏联', grade: 4, term: '下册', theme: '科普读物', skinId: 'doctor', skinName: '小博士', cover: '#34C38F', mark: '问', kind: 'prose' },
  { id: 'diqiu', title: '看看我们的地球', author: '李四光', grade: 4, term: '下册', theme: '科普读物', skinId: 'geologist', skinName: '地质探险家', cover: '#FF9FB2', mark: '地', kind: 'prose' },
  { id: 'xijun', title: '细菌世界历险记', author: '高士其', grade: 4, term: '下册', theme: '科普读物', skinId: 'detective', skinName: '显微镜侦探', cover: '#FF7A45', mark: '菌', kind: 'prose' },
  { id: 'zhongguominjian', title: '中国民间故事', author: '牛郎织女 · 神笔马良', grade: 5, term: '上册', theme: '民间故事', skinId: 'painter', skinName: '神笔小画家', cover: '#FF7A45', mark: '民', kind: 'prose' },
  { id: 'ouzhouminjian', title: '欧洲民间故事', author: '格林兄弟 等', grade: 5, term: '上册', theme: '民间故事', skinId: 'knight-castle', skinName: '城堡小骑士', cover: '#6FB1FF', mark: '欧', kind: 'prose' },
  { id: 'feizhouminjian', title: '非洲民间故事', author: '口口相传的智慧', grade: 5, term: '上册', theme: '民间故事', skinId: 'savanna', skinName: '草原小勇士', cover: '#FFC93C', mark: '非', kind: 'prose' },
  { id: 'yiqianlingyiye', title: '一千零一夜', author: '阿拉伯民间故事', grade: 5, term: '上册', theme: '民间故事', skinId: 'carpet', skinName: '飞毯旅行家', cover: '#B9A4FF', mark: '夜', kind: 'prose' },
  { id: 'xiyouji', title: '西游记', author: '吴承恩 · 明', grade: 5, term: '下册', theme: '古典名著', skinId: 'monkey', skinName: '美猴王', cover: '#FF7A45', mark: '西', kind: 'prose' },
  { id: 'sanguo', title: '三国演义', author: '罗贯中 · 明', grade: 5, term: '下册', theme: '古典名著', skinId: 'strategist', skinName: '卧龙军师', cover: '#6FB1FF', mark: '三', kind: 'prose' },
  { id: 'shuihu', title: '水浒传', author: '施耐庵 · 明', grade: 5, term: '下册', theme: '古典名著', skinId: 'hero', skinName: '梁山好汉', cover: '#34C38F', mark: '水', kind: 'prose' },
  { id: 'hongloumeng', title: '红楼梦', author: '曹雪芹 · 清', grade: 5, term: '下册', theme: '古典名著', skinId: 'poet-garden', skinName: '大观园诗人', cover: '#FF9FB2', mark: '红', kind: 'prose' },
  { id: 'tongnian', title: '童年', author: '高尔基 · 苏联', grade: 6, term: '上册', theme: '成长故事', skinId: 'sailor', skinName: '伏尔加小水手', cover: '#6FB1FF', mark: '童', kind: 'prose' },
  { id: 'yulai', title: '小英雄雨来', author: '管桦', grade: 6, term: '上册', theme: '成长故事', skinId: 'reed-hero', skinName: '芦苇荡小英雄', cover: '#34C38F', mark: '雨', kind: 'prose' },
  { id: 'aideyujiao', title: '爱的教育', author: '亚米契斯 · 意大利', grade: 6, term: '上册', theme: '成长故事', skinId: 'monitor', skinName: '小小班长', cover: '#FF9FB2', mark: '爱', kind: 'prose' },
  { id: 'lubinxun', title: '鲁滨逊漂流记', author: '笛福 · 英国', grade: 6, term: '下册', theme: '世界名著', skinId: 'island', skinName: '荒岛求生家', cover: '#FFC93C', mark: '岛', kind: 'prose' },
  { id: 'tangmu', title: '汤姆·索亚历险记', author: '马克·吐温 · 美国', grade: 6, term: '下册', theme: '世界名著', skinId: 'river', skinName: '大河冒险王', cover: '#FF7A45', mark: '汤', kind: 'prose' },
  { id: 'qie', title: '骑鹅旅行记', author: '拉格洛芙 · 瑞典', grade: 6, term: '下册', theme: '世界名著', skinId: 'goose', skinName: '骑鹅小旅人', cover: '#B9A4FF', mark: '鹅', kind: 'prose' },
  { id: 'ailisi', title: '爱丽丝漫游奇境', author: '卡罗尔 · 英国', grade: 6, term: '下册', theme: '世界名著', skinId: 'wonder', skinName: '奇境魔术师', cover: '#34C38F', mark: '奇', kind: 'prose' },
  { id: 'gushici', title: '古诗词小站', author: '小学必背古诗', grade: 0, term: '通用', theme: '古诗词小站', skinId: 'poet', skinName: '小诗仙', cover: '#FFF3C4', mark: '诗', kind: 'poem' },
];
```

- [ ] **Step 2: 写失败的测试 `src/content/library.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { getBook, getSegment, listShelf, nextSegmentId, segmentAfter } from './library';
import { SHELF } from './shelf';

describe('SHELF', () => {
  it('书的 id 不重复', () => {
    expect(new Set(SHELF.map((b) => b.id)).size).toBe(SHELF.length);
  });
});

describe('listShelf', () => {
  it('五年级分成上册、下册两排', () => {
    const groups = listShelf(5);
    expect(groups.map((g) => g.term)).toEqual(['上册', '下册']);
    expect(groups[1].theme).toBe('古典名著');
  });

  it('有内容的书标记为已上线，带段落列表', () => {
    const xiyouji = listShelf(5)[1].books.find((b) => b.id === 'xiyouji');
    expect(xiyouji?.ready).toBe(true);
    expect(xiyouji?.segmentIds).toEqual(['c1-1', 'c1-2', 'c1-3', 'c1-4']);
    const sanguo = listShelf(5)[1].books.find((b) => b.id === 'sanguo');
    expect(sanguo?.ready).toBe(false);
    expect(sanguo?.segmentIds).toEqual([]);
  });

  it('古诗词小站是通用的', () => {
    expect(listShelf(0)[0].books.map((b) => b.id)).toEqual(['gushici']);
  });
});

describe('getBook / getSegment', () => {
  it('能拿到已上线的书和段落', () => {
    expect(getBook('xiyouji')?.title).toBe('西游记');
    expect(getSegment('xiyouji', 'c1-1')?.title).toBe('第一回 · 傲来国花果山');
  });

  it('没上线或不存在的返回 null', () => {
    expect(getBook('sanguo')).toBeNull();
    expect(getSegment('xiyouji', 'nope')).toBeNull();
  });

  it('已上线的书和书目里的信息一致', () => {
    const book = getBook('xiyouji');
    const meta = SHELF.find((b) => b.id === 'xiyouji');
    expect(book?.title).toBe(meta?.title);
    expect(book?.skinId).toBe(meta?.skinId);
  });
});

describe('nextSegmentId / segmentAfter', () => {
  const ids = ['c1-1', 'c1-2', 'c1-3'];
  it('跳到第一个没打过的段', () => {
    expect(nextSegmentId(ids, ['c1-1'])).toBe('c1-2');
  });
  it('全部打完就从头开始', () => {
    expect(nextSegmentId(ids, ids)).toBe('c1-1');
  });
  it('没有段落返回 null', () => {
    expect(nextSegmentId([], [])).toBeNull();
  });
  it('找下一段，最后一段返回 null', () => {
    const book = getBook('xiyouji')!;
    expect(segmentAfter(book, 'c1-1')).toBe('c1-2');
    expect(segmentAfter(book, 'c1-4')).toBeNull();
  });
});
```

- [ ] **Step 3: 运行，确认失败**

Run: `npx vitest run src/content/library.test.ts`
Expected: FAIL，提示找不到 `./library`

- [ ] **Step 4: 实现 `src/content/library.ts`**

```ts
import type { Book, BookMeta, Segment } from './schema';
import { SHELF } from './shelf';

const modules = import.meta.glob<{ default: Book }>('./books/*.json', { eager: true });
const READY = new Map<string, Book>(Object.values(modules).map((m) => [m.default.id, m.default]));

export type ShelfBook = BookMeta & { ready: boolean; segmentIds: string[] };
export type ShelfGroup = { term: BookMeta['term']; theme: string; books: ShelfBook[] };

export function listShelf(grade: BookMeta['grade']): ShelfGroup[] {
  const groups: ShelfGroup[] = [];
  for (const meta of SHELF.filter((b) => b.grade === grade)) {
    let group = groups.find((g) => g.term === meta.term);
    if (!group) {
      group = { term: meta.term, theme: meta.theme, books: [] };
      groups.push(group);
    }
    const book = READY.get(meta.id);
    group.books.push({ ...meta, ready: Boolean(book), segmentIds: book ? book.segments.map((s) => s.id) : [] });
  }
  return groups;
}

export function getBook(id: string): Book | null {
  return READY.get(id) ?? null;
}

export function getSegment(bookId: string, segmentId: string): Segment | null {
  return getBook(bookId)?.segments.find((s) => s.id === segmentId) ?? null;
}

export function nextSegmentId(segmentIds: string[], done: string[]): string | null {
  if (segmentIds.length === 0) return null;
  return segmentIds.find((id) => !done.includes(id)) ?? segmentIds[0];
}

export function segmentAfter(book: Book, segmentId: string): string | null {
  const i = book.segments.findIndex((s) => s.id === segmentId);
  return i >= 0 && i + 1 < book.segments.length ? book.segments[i + 1].id : null;
}
```

- [ ] **Step 5: 运行，确认通过**

Run: `npx vitest run src/content/library.test.ts`
Expected: PASS（11 个测试）

- [ ] **Step 6: 提交**

```bash
git add src/content/shelf.ts src/content/library.ts src/content/library.test.ts
git commit -m "feat: 4–6 年级书目和书库读取"
```

---

### Task 10: 本机存档

**Files:**
- Create: `src/storage/profile.ts`
- Test: `src/storage/profile.test.ts`

- [ ] **Step 1: 写失败的测试**

```ts
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
    const keys = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i));
    expect(keys.some((k) => k?.startsWith(`${STORAGE_KEY}/broken-`))).toBe(true);
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
```

- [ ] **Step 2: 运行，确认失败**

Run: `npx vitest run src/storage/profile.test.ts`
Expected: FAIL，提示找不到 `./profile`

- [ ] **Step 3: 实现 `src/storage/profile.ts`**

```ts
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
```

- [ ] **Step 4: 运行，确认通过**

Run: `npx vitest run src/storage/profile.test.ts`
Expected: PASS（12 个测试）

- [ ] **Step 5: 提交**

```bash
git add src/storage/profile.ts src/storage/profile.test.ts
git commit -m "feat: 本机存档（档案、迁移、损坏备份、记录成绩）"
```

---

### Task 11: 路由和档案上下文

**Files:**
- Create: `src/router.ts`, `src/storage/ProfileContext.tsx`
- Test: `src/router.test.ts`, `src/storage/ProfileContext.test.tsx`

- [ ] **Step 1: 写路由的失败测试 `src/router.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { type Route, parseHash, toHash } from './router';

describe('parseHash', () => {
  it('认识四种页面', () => {
    expect(parseHash('')).toEqual({ name: 'home' });
    expect(parseHash('#/')).toEqual({ name: 'home' });
    expect(parseHash('#/books')).toEqual({ name: 'books' });
    expect(parseHash('#/practice/xiyouji/c1-2')).toEqual({ name: 'practice', bookId: 'xiyouji', segmentId: 'c1-2' });
    expect(parseHash('#/result')).toEqual({ name: 'result' });
  });

  it('不认识的地址回首页', () => {
    expect(parseHash('#/whatever')).toEqual({ name: 'home' });
    expect(parseHash('#/practice/onlybook')).toEqual({ name: 'home' });
  });
});

describe('toHash', () => {
  it('和 parseHash 互相还原', () => {
    const routes: Route[] = [{ name: 'home' }, { name: 'books' }, { name: 'practice', bookId: 'xiyouji', segmentId: 'c1-1' }, { name: 'result' }];
    for (const r of routes) expect(parseHash(toHash(r))).toEqual(r);
  });
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `npx vitest run src/router.test.ts`
Expected: FAIL，提示找不到 `./router`

- [ ] **Step 3: 实现 `src/router.ts`**

```ts
import { useEffect, useState } from 'react';

export type Route =
  | { name: 'home' }
  | { name: 'books' }
  | { name: 'practice'; bookId: string; segmentId: string }
  | { name: 'result' };

export function parseHash(hash: string): Route {
  const parts = hash
    .replace(/^#\/?/, '')
    .split('/')
    .filter(Boolean)
    .map(decodeURIComponent);
  if (parts[0] === 'books') return { name: 'books' };
  if (parts[0] === 'practice' && parts.length === 3) return { name: 'practice', bookId: parts[1], segmentId: parts[2] };
  if (parts[0] === 'result') return { name: 'result' };
  return { name: 'home' };
}

export function toHash(route: Route): string {
  switch (route.name) {
    case 'home':
      return '#/';
    case 'books':
      return '#/books';
    case 'practice':
      return `#/practice/${encodeURIComponent(route.bookId)}/${encodeURIComponent(route.segmentId)}`;
    case 'result':
      return '#/result';
  }
}

export function navigate(route: Route): void {
  window.location.hash = toHash(route);
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
```

- [ ] **Step 4: 运行，确认通过**

Run: `npx vitest run src/router.test.ts`
Expected: PASS（3 个测试）

- [ ] **Step 5: 写上下文的失败测试 `src/storage/ProfileContext.test.tsx`**

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { Component, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { ProfileProvider, useProfile } from './ProfileContext';
import { STORAGE_KEY, addStars } from './profile';

/** 接住子组件抛出的错误并显示出来（React 19 不会把渲染错误抛给 render()） */
class Catch extends Component<{ children: ReactNode }, { msg: string }> {
  state = { msg: '' };
  static getDerivedStateFromError(e: Error) {
    return { msg: e.message };
  }
  render() {
    return this.state.msg ? <p>{this.state.msg}</p> : this.props.children;
  }
}

function Probe() {
  const { profile, persistent, update } = useProfile();
  return (
    <div>
      <span data-testid="stars">{profile.stars}</span>
      <span data-testid="persistent">{String(persistent)}</span>
      <button type="button" onClick={() => update((p) => addStars(p, 2))}>加星</button>
    </div>
  );
}

describe('ProfileProvider', () => {
  it('更新档案后立即保存到本机', () => {
    render(
      <ProfileProvider storage={localStorage}>
        <Probe />
      </ProfileProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: '加星' }));
    expect(screen.getByTestId('stars')).toHaveTextContent('2');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).profiles[0].stars).toBe(2);
  });

  it('没有存储时照样能用，但标记为不持久', () => {
    render(
      <ProfileProvider storage={null}>
        <Probe />
      </ProfileProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: '加星' }));
    expect(screen.getByTestId('stars')).toHaveTextContent('2');
    expect(screen.getByTestId('persistent')).toHaveTextContent('false');
  });

  it('遇到更新版本的存档时不写入，保住原数据', () => {
    const newer = JSON.stringify({ version: 2, profiles: [] });
    localStorage.setItem(STORAGE_KEY, newer);
    render(
      <ProfileProvider storage={localStorage}>
        <Probe />
      </ProfileProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: '加星' }));
    expect(screen.getByTestId('stars')).toHaveTextContent('2');
    expect(screen.getByTestId('persistent')).toHaveTextContent('false');
    expect(localStorage.getItem(STORAGE_KEY)).toBe(newer);
  });

  it('在 Provider 外面用会报出清楚的错误', () => {
    render(
      <Catch>
        <Probe />
      </Catch>,
    );
    expect(screen.getByText(/ProfileProvider/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: 运行，确认失败**

Run: `npx vitest run src/storage/ProfileContext.test.tsx`
Expected: FAIL，提示找不到 `./ProfileContext`

- [ ] **Step 7: 实现 `src/storage/ProfileContext.tsx`**

```tsx
import { type ReactNode, createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { SegmentResult } from '../engine/stats';
import { type Profile, activeProfile, getStorage, loadStore, replaceProfile, saveStore } from './profile';

type ProfileCtx = {
  profile: Profile;
  /** false 表示这次的进度不会保存 */
  persistent: boolean;
  update: (fn: (p: Profile) => Profile) => void;
  lastResult: SegmentResult | null;
  setLastResult: (r: SegmentResult | null) => void;
};

const Ctx = createContext<ProfileCtx | null>(null);

type Props = {
  children: ReactNode;
  /** 不传就自动用浏览器的 localStorage；传 null 表示不能存储 */
  storage?: Storage | null;
  /** 用于测试和预览：直接带一份成绩进入结算页 */
  initialResult?: SegmentResult;
};

export function ProfileProvider({ children, storage, initialResult }: Props) {
  const [state, setState] = useState(() => {
    const st = storage === undefined ? getStorage() : storage;
    const { store, persistent } = loadStore(st);
    return { st, store, persistent };
  });
  const [lastResult, setLastResult] = useState<SegmentResult | null>(initialResult ?? null);

  const update = useCallback((fn: (p: Profile) => Profile) => {
    setState((prev) => {
      const store = replaceProfile(prev.store, fn(activeProfile(prev.store)));
      const ok = prev.persistent && prev.st !== null && saveStore(prev.st, store);
      return { ...prev, store, persistent: prev.persistent && ok };
    });
  }, []);

  const value = useMemo<ProfileCtx>(
    () => ({ profile: activeProfile(state.store), persistent: state.persistent, update, lastResult, setLastResult }),
    [state, update, lastResult],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProfile(): ProfileCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useProfile 必须放在 <ProfileProvider> 里面使用');
  return v;
}
```

- [ ] **Step 8: 运行，确认通过**

Run: `npx vitest run src/router.test.ts src/storage/ProfileContext.test.tsx`
Expected: PASS（7 个测试）。最后一个测试会在控制台打印一条 React 的错误日志，这是正常的。

- [ ] **Step 9: 提交**

```bash
git add src/router.ts src/router.test.ts src/storage/ProfileContext.tsx src/storage/ProfileContext.test.tsx
git commit -m "feat: hash 路由和档案上下文"
```

---

### Task 12: 全局样式、字体和基础组件

**Files:**
- Create: `src/theme.css`, `src/ui/Mascot.tsx`, `src/ui/ProgressBar.tsx`, `src/ui/StarRow.tsx`
- Modify: `src/main.tsx`
- Test: `src/ui/basics.test.tsx`

- [ ] **Step 1: 写失败的测试 `src/ui/basics.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Mascot from './Mascot';
import ProgressBar from './ProgressBar';
import StarRow from './StarRow';

describe('Mascot', () => {
  it('有无障碍名字，表情可切换', () => {
    render(<Mascot label="键宝在挥手" mood="oops" />);
    const img = screen.getByRole('img', { name: '键宝在挥手' });
    expect(img).toHaveAttribute('data-mood', 'oops');
  });
});

describe('ProgressBar', () => {
  it('数值限制在 0–100 并取整', () => {
    render(<ProgressBar value={150.4} label="进度" />);
    expect(screen.getByRole('progressbar', { name: '进度' })).toHaveAttribute('aria-valuenow', '100');
  });
});

describe('StarRow', () => {
  it('显示几颗亮星', () => {
    const { container } = render(<StarRow count={2} />);
    expect(screen.getByRole('img', { name: '2 颗星' })).toBeInTheDocument();
    const fills = [...container.querySelectorAll('path')].map((p) => p.getAttribute('fill'));
    expect(fills).toEqual(['#FFC93C', '#FFC93C', '#FFFFFF']);
  });
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `npx vitest run src/ui/basics.test.tsx`
Expected: FAIL，提示找不到 `./Mascot`

- [ ] **Step 3: 写 `src/theme.css`**

```css
:root {
  --sky: #e3f2ff;
  --ink: #1f2a44;
  --ink-2: #4a5878;
  --muted: #5f6b85;
  --sun: #ffc93c;
  --sun-soft: #fff3c4;
  --coral: #ff7a45;
  --mint: #34c38f;
  --mint-soft: #ddf5ea;
  --mint-ink: #1f6f50;
  --blue: #2167d8;
  --blue-soft: #dcebff;
  --peach: #ffe6d3;
  --lav: #e9e3ff;
  --purple: #8b6cff;
  --purple-ink: #5b3fd6;
  --font-display: 'ZCOOL KuaiLe', 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', sans-serif;
  --font-body: 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', system-ui, sans-serif;
  --font-latin: 'Fredoka', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

* { box-sizing: border-box; }
body { margin: 0; background: var(--sky); color: var(--ink); font-family: var(--font-body); font-size: 17px; }
button { font-family: inherit; color: inherit; }

.page { min-height: 100vh; padding: 24px 32px 56px; }
.page-inner { max-width: 1360px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px; }
.row { display: flex; flex-wrap: wrap; gap: 14px; align-items: center; }
.spread { justify-content: space-between; }

.card { background: #fff; border: 3px solid var(--ink); border-radius: 32px; box-shadow: 0 8px 0 var(--ink); padding: 24px 28px; }
.display { font-family: var(--font-display); font-weight: 400; margin: 0; }
.latin { font-family: var(--font-latin); }

.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 10px;
  min-height: 56px; padding: 0 22px;
  border: 3px solid var(--ink); border-radius: 18px; background: #fff; color: var(--ink);
  box-shadow: 0 5px 0 var(--ink); font: 700 20px var(--font-body); text-decoration: none; cursor: pointer;
  transition: transform 0.08s, box-shadow 0.08s;
}
.btn:active:not(:disabled) { transform: translateY(4px); box-shadow: 0 1px 0 var(--ink); }
.btn:disabled { cursor: not-allowed; background: #eef1f6; color: var(--ink-2); box-shadow: none; border-style: dashed; }
.btn-primary { background: var(--sun); min-height: 64px; font-size: 22px; }
.btn-dark { background: var(--ink); color: #fff; box-shadow: 0 5px 0 var(--coral); min-height: 64px; font-size: 22px; }

.chip { display: inline-flex; align-items: center; gap: 8px; min-height: 52px; padding: 0 18px; background: #fff; border: 3px solid var(--ink); border-radius: 999px; font-weight: 700; font-size: 19px; }
.tag { display: inline-flex; align-items: center; padding: 4px 12px; border: 2px solid var(--ink); border-radius: 999px; font-size: 15px; font-weight: 700; background: #fff; }
.tag-dark { background: var(--ink); color: #fff; }
.tag-coral { background: var(--coral); }

.banner { padding: 14px 20px; border: 3px solid var(--ink); border-radius: 20px; font-weight: 700; font-size: 19px; background: var(--coral); }
.banner-soft { background: var(--sun-soft); }

.progress { flex: 1; width: 100%; border: 3px solid var(--ink); border-radius: 999px; background: #fff; overflow: hidden; }
.progress-fill { height: 100%; transition: width 0.2s; }
.star-row { display: inline-flex; gap: 4px; align-items: center; }

a:focus-visible, button:focus-visible { outline: 4px solid var(--blue); outline-offset: 4px; }

@media (max-width: 640px) {
  .page { padding: 16px 16px 40px; }
  .card { padding: 18px; border-radius: 24px; }
}
@media (prefers-reduced-motion: reduce) {
  * { transition: none !important; animation: none !important; }
}
```

- [ ] **Step 4: 写 `src/ui/Mascot.tsx`**

```tsx
type Props = {
  size?: number;
  mood?: 'happy' | 'oops' | 'cheer';
  label?: string;
  bodyFill?: string;
  faceFill?: string;
};

const INK = '#1F2A44';

export default function Mascot({ size = 120, mood = 'happy', label = '键宝', bodyFill = '#FFC93C', faceFill = '#FFE08A' }: Props) {
  const up = mood === 'cheer';
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" role="img" aria-label={label} data-mood={mood}>
      <ellipse cx="60" cy="113" rx="34" ry="5" fill={INK} opacity="0.18" />
      <path d={up ? 'M16 60 Q4 50 10 36' : 'M16 72 Q4 66 7 54'} fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" />
      <path d={up ? 'M104 60 Q116 50 110 36' : 'M104 64 Q118 56 112 40'} fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" />
      <rect x="36" y="99" width="16" height="10" rx="5" fill={INK} />
      <rect x="68" y="99" width="16" height="10" rx="5" fill={INK} />
      <path d="M60 22 V11" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      <circle cx="60" cy="9" r="6" fill="#FF7A45" stroke={INK} strokeWidth="3.5" />
      <rect x="14" y="22" width="92" height="84" rx="24" fill={bodyFill} stroke={INK} strokeWidth="4" />
      <rect x="24" y="28" width="72" height="60" rx="18" fill={faceFill} />
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
    </svg>
  );
}
```

- [ ] **Step 5: 写 `src/ui/ProgressBar.tsx`**

```tsx
type Props = { value: number; label: string; color?: string; height?: number };

export default function ProgressBar({ value, label, color = 'var(--mint)', height = 16 }: Props) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={v}
      className="progress"
      style={{ height }}
    >
      <div className="progress-fill" style={{ width: `${v}%`, background: color }} />
    </div>
  );
}
```

- [ ] **Step 6: 写 `src/ui/StarRow.tsx`**

```tsx
const STAR = 'M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z';

export default function StarRow({ count, size = 28 }: { count: number; size?: number }) {
  return (
    <span role="img" aria-label={`${count} 颗星`} className="star-row">
      {[1, 2, 3].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
          <path d={STAR} fill={i <= count ? '#FFC93C' : '#FFFFFF'} stroke="#1F2A44" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      ))}
    </span>
  );
}
```

- [ ] **Step 7: 在 `src/main.tsx` 里加载字体和样式**

把整个文件替换成：

```tsx
import '@fontsource/zcool-kuaile';
import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/fredoka/700.css';
import './theme.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 8: 运行，确认通过**

Run: `npx vitest run src/ui/basics.test.tsx`
Expected: PASS（3 个测试）

- [ ] **Step 9: 提交**

```bash
git add src/theme.css src/main.tsx src/ui/Mascot.tsx src/ui/ProgressBar.tsx src/ui/StarRow.tsx src/ui/basics.test.tsx
git commit -m "feat: 全局样式、字体、键宝和进度条/星星组件"
```

---

### Task 13: 屏幕键盘和手指提示

**Files:**
- Create: `src/ui/Keyboard.tsx`, `src/ui/Keyboard.css`, `src/ui/Hands.tsx`
- Test: `src/ui/Keyboard.test.tsx`

- [ ] **Step 1: 写失败的测试**

```tsx
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Hands from './Hands';
import Keyboard from './Keyboard';

describe('Keyboard', () => {
  it('高亮下一个要按的键，按错的键标橙色', () => {
    const { container } = render(<Keyboard nextKey="h" wrongKey="x" />);
    expect(container.querySelector('[data-key="h"]')).toHaveClass('is-next');
    expect(container.querySelector('[data-key="x"]')).toHaveClass('is-wrong');
    expect(container.querySelectorAll('.is-next')).toHaveLength(1);
  });

  it('F 和 J 有定位凸点', () => {
    const { getByTestId } = render(<Keyboard nextKey={null} wrongKey={null} />);
    expect(getByTestId('bump-f')).toBeInTheDocument();
    expect(getByTestId('bump-j')).toBeInTheDocument();
  });

  it('错键刚好是下一个键时，只显示高亮', () => {
    const { container } = render(<Keyboard nextKey="h" wrongKey="h" />);
    expect(container.querySelector('[data-key="h"]')).not.toHaveClass('is-wrong');
  });

  it('整块键盘对读屏软件隐藏（文字提示另外给）', () => {
    const { container } = render(<Keyboard nextKey="a" wrongKey={null} />);
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('Hands', () => {
  it('亮起对应的手指', () => {
    const { container } = render(<Hands finger="ri" />);
    expect(container.querySelector('[data-finger="ri"]')).toHaveClass('is-on');
    expect(container.querySelectorAll('.is-on')).toHaveLength(1);
  });

  it('大拇指两只一起亮', () => {
    const { container } = render(<Hands finger="th" />);
    expect(container.querySelector('[data-finger="lt"]')).toHaveClass('is-on');
    expect(container.querySelector('[data-finger="rt"]')).toHaveClass('is-on');
  });

  it('没有要按的键时都不亮', () => {
    const { container } = render(<Hands finger={null} />);
    expect(container.querySelectorAll('.is-on')).toHaveLength(0);
  });
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `npx vitest run src/ui/Keyboard.test.tsx`
Expected: FAIL，提示找不到 `./Hands`

- [ ] **Step 3: 写 `src/ui/Keyboard.css`**

```css
.kb { width: 100%; max-width: 1040px; margin: 0 auto; display: flex; flex-direction: column; gap: 12px; }
.kb-row { display: flex; gap: 10px; }
.kb-key {
  flex: 1 1 0; min-width: 0; height: 64px;
  border: 2px solid var(--ink); border-radius: 16px; box-shadow: 0 4px 0 var(--ink);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
  font: 700 26px var(--font-latin); transition: transform 0.1s;
}
.kb-key.is-next { background: var(--sun) !important; border-width: 4px; box-shadow: 0 8px 0 var(--ink); transform: translateY(-5px); }
.kb-key.is-wrong { background: var(--coral) !important; animation: kb-shake 0.25s; }
.kb-bump { width: 18px; height: 4px; border-radius: 2px; background: var(--ink); }
.kb-space-row { justify-content: center; padding-left: 4%; }
.kb-space { flex: 0 0 46%; height: 56px; background: #f1f3f8; font: 700 18px var(--font-body); }
@keyframes kb-shake { 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }

.hands { display: flex; justify-content: center; gap: 15%; flex-wrap: wrap; margin-top: 10px; }
.hand { display: flex; flex-direction: column; align-items: center; }
.hand-fingers { display: flex; align-items: flex-end; gap: 8px; }
.finger { width: 32px; border: 2px solid var(--ink); border-radius: 16px 16px 8px 8px; transition: transform 0.15s; }
.finger.is-on { background: var(--sun) !important; border-width: 4px; transform: translateY(-8px); }
.palm {
  width: 200px; height: 40px; margin-top: -2px;
  border: 2px solid var(--ink); border-radius: 6px 6px 28px 28px; background: #f7f8fb;
  display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 15px;
}

@media (max-width: 640px) {
  .kb-row { gap: 4px; }
  .kb-key { height: 44px; font-size: 18px; border-radius: 10px; }
  .finger { width: 22px; }
  .palm { width: 150px; }
}
```

- [ ] **Step 4: 写 `src/ui/Keyboard.tsx`**

```tsx
import { FINGER_TINT, HOME_KEYS, KEY_ROWS, fingerOf } from '../engine/fingers';
import './Keyboard.css';

type Props = { nextKey: string | null; wrongKey: string | null };

/** 每排左右留白，让三排键一样宽、错开排列，像真键盘 */
const ROW_PAD: [string, string][] = [
  ['0%', '6%'],
  ['2.5%', '3.5%'],
  ['5%', '1%'],
];

export default function Keyboard({ nextKey, wrongKey }: Props) {
  return (
    <div className="kb" aria-hidden="true">
      {KEY_ROWS.map((row, r) => (
        <div className="kb-row" key={r} style={{ paddingLeft: ROW_PAD[r][0], paddingRight: ROW_PAD[r][1] }}>
          {row.map((k) => {
            const cls = ['kb-key', k === nextKey ? 'is-next' : '', k === wrongKey && k !== nextKey ? 'is-wrong' : '']
              .filter(Boolean)
              .join(' ');
            return (
              <div key={k} className={cls} data-key={k} style={{ background: FINGER_TINT[fingerOf(k)] }}>
                <span>{k.toUpperCase()}</span>
                {HOME_KEYS.includes(k) && <span className="kb-bump" data-testid={`bump-${k}`} />}
              </div>
            );
          })}
        </div>
      ))}
      <div className="kb-row kb-space-row">
        <div className="kb-key kb-space" data-key=" ">
          空格
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: 写 `src/ui/Hands.tsx`**

```tsx
import { FINGER_TINT, type Finger } from '../engine/fingers';
import './Keyboard.css';

type Slot = { id: string; finger: Finger; h: number };

const LEFT: Slot[] = [
  { id: 'lp', finger: 'lp', h: 50 },
  { id: 'lr', finger: 'lr', h: 68 },
  { id: 'lm', finger: 'lm', h: 78 },
  { id: 'li', finger: 'li', h: 68 },
  { id: 'lt', finger: 'th', h: 40 },
];
const RIGHT: Slot[] = [
  { id: 'rt', finger: 'th', h: 40 },
  { id: 'ri', finger: 'ri', h: 68 },
  { id: 'rm', finger: 'rm', h: 78 },
  { id: 'rr', finger: 'rr', h: 68 },
  { id: 'rp', finger: 'rp', h: 50 },
];

export default function Hands({ finger }: { finger: Finger | null }) {
  const hand = (slots: Slot[], name: string) => (
    <div className="hand">
      <div className="hand-fingers">
        {slots.map((s) => (
          <div
            key={s.id}
            data-finger={s.id}
            className={s.finger === finger ? 'finger is-on' : 'finger'}
            style={{ height: s.h, background: FINGER_TINT[s.finger] }}
          />
        ))}
      </div>
      <div className="palm">{name}</div>
    </div>
  );
  return (
    <div className="hands" aria-hidden="true">
      {hand(LEFT, '左手')}
      {hand(RIGHT, '右手')}
    </div>
  );
}
```

- [ ] **Step 6: 运行，确认通过**

Run: `npx vitest run src/ui/Keyboard.test.tsx`
Expected: PASS（7 个测试）

- [ ] **Step 7: 提交**

```bash
git add src/ui/Keyboard.tsx src/ui/Keyboard.css src/ui/Hands.tsx src/ui/Keyboard.test.tsx
git commit -m "feat: 屏幕键盘（手指分色、高亮、错键）和手指提示"
```

---

### Task 14: 拼音 + 汉字段落

**Files:**
- Create: `src/ui/Passage.tsx`, `src/ui/Passage.css`
- Test: `src/ui/Passage.test.tsx`

- [ ] **Step 1: 写失败的测试**

```tsx
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createSession, press } from '../engine/session';
import type { Token } from '../engine/types';
import Passage from './Passage';

const TOKENS: Token[] = [
  { kind: 'hanzi', char: '你', key: 'ni', tone: 'nǐ' },
  { kind: 'hanzi', char: '好', key: 'hao', tone: 'hǎo' },
  { kind: 'skip', char: '，' },
  { kind: 'hanzi', char: '海', key: 'hai', tone: 'hǎi' },
];

function afterTyping(keys: string) {
  let s = createSession(TOKENS);
  [...keys].forEach((k, i) => {
    s = press(s, k, i * 100).session;
  });
  return s;
}

describe('Passage', () => {
  it('标出已完成、当前、未开始', () => {
    const { container } = render(<Passage session={afterTyping('ni')} showPinyin />);
    const cells = container.querySelectorAll('.pg-cell, .pg-skip');
    expect(cells[0]).toHaveClass('is-done');
    expect(cells[1]).toHaveClass('is-current');
    expect(cells[1]).toHaveAttribute('aria-current', 'true');
    expect(cells[2]).toHaveClass('is-todo');
    expect(cells[1]).toHaveTextContent('hǎo好');
  });

  it('关掉拼音后只有当前字显示拼音', () => {
    const { container } = render(<Passage session={afterTyping('ni')} showPinyin={false} />);
    const py = [...container.querySelectorAll('.pg-py')].map((e) => e.textContent);
    expect(py).toEqual(['', 'hǎo', '']);
  });
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `npx vitest run src/ui/Passage.test.tsx`
Expected: FAIL，提示找不到 `./Passage`

- [ ] **Step 3: 写 `src/ui/Passage.css`**

```css
.passage { margin: 0; display: flex; flex-wrap: wrap; row-gap: 14px; column-gap: 2px; }
.pg-cell {
  display: inline-flex; flex-direction: column; align-items: center;
  width: 62px; padding: 6px 0 4px; border: 3px solid transparent; border-radius: 14px;
}
.pg-py { height: 22px; font: 500 17px/22px var(--font-latin); color: var(--muted); }
.pg-ch { font-size: 42px; line-height: 1.2; font-weight: 500; color: var(--muted); }
.pg-cell.is-done { background: #e4f7ee; }
.pg-cell.is-done .pg-ch { color: var(--ink); }
.pg-cell.is-done .pg-py { color: var(--mint-ink); }
.pg-cell.is-current { background: var(--sun); border-color: var(--ink); transform: translateY(-4px); }
.pg-cell.is-current .pg-ch,
.pg-cell.is-current .pg-py { color: var(--ink); }
.pg-skip { display: inline-flex; align-items: flex-end; width: 30px; padding-bottom: 8px; font-size: 42px; color: var(--muted); }
.pg-skip.is-done { color: var(--ink); }

@media (max-width: 640px) {
  .pg-cell { width: 44px; }
  .pg-ch { font-size: 30px; }
  .pg-py { font-size: 13px; }
  .pg-skip { width: 20px; font-size: 30px; }
}
```

- [ ] **Step 4: 写 `src/ui/Passage.tsx`**

```tsx
import { tokenStatus } from '../engine/session';
import type { Session } from '../engine/types';
import './Passage.css';

export default function Passage({ session, showPinyin }: { session: Session; showPinyin: boolean }) {
  return (
    <p className="passage" lang="zh-CN">
      {session.tokens.map((t, i) => {
        const st = tokenStatus(session, i);
        if (t.kind === 'skip') {
          return (
            <span key={i} className={`pg-skip is-${st}`}>
              {t.char}
            </span>
          );
        }
        const py = st === 'current' || showPinyin ? t.tone : '';
        return (
          <span key={i} className={`pg-cell is-${st}`} aria-current={st === 'current' ? 'true' : undefined}>
            <span className="pg-py">{py}</span>
            <span className="pg-ch">{t.char}</span>
          </span>
        );
      })}
    </p>
  );
}
```

- [ ] **Step 5: 运行，确认通过**

Run: `npx vitest run src/ui/Passage.test.tsx`
Expected: PASS（2 个测试）

- [ ] **Step 6: 提交**

```bash
git add src/ui/Passage.tsx src/ui/Passage.css src/ui/Passage.test.tsx
git commit -m "feat: 拼音在上、汉字在下的课文段落"
```

---

### Task 15: 键盘输入（含中文输入法识别、失焦暂停）

**Files:**
- Create: `src/hooks/useTypingInput.ts`
- Test: `src/hooks/useTypingInput.test.tsx`

- [ ] **Step 1: 写失败的测试**

```tsx
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { type TypingHandlers, useTypingInput } from './useTypingInput';

function Harness({ enabled, h }: { enabled: boolean; h: TypingHandlers }) {
  useTypingInput(enabled, h);
  return null;
}

function setup(enabled = true) {
  const h = { onLetter: vi.fn(), onIme: vi.fn(), onPause: vi.fn() };
  render(<Harness enabled={enabled} h={h} />);
  return h;
}

describe('useTypingInput', () => {
  it('字母键交给 onLetter', () => {
    const h = setup();
    fireEvent.keyDown(window, { key: 'a' });
    fireEvent.keyDown(window, { key: 'Z' });
    expect(h.onLetter).toHaveBeenNthCalledWith(1, 'a', expect.any(Number));
    expect(h.onLetter).toHaveBeenNthCalledWith(2, 'Z', expect.any(Number));
  });

  it('数字、功能键、组合键都不管', () => {
    const h = setup();
    fireEvent.keyDown(window, { key: '1' });
    fireEvent.keyDown(window, { key: 'Enter' });
    fireEvent.keyDown(window, { key: 'a', ctrlKey: true });
    fireEvent.keyDown(window, { key: 'a', metaKey: true });
    expect(h.onLetter).not.toHaveBeenCalled();
  });

  it('按住一个键不放时只算一次', () => {
    const h = setup();
    fireEvent.keyDown(window, { key: 'a' });
    fireEvent.keyDown(window, { key: 'a', repeat: true });
    expect(h.onLetter).toHaveBeenCalledTimes(1);
  });

  it('识别中文输入法正在拼写', () => {
    const h = setup();
    fireEvent.keyDown(window, { key: 'Process' });
    fireEvent.keyDown(window, { key: 'h', isComposing: true });
    fireEvent.keyDown(window, { key: 'h', keyCode: 229 });
    expect(h.onIme).toHaveBeenCalledTimes(3);
    expect(h.onLetter).not.toHaveBeenCalled();
  });

  it('窗口失焦时暂停', () => {
    const h = setup();
    fireEvent.blur(window);
    expect(h.onPause).toHaveBeenCalledTimes(1);
  });

  it('关闭时什么都不监听', () => {
    const h = setup(false);
    fireEvent.keyDown(window, { key: 'a' });
    expect(h.onLetter).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `npx vitest run src/hooks/useTypingInput.test.tsx`
Expected: FAIL，提示找不到 `./useTypingInput`

- [ ] **Step 3: 实现 `src/hooks/useTypingInput.ts`**

```ts
import { useEffect, useRef } from 'react';

export type TypingHandlers = {
  onLetter: (key: string, now: number) => void;
  /** 检测到中文输入法正在拼写 */
  onIme: () => void;
  /** 窗口失焦 */
  onPause: () => void;
};

export function useTypingInput(enabled: boolean, handlers: TypingHandlers): void {
  const ref = useRef(handlers);
  useEffect(() => {
    ref.current = handlers;
  });

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.isComposing || e.key === 'Process' || e.keyCode === 229) {
        ref.current.onIme();
        return;
      }
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      if (/^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault();
        ref.current.onLetter(e.key, Date.now());
      }
    };
    const onBlur = () => ref.current.onPause();
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('blur', onBlur);
    };
  }, [enabled]);
}
```

- [ ] **Step 4: 运行，确认通过**

Run: `npx vitest run src/hooks/useTypingInput.test.tsx`
Expected: PASS（6 个测试）

- [ ] **Step 5: 提交**

```bash
git add src/hooks/useTypingInput.ts src/hooks/useTypingInput.test.tsx
git commit -m "feat: 键盘输入监听，识别中文输入法和失焦"
```

---

### Task 16: 打字练习页

**Files:**
- Create: `src/pages/coach.ts`, `src/pages/Practice.tsx`, `src/pages/Practice.css`
- Test: `src/pages/coach.test.ts`, `src/pages/Practice.test.tsx`

- [ ] **Step 1: 写鼓励语的失败测试 `src/pages/coach.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { createSession } from '../engine/session';
import { coachMessage } from './coach';

const s = createSession([{ kind: 'hanzi', char: '海', key: 'hai', tone: 'hǎi' }]);

describe('coachMessage', () => {
  it('还没开始', () => expect(coachMessage(s)).toBe('跟着发光的键走，一个字一个字来！'));
  it('按错了，说出按到哪个键', () => expect(coachMessage({ ...s, lastWrongKey: 'x', wrong: 1 })).toBe('哎呀，按到 X 啦。看看发光的那个键！'));
  it('每连对 10 个夸一次', () => expect(coachMessage({ ...s, right: 10, streak: 10 })).toBe('连对 10 个字母，你是打字小能手！'));
  it('普通按对', () => expect(coachMessage({ ...s, right: 3, streak: 3 })).toBe('对啦！继续加油～'));
  it('完成', () => expect(coachMessage({ ...s, done: true })).toBe('整段完成！你真棒！'));
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `npx vitest run src/pages/coach.test.ts`
Expected: FAIL，提示找不到 `./coach`

- [ ] **Step 3: 实现 `src/pages/coach.ts`**

```ts
import type { Session } from '../engine/types';

export function coachMessage(s: Session): string {
  if (s.done) return '整段完成！你真棒！';
  if (s.lastWrongKey) return `哎呀，按到 ${s.lastWrongKey.toUpperCase()} 啦。看看发光的那个键！`;
  if (s.streak > 0 && s.streak % 10 === 0) return `连对 ${s.streak} 个字母，你是打字小能手！`;
  if (s.right > 0) return '对啦！继续加油～';
  return '跟着发光的键走，一个字一个字来！';
}
```

- [ ] **Step 4: 运行，确认通过**

Run: `npx vitest run src/pages/coach.test.ts`
Expected: PASS（5 个测试）

- [ ] **Step 5: 写练习页的失败测试 `src/pages/Practice.test.tsx`**

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { getSegment } from '../content/library';
import { ProfileProvider } from '../storage/ProfileContext';
import { STORAGE_KEY } from '../storage/profile';
import Practice from './Practice';

function renderPractice(bookId = 'xiyouji', segmentId = 'c1-1') {
  return render(
    <ProfileProvider storage={localStorage}>
      <Practice bookId={bookId} segmentId={segmentId} />
    </ProfileProvider>,
  );
}

function typeKeys(keys: string) {
  for (const k of keys) fireEvent.keyDown(window, { key: k });
}

function lettersOf(segmentId: string) {
  return getSegment('xiyouji', segmentId)!
    .tokens.flatMap((t) => (t.kind === 'hanzi' ? [t.key] : []))
    .join('');
}

const current = () => document.querySelector('[aria-current="true"]');

describe('Practice', () => {
  it('从第一个字开始，打对后跳到下一个字', () => {
    renderPractice();
    expect(current()).toHaveTextContent('海');
    expect(screen.getByText('现在打这个字')).toBeInTheDocument();
    typeKeys('hai');
    expect(current()).toHaveTextContent('外');
  });

  it('按错时键宝提示按到了哪个键', () => {
    renderPractice();
    typeKeys('x');
    expect(screen.getByText('哎呀，按到 X 啦。看看发光的那个键！')).toBeInTheDocument();
  });

  it('开着中文输入法时显示切换提示', () => {
    renderPractice();
    fireEvent.keyDown(window, { key: 'Process' });
    expect(screen.getByRole('alert')).toHaveTextContent('中文输入法');
  });

  it('可以关掉拼音', () => {
    renderPractice();
    fireEvent.click(screen.getByRole('button', { name: '拼音：开' }));
    expect(screen.getByRole('button', { name: '拼音：关' })).toBeInTheDocument();
  });

  it('打完整段：显示完成卡片、保存进度，能去看成绩', () => {
    renderPractice();
    typeKeys(lettersOf('c1-1'));
    expect(screen.getByText('整段完成！')).toBeInTheDocument();
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!).profiles[0];
    expect(saved.bookProgress.xiyouji.done).toEqual(['c1-1']);
    expect(saved.stars).toBe(3);
    expect(saved.totalChars).toBe(52);
    fireEvent.click(screen.getByRole('button', { name: '看看我的成绩' }));
    expect(window.location.hash).toBe('#/result');
  });

  it('连续按错同一个键，键盘上的错键会重新抖动', () => {
    renderPractice();
    typeKeys('x');
    const first = document.querySelector('[data-key="x"]');
    typeKeys('x');
    expect(document.querySelector('[data-key="x"]')).not.toBe(first);
  });

  it('点按钮不抢键盘焦点，免得按空格时误触发重来', () => {
    renderPractice();
    expect(fireEvent.mouseDown(screen.getByRole('button', { name: '重新开始这一段' }))).toBe(false);
    expect(fireEvent.mouseDown(screen.getByRole('button', { name: '拼音：开' }))).toBe(false);
  });

  it('找不到这一段时给出返回按钮', () => {
    renderPractice('sanguo', 'x');
    expect(screen.getByText('找不到这一段')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '回读书岛' }));
    expect(window.location.hash).toBe('#/books');
  });
});
```

- [ ] **Step 6: 运行，确认失败**

Run: `npx vitest run src/pages/Practice.test.tsx`
Expected: FAIL，提示找不到 `./Practice`

- [ ] **Step 7: 写 `src/pages/Practice.css`**

```css
.mini-cover {
  display: inline-flex; align-items: center; justify-content: center;
  width: 30px; height: 38px; border: 2px solid var(--ink); border-radius: 4px 8px 8px 4px;
  font: 400 18px var(--font-display);
}
.practice-progress { flex-wrap: nowrap; }
.practice-main { display: flex; flex-wrap: wrap; gap: 24px; align-items: stretch; }
.practice-passage { flex: 999 1 640px; min-width: 0; display: flex; flex-direction: column; gap: 18px; }
.practice-title { font-size: 30px; }
.practice-coach { flex-wrap: nowrap; margin-top: auto; }
.coach-bubble {
  flex: 1; margin: 0; padding: 14px 18px; background: var(--sun-soft);
  border: 3px solid var(--ink); border-radius: 20px; font-weight: 700; font-size: 19px; line-height: 1.5;
}
.practice-tip { margin: 0; font-size: 15px; color: var(--ink-2); }
.practice-side { flex: 1 1 340px; min-width: 0; display: flex; flex-direction: column; gap: 20px; }
.now-card, .done-card { display: flex; flex-direction: column; align-items: center; gap: 16px; text-align: center; }
.now-label { font-weight: 700; color: var(--ink-2); font-size: 18px; }
.now-row { justify-content: center; }
.now-char {
  width: 112px; height: 112px; display: flex; align-items: center; justify-content: center;
  background: var(--sun); border: 3px solid var(--ink); border-radius: 28px; box-shadow: 0 6px 0 var(--ink);
  font-size: 66px; font-weight: 700;
}
.now-tone { font-weight: 600; font-size: 40px; }
.now-letters { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }
.now-letter {
  width: 60px; height: 66px; display: flex; align-items: center; justify-content: center;
  background: #fff; border: 3px solid var(--ink); border-radius: 16px; box-shadow: 0 4px 0 var(--ink);
  font: 700 34px var(--font-latin);
}
.now-letter.is-done { background: var(--mint); }
.now-letter.is-next { background: var(--sun); box-shadow: 0 7px 0 var(--ink); transform: translateY(-4px); }
.now-finger { margin: 0; font-size: 19px; }
.done-card { background: var(--mint-soft); }
.done-card h2 { font-size: 40px; }
.done-card p { margin: 0; font-weight: 700; font-size: 19px; }
.done-card .btn { width: 100%; }
.practice-keyboard { display: flex; flex-direction: column; gap: 14px; }
```

- [ ] **Step 8: 实现 `src/pages/Practice.tsx`**

```tsx
import { type MouseEvent, useCallback, useEffect, useRef, useState } from 'react';
import { getBook, getSegment } from '../content/library';
import type { Book, Segment } from '../content/schema';
import { FINGER_NAME, fingerOf } from '../engine/fingers';
import { createSession, currentToken, expectedKey, pause, press } from '../engine/session';
import { accuracy, buildResult, speedCpm, starsFor } from '../engine/stats';
import { useTypingInput } from '../hooks/useTypingInput';
import { navigate } from '../router';
import { useProfile } from '../storage/ProfileContext';
import { recordSegment, today } from '../storage/profile';
import Hands from '../ui/Hands';
import Keyboard from '../ui/Keyboard';
import Mascot from '../ui/Mascot';
import Passage from '../ui/Passage';
import ProgressBar from '../ui/ProgressBar';
import StarRow from '../ui/StarRow';
import { coachMessage } from './coach';
import './Practice.css';

export const IDLE_PAUSE_MS = 10_000;

/** 打字过程中点按钮不抢焦点，否则孩子按空格或回车会再次触发这个按钮 */
const keepFocus = (e: MouseEvent) => e.preventDefault();

export default function Practice({ bookId, segmentId }: { bookId: string; segmentId: string }) {
  const book = getBook(bookId);
  const segment = getSegment(bookId, segmentId);
  if (!book || !segment) {
    return (
      <main className="page">
        <div className="page-inner">
          <div className="card">
            <h1 className="display">找不到这一段</h1>
            <p>可能这本书还没上线。</p>
            <button type="button" className="btn btn-primary" onClick={() => navigate({ name: 'books' })}>
              回读书岛
            </button>
          </div>
        </div>
      </main>
    );
  }
  return <PracticeSession key={`${bookId}/${segmentId}`} book={book} segment={segment} />;
}

function PracticeSession({ book, segment }: { book: Book; segment: Segment }) {
  const { profile, update, setLastResult } = useProfile();
  const [session, setSession] = useState(() => createSession(segment.tokens));
  const [imeWarn, setImeWarn] = useState(false);
  const [paused, setPaused] = useState(false);
  const saved = useRef(false);

  const onLetter = useCallback((key: string, now: number) => {
    setImeWarn(false);
    setPaused(false);
    setSession((s) => press(s, key, now).session);
  }, []);
  const onIme = useCallback(() => setImeWarn(true), []);
  const onPause = useCallback(() => {
    setSession((s) => pause(s));
    setPaused(true);
  }, []);
  useTypingInput(!session.done, { onLetter, onIme, onPause });

  // 10 秒没按键自动暂停
  useEffect(() => {
    if (session.done || session.lastPressAt === null) return;
    const t = window.setTimeout(onPause, IDLE_PAUSE_MS);
    return () => window.clearTimeout(t);
  }, [session.lastPressAt, session.done, onPause]);

  // 打完一段：记成绩，只记一次
  useEffect(() => {
    if (!session.done || saved.current) return;
    saved.current = true;
    const result = buildResult(session, book.id, segment.id);
    setLastResult(result);
    update((p) => recordSegment(p, result, today()));
  }, [session, book.id, segment.id, setLastResult, update]);

  const restart = () => {
    saved.current = false;
    setSession(createSession(segment.tokens));
    setPaused(false);
    setImeWarn(false);
  };
  const togglePinyin = () =>
    update((p) => ({ ...p, settings: { ...p.settings, showPinyin: !p.settings.showPinyin } }));

  const cur = currentToken(session);
  const next = expectedKey(session);
  const finger = next ? fingerOf(next) : null;
  const acc = accuracy(session);
  const typed = session.right + session.wrong;
  const total = session.hanziIdx.length;
  const showPinyin = profile.settings.showPinyin;

  return (
    <main className="page">
      <div className="page-inner">
        <header className="row spread">
          <div className="row">
            <button type="button" className="btn" onClick={() => navigate({ name: 'books' })}>
              ← 读书岛
            </button>
            <span className="chip">
              <span className="mini-cover" style={{ background: book.cover }}>
                {book.mark}
              </span>
              《{book.title}》{segment.title}
            </span>
          </div>
          <div className="row">
            <span className="chip">
              速度 <b className="latin">{speedCpm(session)}</b> 字/分
            </span>
            <span className="chip">
              正确率 <b className="latin">{acc}%</b>
            </span>
            <span className="chip">
              <StarRow count={typed === 0 ? 3 : starsFor(acc)} />
            </span>
            <button type="button" className="btn" onMouseDown={keepFocus} onClick={restart} aria-label="重新开始这一段">
              重来
            </button>
          </div>
        </header>

        <div className="row practice-progress">
          <b>本段进度</b>
          <ProgressBar value={(session.cursor * 100) / Math.max(1, total)} label="本段进度" height={26} />
          <b className="latin">
            {session.cursor} / {total} 字
          </b>
        </div>

        {imeWarn && (
          <div role="alert" className="banner">
            好像开着中文输入法～按一下 Shift 切换成英文，再接着打。
          </div>
        )}
        {paused && !session.done && (
          <div role="status" className="banner banner-soft">
            休息一下～按任意字母就继续。
          </div>
        )}

        <div className="practice-main">
          <section className="card practice-passage">
            <div className="row spread">
              <h1 className="display practice-title">{segment.title}</h1>
              <button type="button" className="btn" aria-pressed={showPinyin} onMouseDown={keepFocus} onClick={togglePinyin}>
                拼音：{showPinyin ? '开' : '关'}
              </button>
            </div>
            <Passage session={session} showPinyin={showPinyin} />
            <div className="row practice-coach">
              <Mascot size={86} mood={session.lastWrongKey ? 'oops' : 'happy'} />
              <p className="coach-bubble" aria-live="polite">
                {coachMessage(session)}
              </p>
            </div>
            <p className="practice-tip">小提示：只打拼音字母，不用打声调；标点会自动跳过。ü 用 V 键。</p>
          </section>

          <aside className="practice-side">
            {cur && next ? (
              <div className="card now-card">
                <div className="now-label">现在打这个字</div>
                <div className="row now-row">
                  <div className="now-char">{cur.char}</div>
                  <div className="now-tone latin">{cur.tone}</div>
                </div>
                <div className="now-letters">
                  {[...cur.key].map((letter, j) => (
                    <span
                      key={j}
                      className={j < session.pos ? 'now-letter is-done' : j === session.pos ? 'now-letter is-next' : 'now-letter'}
                    >
                      {letter}
                    </span>
                  ))}
                </div>
                <p className="now-finger">
                  用 <b>{finger ? FINGER_NAME[finger] : ''}</b> 按 <b className="latin">{next.toUpperCase()}</b> 键
                </p>
              </div>
            ) : (
              <div className="card done-card">
                <StarRow count={starsFor(acc)} size={56} />
                <h2 className="display">整段完成！</h2>
                <p>
                  速度 {speedCpm(session)} 字/分 · 正确率 {acc}%
                </p>
                <button type="button" className="btn btn-primary" onClick={() => navigate({ name: 'result' })}>
                  看看我的成绩
                </button>
                <button type="button" className="btn" onClick={restart}>
                  再打一次
                </button>
              </div>
            )}
          </aside>
        </div>

        <section className="card practice-keyboard">
          <Keyboard nextKey={next} wrongKey={session.lastWrongKey} wrongTick={session.wrong} />
          <Hands finger={finger} />
        </section>
      </div>
    </main>
  );
}
```

- [ ] **Step 9: 运行，确认通过**

Run: `npx vitest run src/pages/Practice.test.tsx`
Expected: PASS（8 个测试）

- [ ] **Step 10: 提交**

```bash
git add src/pages/coach.ts src/pages/coach.test.ts src/pages/Practice.tsx src/pages/Practice.css src/pages/Practice.test.tsx
git commit -m "feat: 打字练习页（拼音直打、键盘提示、完成后记成绩）"
```

---

### Task 17: 结算页

**Files:**
- Create: `src/pages/format.ts`, `src/pages/Result.tsx`, `src/pages/Result.css`
- Test: `src/pages/format.test.ts`, `src/pages/Result.test.tsx`

- [ ] **Step 1: 写格式化的失败测试 `src/pages/format.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { formatDuration, headlineFor } from './format';

describe('formatDuration', () => {
  it('毫秒变成 分:秒', () => {
    expect(formatDuration(65000)).toBe('1:05');
    expect(formatDuration(4000)).toBe('0:04');
    expect(formatDuration(600000)).toBe('10:00');
  });
});

describe('headlineFor', () => {
  it('按星星给不同的夸奖', () => {
    expect(headlineFor(3, '小明')).toBe('太棒了，小明！');
    expect(headlineFor(2, '小明')).toBe('真不错，小明！');
    expect(headlineFor(1, '小明')).toBe('完成啦，小明！再练练会更好');
  });
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `npx vitest run src/pages/format.test.ts`
Expected: FAIL，提示找不到 `./format`

- [ ] **Step 3: 实现 `src/pages/format.ts`**

```ts
export function formatDuration(ms: number): string {
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function headlineFor(stars: number, name: string): string {
  if (stars >= 3) return `太棒了，${name}！`;
  if (stars === 2) return `真不错，${name}！`;
  return `完成啦，${name}！再练练会更好`;
}
```

- [ ] **Step 4: 运行，确认通过**

Run: `npx vitest run src/pages/format.test.ts`
Expected: PASS（2 个测试）

- [ ] **Step 5: 写结算页的失败测试 `src/pages/Result.test.tsx`**

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { SegmentResult } from '../engine/stats';
import { ProfileProvider } from '../storage/ProfileContext';
import { STORAGE_KEY } from '../storage/profile';
import Result from './Result';

const RESULT: SegmentResult = {
  bookId: 'xiyouji',
  segmentId: 'c1-1',
  hanzi: 52,
  speed: 24,
  accuracy: 96,
  stars: 3,
  activeMs: 65000,
  keyErrors: { z: 2, h: 1 },
  topErrors: [
    { key: 'z', count: 2 },
    { key: 'h', count: 1 },
  ],
};

function renderResult(result: SegmentResult = RESULT) {
  return render(
    <ProfileProvider storage={localStorage} initialResult={result}>
      <Result />
    </ProfileProvider>,
  );
}

describe('Result', () => {
  it('显示夸奖、星星和四项成绩', () => {
    renderResult();
    expect(screen.getByRole('heading', { name: '太棒了，小朋友！' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '3 颗星' })).toBeInTheDocument();
    expect(screen.getByTestId('stat-speed')).toHaveTextContent('24');
    expect(screen.getByTestId('stat-acc')).toHaveTextContent('96%');
    expect(screen.getByTestId('stat-time')).toHaveTextContent('1:05');
    expect(screen.getByTestId('stat-chars')).toHaveTextContent('52');
  });

  it('列出要多练的键', () => {
    renderResult();
    expect(screen.getByText('Z')).toBeInTheDocument();
    expect(screen.getByText('错 2 次')).toBeInTheDocument();
  });

  it('小考考答对多给 1 颗星，只能答一次', () => {
    renderResult();
    fireEvent.click(screen.getByRole('button', { name: '傲来国' }));
    expect(screen.getByText('答对啦！星星 +1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '女儿国' }));
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).profiles[0].stars).toBe(1);
  });

  it('答错时告诉正确答案', () => {
    renderResult();
    fireEvent.click(screen.getByRole('button', { name: '车迟国' }));
    expect(screen.getByText('再想想～正确答案是「傲来国」')).toBeInTheDocument();
  });

  it('下一段按钮去这本书的下一段', () => {
    renderResult();
    fireEvent.click(screen.getByRole('button', { name: '下一段 →' }));
    expect(window.location.hash).toBe('#/practice/xiyouji/c1-2');
  });

  it('最后一段时改成回读书岛', () => {
    renderResult({ ...RESULT, segmentId: 'c1-4' });
    fireEvent.click(screen.getByRole('button', { name: '这本读完啦，回读书岛' }));
    expect(window.location.hash).toBe('#/books');
  });

  it('没有成绩时引导去读书岛', () => {
    render(
      <ProfileProvider storage={localStorage}>
        <Result />
      </ProfileProvider>,
    );
    expect(screen.getByText('还没有成绩哦')).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: 运行，确认失败**

Run: `npx vitest run src/pages/Result.test.tsx`
Expected: FAIL，提示找不到 `./Result`

- [ ] **Step 7: 写 `src/pages/Result.css`**

```css
.result-hero { display: flex; flex-wrap: wrap; align-items: center; gap: 28px; background: var(--sun); }
.result-hero-text { flex: 1 1 380px; min-width: 0; display: flex; flex-direction: column; gap: 12px; }
.result-hero-text h1 { font-size: 56px; line-height: 1.1; }
.result-actions { display: flex; flex-direction: column; gap: 12px; min-width: 240px; }
.stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; }
.stat { padding: 20px 22px; }
.stat-label { font-weight: 700; color: var(--ink-2); }
.stat-value { margin-top: 6px; font: 700 46px/1 var(--font-latin); }
.stat-value small { font-size: 20px; }
.result-lower { display: flex; flex-wrap: wrap; gap: 24px; align-items: stretch; }
.quiz-card { flex: 1 1 380px; display: flex; flex-direction: column; gap: 14px; }
.quiz-card h2, .errors-card h2 { font-size: 30px; }
.quiz-q { margin: 0; font-size: 20px; font-weight: 700; }
.quiz-option { justify-content: flex-start; width: 100%; }
.quiz-option.is-right { background: var(--mint); }
.quiz-option.is-wrong { background: var(--coral); }
.quiz-feedback { min-height: 28px; margin: 0; font-weight: 700; font-size: 18px; }
.errors-card { flex: 1 1 380px; display: flex; flex-direction: column; gap: 14px; }
.err-key {
  display: inline-flex; flex-direction: column; align-items: center; justify-content: center;
  width: 76px; height: 76px; background: var(--peach); border: 3px solid var(--ink); border-radius: 16px;
  box-shadow: 0 4px 0 var(--ink); font: 700 28px/1 var(--font-latin);
}
.err-key small { margin-top: 4px; font: 700 13px var(--font-body); }
```

- [ ] **Step 8: 实现 `src/pages/Result.tsx`**

```tsx
import { useState } from 'react';
import { getBook, getSegment, segmentAfter } from '../content/library';
import { navigate } from '../router';
import { useProfile } from '../storage/ProfileContext';
import { addStars } from '../storage/profile';
import Mascot from '../ui/Mascot';
import StarRow from '../ui/StarRow';
import { formatDuration, headlineFor } from './format';
import './Result.css';

export default function Result() {
  const { profile, update, lastResult } = useProfile();
  const [picked, setPicked] = useState<number | null>(null);

  if (!lastResult) {
    return (
      <main className="page">
        <div className="page-inner">
          <div className="card">
            <h1 className="display">还没有成绩哦</h1>
            <p>先去读书岛打一段吧！</p>
            <button type="button" className="btn btn-primary" onClick={() => navigate({ name: 'books' })}>
              去读书岛
            </button>
          </div>
        </div>
      </main>
    );
  }

  const r = lastResult;
  const book = getBook(r.bookId);
  const segment = getSegment(r.bookId, r.segmentId);
  const nextId = book ? segmentAfter(book, r.segmentId) : null;
  const quiz = segment?.quiz;

  const pick = (i: number) => {
    if (picked !== null || !quiz) return;
    setPicked(i);
    if (i === quiz.answer) update((p) => addStars(p, 1));
  };

  return (
    <main className="page">
      <div className="page-inner">
        <section className="card result-hero">
          <Mascot size={180} mood="cheer" label="键宝在欢呼" />
          <div className="result-hero-text">
            <b>
              {book ? `《${book.title}》` : ''}
              {segment?.title ?? ''} · 完成
            </b>
            <h1 className="display">{headlineFor(r.stars, profile.nickname)}</h1>
            <StarRow count={r.stars} size={64} />
          </div>
          <div className="result-actions">
            {nextId ? (
              <button
                type="button"
                className="btn btn-dark"
                onClick={() => navigate({ name: 'practice', bookId: r.bookId, segmentId: nextId })}
              >
                下一段 →
              </button>
            ) : (
              <button type="button" className="btn btn-dark" onClick={() => navigate({ name: 'books' })}>
                这本读完啦，回读书岛
              </button>
            )}
            <button
              type="button"
              className="btn"
              onClick={() => navigate({ name: 'practice', bookId: r.bookId, segmentId: r.segmentId })}
            >
              再练一次
            </button>
            <button type="button" className="btn" onClick={() => navigate({ name: 'books' })}>
              回读书岛
            </button>
          </div>
        </section>

        <section className="stat-grid" aria-label="本次成绩">
          <div className="card stat" data-testid="stat-speed">
            <div className="stat-label">速度</div>
            <div className="stat-value">
              {r.speed} <small>字/分</small>
            </div>
          </div>
          <div className="card stat" data-testid="stat-acc">
            <div className="stat-label">正确率</div>
            <div className="stat-value">{r.accuracy}%</div>
          </div>
          <div className="card stat" data-testid="stat-time">
            <div className="stat-label">用时</div>
            <div className="stat-value">{formatDuration(r.activeMs)}</div>
          </div>
          <div className="card stat" data-testid="stat-chars">
            <div className="stat-label">打了</div>
            <div className="stat-value">
              {r.hanzi} <small>个字</small>
            </div>
          </div>
        </section>

        <div className="result-lower">
          {quiz && (
            <section className="card quiz-card">
              <h2 className="display">读书小考考</h2>
              <p className="quiz-q">{quiz.q}</p>
              {quiz.options.map((opt, i) => {
                const cls =
                  picked === null ? 'btn quiz-option' : i === quiz.answer ? 'btn quiz-option is-right' : i === picked ? 'btn quiz-option is-wrong' : 'btn quiz-option';
                return (
                  <button key={opt} type="button" className={cls} aria-pressed={picked === i} onClick={() => pick(i)}>
                    {opt}
                  </button>
                );
              })}
              <p className="quiz-feedback" aria-live="polite">
                {picked === null
                  ? '选一个答案吧～答对多得 1 颗星。'
                  : picked === quiz.answer
                    ? '答对啦！星星 +1'
                    : `再想想～正确答案是「${quiz.options[quiz.answer]}」`}
              </p>
            </section>
          )}
          <section className="card errors-card">
            <h2 className="display">这些键要多练</h2>
            {r.topErrors.length === 0 ? (
              <p>一个键都没按错，厉害！</p>
            ) : (
              <div className="row">
                {r.topErrors.map((e) => (
                  <span key={e.key} className="err-key">
                    {e.key.toUpperCase()}
                    <small>错 {e.count} 次</small>
                  </span>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 9: 运行，确认通过**

Run: `npx vitest run src/pages/Result.test.tsx`
Expected: PASS（7 个测试）

- [ ] **Step 10: 提交**

```bash
git add src/pages/format.ts src/pages/format.test.ts src/pages/Result.tsx src/pages/Result.css src/pages/Result.test.tsx
git commit -m "feat: 结算页（成绩、读书小考考、易错键）"
```

---

### Task 18: 读书岛书架

**Files:**
- Create: `src/pages/Bookshelf.tsx`, `src/pages/Bookshelf.css`
- Test: `src/pages/Bookshelf.test.tsx`

- [ ] **Step 1: 写失败的测试**

```tsx
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProfileProvider } from '../storage/ProfileContext';
import { defaultStore, saveStore } from '../storage/profile';
import Bookshelf from './Bookshelf';

function renderShelf() {
  return render(
    <ProfileProvider storage={localStorage}>
      <Bookshelf />
    </ProfileProvider>,
  );
}

describe('Bookshelf', () => {
  it('默认显示档案里的年级（五年级）', () => {
    renderShelf();
    expect(screen.getByRole('tab', { name: '五年级' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('heading', { name: '古典名著' })).toBeInTheDocument();
  });

  it('已上线的书可以开始，没上线的显示即将上线', () => {
    renderShelf();
    expect(screen.getByRole('button', { name: '开始打字：《西游记》' })).toBeEnabled();
    const sanguo = screen.getByText('三国演义').closest('article')!;
    expect(within(sanguo).getByRole('button', { name: '即将上线' })).toBeDisabled();
  });

  it('切换年级', () => {
    renderShelf();
    fireEvent.click(screen.getByRole('tab', { name: '四年级' }));
    expect(screen.getByRole('heading', { name: '神话故事' })).toBeInTheDocument();
    expect(screen.getByText('中国古代神话')).toBeInTheDocument();
  });

  it('点开始打字进入第一段', () => {
    renderShelf();
    fireEvent.click(screen.getByRole('button', { name: '开始打字：《西游记》' }));
    expect(window.location.hash).toBe('#/practice/xiyouji/c1-1');
  });

  it('打过的书显示进度，继续时跳到没打过的段', () => {
    const store = defaultStore();
    store.profiles[0].bookProgress.xiyouji = { done: ['c1-1'], lastSegment: 'c1-1', updatedAt: 1 };
    saveStore(localStorage, store);
    renderShelf();
    expect(screen.getByText('已打 1 / 4 段')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '继续打字：《西游记》' }));
    expect(window.location.hash).toBe('#/practice/xiyouji/c1-2');
  });

  it('每本书都写着读完能得到的大皮肤', () => {
    renderShelf();
    expect(screen.getByText('读完送大皮肤「美猴王」')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `npx vitest run src/pages/Bookshelf.test.tsx`
Expected: FAIL，提示找不到 `./Bookshelf`

- [ ] **Step 3: 写 `src/pages/Bookshelf.css`**

```css
.shelf-hero { display: flex; flex-wrap: wrap; align-items: center; gap: 28px; background: var(--peach); }
.shelf-hero-text { flex: 1 1 420px; min-width: 0; }
.shelf-hero-text p { margin: 10px 0 0; font-size: 20px; line-height: 1.6; }
.shelf-title { font-size: 54px; }
.shelf-stat { min-width: 120px; padding: 14px 18px; background: #fff; border: 3px solid var(--ink); border-radius: 20px; text-align: center; display: flex; flex-direction: column; gap: 6px; }
.shelf-stat b { font-size: 36px; line-height: 1; }
.grade-tab { min-width: 160px; min-height: 70px; font: 400 32px var(--font-display); }
.grade-tab.is-on { background: var(--sun); box-shadow: 0 7px 0 var(--ink); transform: translateY(-3px); }
.shelf { display: flex; flex-direction: column; gap: 18px; }
.shelf-name { font-size: 34px; }
.shelf-count { color: var(--ink-2); }
.shelf-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 24px; }
.shelf-plank { height: 16px; background: #e2b984; border: 3px solid var(--ink); border-radius: 8px; }
.book-card { display: flex; flex-direction: column; gap: 12px; padding: 14px; background: #fff; border: 3px solid var(--ink); border-radius: 24px; box-shadow: 0 6px 0 var(--ink); }
.book-cover {
  position: relative; height: 210px; padding: 18px 18px 18px 34px; overflow: hidden;
  border: 3px solid var(--ink); border-radius: 10px 16px 16px 10px;
  display: flex; flex-direction: column; justify-content: space-between;
}
.book-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 16px; background: var(--ink); opacity: 0.2; }
.book-cover-title { font-size: 30px; line-height: 1.2; }
.book-mark {
  align-self: flex-end; width: 86px; height: 86px; border-radius: 999px; background: #fff; border: 3px solid var(--ink);
  display: flex; align-items: center; justify-content: center; font-size: 46px;
}
.book-author { color: var(--ink-2); font-size: 15px; }
.book-status { font-weight: 700; font-size: 15px; }
.book-reward { font-weight: 700; font-size: 14px; color: var(--purple-ink); }
```

- [ ] **Step 4: 实现 `src/pages/Bookshelf.tsx`**

```tsx
import { useState } from 'react';
import { type ShelfBook, listShelf, nextSegmentId } from '../content/library';
import { navigate } from '../router';
import { useProfile } from '../storage/ProfileContext';
import Mascot from '../ui/Mascot';
import ProgressBar from '../ui/ProgressBar';
import './Bookshelf.css';

const GRADES = [
  { g: 4, label: '四年级' },
  { g: 5, label: '五年级' },
  { g: 6, label: '六年级' },
] as const;

export default function Bookshelf() {
  const { profile } = useProfile();
  const [grade, setGrade] = useState<4 | 5 | 6>(profile.grade);
  const groups = listShelf(grade);
  const poems = listShelf(0).flatMap((g) => g.books);
  const doneOf = (id: string) => profile.bookProgress[id]?.done ?? [];

  const books = groups.flatMap((g) => g.books);
  const isFinished = (b: ShelfBook) => b.ready && b.segmentIds.every((s) => doneOf(b.id).includes(s));
  const finished = books.filter(isFinished).length;
  const reading = books.filter((b) => b.ready && doneOf(b.id).length > 0 && !isFinished(b)).length;

  return (
    <main className="page">
      <div className="page-inner">
        <header className="row spread">
          <button type="button" className="btn" onClick={() => navigate({ name: 'home' })}>
            ← 回大厅
          </button>
          <span className="chip">
            星星 <b className="latin">{profile.stars}</b>
          </span>
        </header>

        <section className="card shelf-hero">
          <Mascot size={130} label="键宝" />
          <div className="shelf-hero-text">
            <h1 className="display shelf-title">读书岛</h1>
            <p>跟着语文课本「快乐读书吧」选书，一段一段边读边打。读完一整本，就能领一套大皮肤！</p>
          </div>
          <div className="row">
            <Stat n={finished} label="本已读完" />
            <Stat n={reading} label="本正在读" />
            <Stat n={books.length} label="本书" />
          </div>
        </section>

        <div role="tablist" aria-label="选择年级" className="row">
          {GRADES.map(({ g, label }) => (
            <button
              key={g}
              type="button"
              role="tab"
              aria-selected={grade === g}
              className={grade === g ? 'btn grade-tab is-on' : 'btn grade-tab'}
              onClick={() => setGrade(g)}
            >
              {label}
            </button>
          ))}
        </div>

        {groups.map((group) => (
          <Shelf key={group.term} term={group.term} title={group.theme} note="快乐读书吧推荐" books={group.books} doneOf={doneOf} />
        ))}
        <Shelf term="通用" title="古诗词小站" note="短小好打，适合热身" books={poems} doneOf={doneOf} />
      </div>
    </main>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="shelf-stat">
      <b className="latin">{n}</b>
      <span>{label}</span>
    </div>
  );
}

type ShelfProps = { term: string; title: string; note: string; books: ShelfBook[]; doneOf: (id: string) => string[] };

function Shelf({ term, title, note, books, doneOf }: ShelfProps) {
  return (
    <section className="shelf" aria-label={title}>
      <div className="row">
        <span className="tag tag-dark">{term}</span>
        <h2 className="display shelf-name">{title}</h2>
        <span className="shelf-count">
          {note} · {books.length} 本
        </span>
      </div>
      <div className="shelf-grid">
        {books.map((b) => (
          <BookCard key={b.id} book={b} done={doneOf(b.id)} />
        ))}
      </div>
      <div className="shelf-plank" />
    </section>
  );
}

function BookCard({ book, done }: { book: ShelfBook; done: string[] }) {
  const total = book.segmentIds.length;
  const doneCount = book.segmentIds.filter((s) => done.includes(s)).length;
  const finished = book.ready && total > 0 && doneCount === total;
  const started = doneCount > 0 && !finished;
  const status = !book.ready
    ? '即将上线'
    : finished
      ? `已读完 · 全部 ${total} 段`
      : started
        ? `已打 ${doneCount} / ${total} 段`
        : `共 ${total} 段，还没开始`;
  const label = finished ? '再读一遍' : started ? '继续打字' : '开始打字';
  const open = () => {
    const seg = nextSegmentId(book.segmentIds, done);
    if (seg) navigate({ name: 'practice', bookId: book.id, segmentId: seg });
  };

  return (
    <article className="book-card">
      <div className="book-cover" style={{ background: book.cover }}>
        <span className="book-spine" />
        <span className="display book-cover-title">{book.title}</span>
        <span className="display book-mark" aria-hidden="true">
          {book.mark}
        </span>
      </div>
      <div className="book-author">{book.author}</div>
      <ProgressBar value={total ? (doneCount * 100) / total : 0} label={`《${book.title}》阅读进度`} height={14} />
      <div className="book-status">{status}</div>
      <div className="book-reward">{finished ? `已获得大皮肤「${book.skinName}」` : `读完送大皮肤「${book.skinName}」`}</div>
      {book.ready ? (
        <button type="button" className={started ? 'btn btn-primary' : 'btn'} onClick={open} aria-label={`${label}：《${book.title}》`}>
          {label}
        </button>
      ) : (
        <button type="button" className="btn" disabled>
          即将上线
        </button>
      )}
    </article>
  );
}
```

- [ ] **Step 5: 运行，确认通过**

Run: `npx vitest run src/pages/Bookshelf.test.tsx`
Expected: PASS（6 个测试）

- [ ] **Step 6: 提交**

```bash
git add src/pages/Bookshelf.tsx src/pages/Bookshelf.css src/pages/Bookshelf.test.tsx
git commit -m "feat: 读书岛书架（年级切换、进度、即将上线）"
```

---

### Task 19: 首页和应用入口

**Files:**
- Create: `src/pages/Home.tsx`, `src/pages/Home.css`
- Modify: `src/App.tsx`（整个替换）, `src/App.test.tsx`（整个替换）
- Test: `src/pages/Home.test.tsx`

- [ ] **Step 1: 写首页的失败测试 `src/pages/Home.test.tsx`**

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProfileProvider } from '../storage/ProfileContext';
import { defaultStore, saveStore } from '../storage/profile';
import Home from './Home';

function renderHome() {
  return render(
    <ProfileProvider storage={localStorage}>
      <Home />
    </ProfileProvider>,
  );
}

describe('Home', () => {
  it('第一次来：打招呼，引导去读书岛', () => {
    renderHome();
    expect(screen.getByRole('heading', { name: '你好，小朋友！' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '去读书岛 →' }));
    expect(window.location.hash).toBe('#/books');
  });

  it('读过书：显示继续读，并跳到没打过的段', () => {
    const store = defaultStore();
    store.profiles[0].bookProgress.xiyouji = { done: ['c1-1'], lastSegment: 'c1-1', updatedAt: 5 };
    saveStore(localStorage, store);
    renderHome();
    expect(screen.getByText('继续读：《西游记》')).toBeInTheDocument();
    expect(screen.getByText('已打 1 / 4 段')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '继续打字 →' }));
    expect(window.location.hash).toBe('#/practice/xiyouji/c1-2');
  });

  it('读书岛入口可以点，其他三个模式即将开放', () => {
    renderHome();
    fireEvent.click(screen.getByRole('button', { name: '读书岛：去选书' }));
    expect(window.location.hash).toBe('#/books');
    for (const name of ['指法训练营', '拼音快打', '游戏乐园']) {
      expect(screen.getByRole('button', { name: `${name}：即将开放` })).toBeDisabled();
    }
  });
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `npx vitest run src/pages/Home.test.tsx`
Expected: FAIL，提示找不到 `./Home`

- [ ] **Step 3: 写 `src/pages/Home.css`**

```css
.home-logo { font-size: 38px; line-height: 1; }
.home-sub { margin-top: 6px; color: var(--ink-2); font-size: 15px; }
.home-hero { display: flex; flex-wrap: wrap; align-items: center; gap: 28px; background: var(--sun); }
.home-hero-text { flex: 1 1 380px; min-width: 0; display: flex; flex-direction: column; gap: 16px; }
.home-hello { font-size: 50px; line-height: 1.1; }
.home-hero-text > p { margin: 0; font-size: 21px; line-height: 1.6; }
.home-continue {
  display: flex; flex-wrap: wrap; align-items: center; gap: 18px; padding: 18px 20px;
  background: #fff; border: 3px solid var(--ink); border-radius: 24px;
}
.home-continue-info { flex: 1 1 220px; display: flex; flex-direction: column; gap: 8px; }
.home-h2 { font-size: 36px; margin-bottom: 18px; }
.mode-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; }
.mode-card {
  display: flex; flex-direction: column; align-items: flex-start; gap: 14px; min-height: 230px; padding: 26px;
  border: 3px solid var(--ink); border-radius: 28px; box-shadow: 0 8px 0 var(--ink); text-align: left; cursor: pointer;
}
.mode-card:disabled { cursor: not-allowed; box-shadow: 0 4px 0 var(--ink); opacity: 0.8; }
.mode-title { font-size: 36px; line-height: 1.1; }
.mode-desc { font-size: 17px; line-height: 1.6; }
.mode-go { margin-top: auto; padding: 10px 20px; background: #fff; border: 3px solid var(--ink); border-radius: 16px; font-weight: 700; font-size: 20px; }
.home-footer { text-align: center; color: var(--ink-2); font-size: 15px; }
.storage-banner { margin: 16px 32px 0; }
```

- [ ] **Step 4: 实现 `src/pages/Home.tsx`**

```tsx
import { getBook, nextSegmentId } from '../content/library';
import { navigate } from '../router';
import { useProfile } from '../storage/ProfileContext';
import Mascot from '../ui/Mascot';
import ProgressBar from '../ui/ProgressBar';
import './Home.css';

export default function Home() {
  const { profile } = useProfile();
  const latest = Object.entries(profile.bookProgress)
    .filter(([id]) => getBook(id))
    .sort((a, b) => b[1].updatedAt - a[1].updatedAt)[0];
  const book = latest ? getBook(latest[0]) : null;
  const ids = book ? book.segments.map((s) => s.id) : [];
  const done = latest ? latest[1].done : [];
  const doneCount = ids.filter((id) => done.includes(id)).length;

  const continueReading = () => {
    if (!book) return;
    const seg = nextSegmentId(ids, done);
    if (seg) navigate({ name: 'practice', bookId: book.id, segmentId: seg });
  };

  return (
    <main className="page">
      <div className="page-inner">
        <header className="row spread">
          <div className="row">
            <Mascot size={60} label="小键盘大冒险" />
            <div>
              <div className="display home-logo">小键盘大冒险</div>
              <div className="home-sub">4–6 年级 · 边读课外书，边学打字</div>
            </div>
          </div>
          <div className="row">
            <span className="chip">
              星星 <b className="latin">{profile.stars}</b>
            </span>
            <span className="chip">{profile.nickname}</span>
          </div>
        </header>

        <section className="card home-hero">
          <Mascot size={180} label="键宝在挥手" />
          <div className="home-hero-text">
            <h1 className="display home-hello">你好，{profile.nickname}！</h1>
            <p>我是键宝。{book ? `今天接着读《${book.title}》吧！` : '去读书岛选一本书，我们一起边读边打字！'}</p>
            <div className="home-continue">
              {book ? (
                <>
                  <div className="home-continue-info">
                    <b>继续读：《{book.title}》</b>
                    <ProgressBar value={(doneCount * 100) / ids.length} label={`《${book.title}》阅读进度`} />
                    <span>
                      已打 {doneCount} / {ids.length} 段
                    </span>
                  </div>
                  <button type="button" className="btn btn-dark" onClick={continueReading}>
                    继续打字 →
                  </button>
                </>
              ) : (
                <button type="button" className="btn btn-dark" onClick={() => navigate({ name: 'books' })}>
                  去读书岛 →
                </button>
              )}
            </div>
          </div>
        </section>

        <section>
          <h2 className="display home-h2">今天想去哪里冒险？</h2>
          <div className="mode-grid">
            <button
              type="button"
              className="mode-card"
              style={{ background: 'var(--peach)' }}
              aria-label="读书岛：去选书"
              onClick={() => navigate({ name: 'books' })}
            >
              <span className="tag tag-coral">推荐</span>
              <span className="display mode-title">读书岛</span>
              <span className="mode-desc">4–6 年级「快乐读书吧」书单，边读边打</span>
              <span className="mode-go">去选书 →</span>
            </button>
            <ModeSoon title="指法训练营" desc="从 F 和 J 出发，认识每根手指的「家」" tint="var(--blue-soft)" />
            <ModeSoon title="拼音快打" desc="声母、韵母、整体认读，zh / ch / sh 专项练" tint="var(--mint-soft)" />
            <ModeSoon title="游戏乐园" desc="龙宫泡泡 · 筋斗云赛跑 · 字母雨" tint="var(--lav)" />
          </div>
        </section>

        <footer className="home-footer">Windows / macOS 通用 · 每天建议 20 分钟，记得让眼睛休息</footer>
      </div>
    </main>
  );
}

function ModeSoon({ title, desc, tint }: { title: string; desc: string; tint: string }) {
  return (
    <button type="button" className="mode-card" style={{ background: tint }} aria-label={`${title}：即将开放`} disabled>
      <span className="tag">即将开放</span>
      <span className="display mode-title">{title}</span>
      <span className="mode-desc">{desc}</span>
    </button>
  );
}
```

- [ ] **Step 5: 运行，确认通过**

Run: `npx vitest run src/pages/Home.test.tsx`
Expected: PASS（3 个测试）

- [ ] **Step 6: 替换 `src/App.tsx`**

```tsx
import Bookshelf from './pages/Bookshelf';
import Home from './pages/Home';
import Practice from './pages/Practice';
import Result from './pages/Result';
import { useRoute } from './router';
import { ProfileProvider, useProfile } from './storage/ProfileContext';

function Screens() {
  const route = useRoute();
  const { persistent } = useProfile();
  return (
    <>
      {!persistent && (
        <div role="alert" className="banner storage-banner">
          这台电脑的浏览器不允许保存，关掉页面后这次的进度就没了。
        </div>
      )}
      {route.name === 'home' && <Home />}
      {route.name === 'books' && <Bookshelf />}
      {route.name === 'practice' && <Practice bookId={route.bookId} segmentId={route.segmentId} />}
      {route.name === 'result' && <Result />}
    </>
  );
}

export default function App() {
  return (
    <ProfileProvider>
      <Screens />
    </ProfileProvider>
  );
}
```

- [ ] **Step 7: 替换 `src/App.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App', () => {
  it('默认进入首页', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: '你好，小朋友！' })).toBeInTheDocument();
  });

  it('按地址进入读书岛', () => {
    window.location.hash = '#/books';
    render(<App />);
    expect(screen.getByRole('heading', { name: '读书岛' })).toBeInTheDocument();
  });

  it('按地址进入练习页', () => {
    window.location.hash = '#/practice/xiyouji/c1-1';
    render(<App />);
    expect(screen.getByText('现在打这个字')).toBeInTheDocument();
  });

  it('能保存时不显示提示条', () => {
    render(<App />);
    expect(screen.queryByText(/不允许保存/)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 8: 运行全部测试**

Run: `npm test`
Expected: 全部 PASS（共 22 个测试文件）。

- [ ] **Step 9: 提交**

```bash
git add src/pages/Home.tsx src/pages/Home.css src/pages/Home.test.tsx src/App.tsx src/App.test.tsx
git commit -m "feat: 首页（继续读、模式入口）和应用路由"
```

---

### Task 20: 构建和浏览器验收

**Files:** 无新文件。只有发现问题时才修改对应文件。

- [ ] **Step 1: 构建**

Run: `npm run build`
Expected: 依次输出 `OK  《西游记》 4 段`、tsc 没有报错、`vite build` 生成 `dist/`，退出码 0。

- [ ] **Step 2: 启动开发服务器**

Run: `npm run dev`
Expected: 输出 `Local: http://localhost:5173/`

- [ ] **Step 3: 在浏览器里走一遍完整流程，逐项打勾**

- [ ] 首页：标题是站酷快乐体，数字是 Fredoka 圆体；四个模式卡片里只有「读书岛」能点。
- [ ] 读书岛：默认是五年级；点四、六年级能切换；《西游记》显示「开始打字」，其他书显示「即将上线」。
- [ ] 练习页：英文状态下打 `hai`，「海」变成绿色底，「外」变成黄色高亮；屏幕键盘上下一个键发光，并提示用哪根手指。
- [ ] 故意按错一个键：被按的键变橙色，键宝换成担心的表情，提示「按到 X 啦」。
- [ ] 切到中文输入法再打字：出现「中文输入法」提示条，进度不动；切回英文后提示条消失。
- [ ] 停 10 秒不按键：出现「休息一下」提示；再按一个字母就继续。
- [ ] 点「拼音：开」：除当前字外的拼音都隐藏；刷新页面后这个设置还在。
- [ ] 打完一段：出现完成卡片；点「看看我的成绩」进入结算页，速度、正确率、用时、字数都有数字。
- [ ] 结算页答小考考：答对显示「星星 +1」，左上角首页星星数增加；点「下一段 →」进入第 2 段。
- [ ] 回到首页：显示「继续读：《西游记》 已打 1 / 4 段」。
- [ ] 把浏览器窗口缩到手机宽度（约 375px）：没有横向滚动条，键盘按键变小但能看全。

- [ ] **Step 4: 在另一个平台上复查**

如果开发用的是 Windows，再在一台 Mac 上用 Safari 和 Chrome 打开（同一局域网内运行 `npm run dev -- --host`，然后访问电脑的 IP:5173）；反过来也一样。重点检查两件事：开着中文输入法时会不会出现提示条，字体是否正常显示。

- [ ] **Step 5: 修复发现的问题并提交**

每个问题先写一个能复现它的测试，再修复。最后提交：

```bash
git add -A
git commit -m "fix: 浏览器验收中发现的问题"
```

如果没有发现问题，就跳过这一步。

---

## 执行时的调整（以代码为准）

审查和浏览器实测后，实际代码比上面的步骤多了这些改动，都已提交：

- 测试依赖换成 Vitest 4.1.12、jest-dom 6.9.1（原版本有安全告警或已被废弃）。
- 打字页改成一屏布局（`be54008`）：原布局在笔记本上键盘完全跑到屏幕外。
- 拼音字体换成 Andika（`7da692c`）：Fredoka 的 ī 字形是错的。
- 其余修复见 git log：`toKey` 兼容 NFD、手动拼音写错时报错、存档保护、地址损坏回首页、连续按错重新抖动、小考考只能答一次、换页回顶部、标点不在行首等。

## 留给后续计划的事项

- **计划 2**：结算页要在 `recordSegment` 之后判断皮肤；重复打同一段会再得星星和字数，要决定是否接受。
- **计划 4（导入）**：导入备份必须校验字段类型，最好放进 `migrate`；导入文章要在 `src/` 里用 pinyin-pro，到时把它从 devDependencies 移到 dependencies。
- **计划 4（内容）**：小考考的正确答案要换位置，不能总放第一个。
- **计划 4（离线）**：PWA 预缓存用 `globPatterns: ['**/*.{js,css,html,woff2}']`，不要缓存 .woff；网页不能靠双击 `index.html` 打开，要决定孩子实际怎么打开（网址、本地服务或 Tauri 安装包）。
- **计划 4（统计）**：`daily.minutes` 不再四舍五入，显示时才取整。

## 完成标准

- `npm test` 全部通过，`npm run build` 成功。
- 在 Mac 和 Windows 的浏览器上都能走完：首页 → 读书岛 → 打完《西游记》一段 → 结算页答题 → 下一段。刷新页面后进度还在。
- 写好计划 2（奖励与皮肤）时，会用到本计划里的 `Profile.totalChars`、`bestSpeedLevel`、`skinsOwned`、`skinWorn`、`SegmentResult` 和 `Mascot` 的 `bodyFill/faceFill`。
