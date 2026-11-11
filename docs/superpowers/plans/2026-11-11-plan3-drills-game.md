# 计划 3：指法训练营、拼音快打、龙宫泡泡 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 首页另外三个模式能玩了：12 关指法训练营（正确率 90% 过关，解锁下一关）、拼音快打（声母、韵母、整体认读、易混音）、龙宫泡泡游戏（打拼音戳破《西游记》词语泡泡）。

**Architecture:** 打字计时逻辑从练习页抽成 `useTypingSession`，指法和拼音共用一个通用的 `Drill` 练习页（课文区、键盘双手、键宝都复用）。游戏规则写成纯函数（`src/game/bubbles.ts`），页面每 50 毫秒推进一次。成绩都通过档案的 `recordPractice` 记录，再走计划 2 的奖励和今日任务。

**Tech Stack:** 沿用前两个计划。

**本计划做的决定:**
- 指法关卡只练字母键（引擎只认 a–z），12 关从 F J 开始，逐步加到全键盘；每关 60 个键，分 15 组。
- 拼音快打和龙宫泡泡打出的汉字算进打字量（设计第 6 节）；指法训练营只给星星、解锁关卡和「指法毕业」徽章。
- 今日任务保持计划 2 的三项，不改。

---

### Task 1: 抽出打字会话 hook

**Files:**
- Create: `src/hooks/useTypingSession.ts`
- Modify: `src/pages/Practice.tsx`

- [ ] **Step 1: 写 `src/hooks/useTypingSession.ts`**

```ts
import { useCallback, useEffect, useState } from 'react';
import { createSession, pause, press } from '../engine/session';
import type { Token } from '../engine/types';
import { useTypingInput } from './useTypingInput';

export const IDLE_PAUSE_MS = 10_000;

/** 一次打字练习：接键盘、识别中文输入法、失焦和 10 秒不按键时暂停 */
export function useTypingSession(tokens: Token[]) {
  const [session, setSession] = useState(() => createSession(tokens));
  const [imeWarn, setImeWarn] = useState(false);
  const [paused, setPaused] = useState(false);

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

  useEffect(() => {
    if (session.done || session.lastPressAt === null) return;
    const t = window.setTimeout(onPause, IDLE_PAUSE_MS);
    return () => window.clearTimeout(t);
  }, [session.lastPressAt, session.done, onPause]);

  const restart = useCallback(() => {
    setSession(createSession(tokens));
    setPaused(false);
    setImeWarn(false);
  }, [tokens]);

  return { session, imeWarn, paused, restart };
}
```

- [ ] **Step 2: 改 `src/pages/Practice.tsx` 使用它**

1. 第一行 import 改成 `import { type MouseEvent, useEffect, useRef } from 'react';`。
2. `import { createSession, currentToken, expectedKey, pause, press } from '../engine/session';` 改成 `import { currentToken, expectedKey } from '../engine/session';`。
3. 删掉 `import { useTypingInput } from '../hooks/useTypingInput';`，加 `import { useTypingSession } from '../hooks/useTypingSession';`。
4. `export const IDLE_PAUSE_MS = 10_000;` 改成 `export { IDLE_PAUSE_MS } from '../hooks/useTypingSession';`。
5. 在 `PracticeSession` 里，把从 `const [session, setSession] = useState(...)` 到「10 秒没按键自动暂停」那个 `useEffect` 结束（含）的全部代码，换成：

```tsx
  const { session, imeWarn, paused, restart: resetSession } = useTypingSession(segment.tokens);
  const saved = useRef(false);
```

（注意：原来的 `const saved = useRef(false);` 在中间，替换后只保留上面这一条。）

6. `restart` 函数换成：

```tsx
  const restart = () => {
    saved.current = false;
    resetSession();
  };
```

- [ ] **Step 3: 运行，确认没有改坏**

Run: `npm test` 和 `npx tsc --noEmit; echo "tsc exit: $?"`
Expected: 全部 PASS（这是纯重构，练习页原有测试覆盖它），`tsc exit: 0`

- [ ] **Step 4: 提交**

```bash
git add src/hooks/useTypingSession.ts src/pages/Practice.tsx
git commit -m "refactor: 打字会话抽成 useTypingSession"
```

---

### Task 2: 档案记录指法关卡、游戏最高分和练习成绩

**Files:**
- Modify: `src/storage/profile.ts`, `src/rewards/config.ts`, `src/rewards/badges.ts`, `src/rewards/rewards.ts`
- Test: `src/storage/profile.test.ts`, `src/rewards/rewards.test.ts`, `src/pages/Home.test.tsx`

- [ ] **Step 1: 写失败的测试**

`src/storage/profile.test.ts`：import 列表加 `passFingerLevel`、`recordGameScore`、`recordPractice`，文件末尾加：

```ts
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
```

`src/rewards/rewards.test.ts`，在 `describe('syncRewards', ...)` 里加：

```ts
  it('12 关指法全部通过得指法毕业徽章', () => {
    expect(syncRewards({ ...base, fingerLevel: 12 }, undefined, DATE).unlocks.badges).toContain('finger-grad');
    expect(syncRewards({ ...base, fingerLevel: 11 }, undefined, DATE).unlocks.badges).not.toContain('finger-grad');
  });
```

`src/pages/Home.test.tsx`：把 `'已收集 0 / 15'` 改成 `'已收集 0 / 16'`。

- [ ] **Step 2: 运行，确认失败**

Run: `npx vitest run src/storage/profile.test.ts src/rewards/rewards.test.ts src/pages/Home.test.tsx`
Expected: 新测试 FAIL

- [ ] **Step 3: 实现**

`src/storage/profile.ts`：`Profile` 里 `bestSpeedLevel` 下面加：

```ts
  /** 指法训练营已通过的最高关（0 表示还没通过） */
  fingerLevel: number;
  /** 龙宫泡泡最高分 */
  gameBest: number;
```

`newProfile` 里 `bestSpeedLevel: 0,` 下面加 `fingerLevel: 0,` 和 `gameBest: 0,`。文件末尾加：

```ts
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
```

`src/rewards/config.ts` 末尾加：

```ts
export const FINGER_LEVEL_COUNT = 12;
export const FINGER_PASS_ACCURACY = 90;
```

`src/rewards/badges.ts` 的 `BADGES` 末尾加：

```ts
  { id: 'finger-grad', name: '指法毕业', desc: '通过指法训练营全部 12 关' },
```

`src/rewards/rewards.ts`：config 的 import 加上 `FINGER_LEVEL_COUNT`；`earned` 对象里 `huaguoshan` 上面加：

```ts
    'finger-grad': p.fingerLevel >= FINGER_LEVEL_COUNT,
```

- [ ] **Step 4: 运行，确认通过**

Run: `npm test` 和 `npx tsc --noEmit; echo "tsc exit: $?"`
Expected: 全部 PASS，`tsc exit: 0`

- [ ] **Step 5: 提交**

```bash
git add src/storage/profile.ts src/storage/profile.test.ts src/rewards src/pages/Home.test.tsx
git commit -m "feat: 档案记录指法关卡、游戏最高分和练习成绩"
```

---

### Task 3: 通用练习页 Drill

**Files:**
- Create: `src/pages/Drill.tsx`
- Test: `src/pages/Drill.test.tsx`

- [ ] **Step 1: 写失败的测试 `src/pages/Drill.test.tsx`**

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Token } from '../engine/types';
import { ProfileProvider } from '../storage/ProfileContext';
import Drill from './Drill';

const TOKENS: Token[] = [
  { kind: 'hanzi', char: 'F', key: 'f', tone: '' },
  { kind: 'hanzi', char: 'J', key: 'j', tone: '' },
  { kind: 'skip', char: '·' },
  { kind: 'hanzi', char: 'F', key: 'f', tone: '' },
];

function renderDrill(over: Partial<Parameters<typeof Drill>[0]> = {}) {
  const props = {
    title: '第 1 关 · F 和 J',
    tokens: TOKENS,
    unit: '键',
    back: { label: '← 训练营', route: { name: 'finger' as const } },
    onFinish: vi.fn(),
    onRestart: vi.fn(),
    ...over,
  };
  render(
    <ProfileProvider storage={localStorage}>
      <Drill {...props} />
    </ProfileProvider>,
  );
  return props;
}

const type = (keys: string) => {
  for (const k of keys) fireEvent.keyDown(window, { key: k });
};

describe('Drill', () => {
  it('显示标题、进度和要按的键', () => {
    renderDrill();
    expect(screen.getByRole('heading', { name: '第 1 关 · F 和 J' })).toBeInTheDocument();
    expect(screen.getByText('0 / 3 键')).toBeInTheDocument();
    expect(screen.getByText('现在按这个')).toBeInTheDocument();
  });

  it('打完后只回报一次成绩，显示完成卡片和说明', () => {
    const props = renderDrill({ note: '过关啦！' });
    type('fjf');
    expect(props.onFinish).toHaveBeenCalledTimes(1);
    expect(props.onFinish).toHaveBeenCalledWith(expect.objectContaining({ count: 3, accuracy: 100, stars: 3 }));
    expect(screen.getByText('完成啦！')).toBeInTheDocument();
    expect(screen.getByText('过关啦！')).toBeInTheDocument();
  });

  it('再来一次交给外面重新出题', () => {
    const props = renderDrill();
    type('fjf');
    fireEvent.click(screen.getByRole('button', { name: '再来一次' }));
    expect(props.onRestart).toHaveBeenCalled();
  });

  it('有下一关时显示下一关按钮', () => {
    const onNext = vi.fn();
    renderDrill({ onNext });
    type('fjf');
    fireEvent.click(screen.getByRole('button', { name: '下一关 →' }));
    expect(onNext).toHaveBeenCalled();
  });

  it('返回按钮', () => {
    renderDrill();
    fireEvent.click(screen.getByRole('button', { name: '← 训练营' }));
    expect(window.location.hash).toBe('#/finger');
  });
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `npx vitest run src/pages/Drill.test.tsx`
Expected: FAIL，提示找不到 `./Drill`

- [ ] **Step 3: 写 `src/pages/Drill.tsx`**

```tsx
import { type MouseEvent, useEffect, useRef } from 'react';
import { FINGER_NAME, fingerOf } from '../engine/fingers';
import { currentToken, expectedKey } from '../engine/session';
import { accuracy, speedCpm, starsFor } from '../engine/stats';
import type { Token } from '../engine/types';
import { useTypingSession } from '../hooks/useTypingSession';
import { type Route, navigate } from '../router';
import Keyboard from '../ui/Keyboard';
import Passage from '../ui/Passage';
import ProgressBar from '../ui/ProgressBar';
import StarRow from '../ui/StarRow';
import WornMascot from '../ui/WornMascot';
import { coachMessage } from './coach';
import './Practice.css';

export type DrillResult = { count: number; accuracy: number; speed: number; stars: 1 | 2 | 3; activeMs: number };

type Props = {
  title: string;
  tokens: Token[];
  /** 进度和速度的单位：键 或 字 */
  unit: string;
  back: { label: string; route: Route };
  onFinish: (r: DrillResult) => void;
  /** 「再来一次」和「重来」：由外面重新出题 */
  onRestart: () => void;
  onNext?: () => void;
  /** 完成卡片上的说明，比如「过关啦！」 */
  note?: string;
};

const keepFocus = (e: MouseEvent) => e.preventDefault();

/** 指法训练营和拼音快打共用的练习页 */
export default function Drill({ title, tokens, unit, back, onFinish, onRestart, onNext, note }: Props) {
  const { session, imeWarn, paused } = useTypingSession(tokens);
  const reported = useRef(false);

  useEffect(() => {
    if (!session.done || reported.current) return;
    reported.current = true;
    const acc = accuracy(session);
    onFinish({ count: session.cursor, accuracy: acc, speed: speedCpm(session), stars: starsFor(acc), activeMs: session.activeMs });
  }, [session, onFinish]);

  const cur = currentToken(session);
  const next = expectedKey(session);
  const finger = next ? fingerOf(next) : null;
  const acc = accuracy(session);
  const typed = session.right + session.wrong;
  const total = session.hanziIdx.length;

  return (
    <main className="page practice-page">
      <div className="page-inner practice-inner">
        <header className="row practice-header">
          <button type="button" className="btn" onClick={() => navigate(back.route)}>
            {back.label}
          </button>
          <h1 className="chip practice-book">
            <span className="practice-book-title">{title}</span>
          </h1>
          <div className="practice-progress">
            <ProgressBar value={(session.cursor * 100) / Math.max(1, total)} label="进度" height={22} />
            <b className="latin">
              {session.cursor} / {total} {unit}
            </b>
          </div>
          <span className="chip">
            速度 <b className="latin">{speedCpm(session)}</b> {unit}/分
          </span>
          <span className="chip">
            正确率 <b className="latin">{acc}%</b>
          </span>
          <span className="chip">
            <StarRow count={typed === 0 ? 3 : starsFor(acc)} />
          </span>
          <button type="button" className="btn" onMouseDown={keepFocus} onClick={onRestart} aria-label="重新开始">
            重来
          </button>
        </header>

        {(imeWarn || (paused && !session.done)) && (
          <div className="practice-banners">
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
          </div>
        )}

        <div className="practice-body">
          <div className="practice-left">
            <section className="card practice-passage" aria-label="练习内容">
              <Passage session={session} showPinyin />
            </section>
            <section className="card practice-keyboard" aria-label="键盘提示">
              <Keyboard nextKey={next} wrongKey={session.lastWrongKey} wrongTick={session.wrong} showHands />
            </section>
          </div>

          <aside className="practice-side">
            {cur && next ? (
              <div className="card now-card">
                <div className="now-label">现在按这个</div>
                <div className="row now-row">
                  <div className="now-char">{cur.char}</div>
                  {cur.tone && <div className="now-tone">{cur.tone}</div>}
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
                <h2 className="display">完成啦！</h2>
                {note && <p className="done-new">{note}</p>}
                <p>
                  速度 {speedCpm(session)} {unit}/分 · 正确率 {acc}%
                </p>
                {onNext && (
                  <button type="button" className="btn btn-primary" onClick={onNext}>
                    下一关 →
                  </button>
                )}
                <button type="button" className={onNext ? 'btn' : 'btn btn-primary'} onClick={onRestart}>
                  再来一次
                </button>
              </div>
            )}
            <div className="practice-coach">
              <WornMascot size={86} mood={session.lastWrongKey ? 'oops' : 'happy'} />
              <p className="coach-bubble" aria-live="polite">
                {coachMessage(session)}
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: 运行，确认通过**

Run: `npx vitest run src/pages/Drill.test.tsx` 和 `npx tsc --noEmit; echo "tsc exit: $?"`
Expected: PASS（5 个测试），`tsc exit: 0`

- [ ] **Step 5: 提交**

```bash
git add src/pages/Drill.tsx src/pages/Drill.test.tsx
git commit -m "feat: 指法和拼音共用的练习页"
```

---

### Task 4: 指法训练营

**Files:**
- Create: `src/drills/fingerLevels.ts`, `src/pages/FingerCamp.tsx`, `src/pages/Modes.css`
- Modify: `src/router.ts`, `src/App.tsx`
- Test: `src/drills/fingerLevels.test.ts`, `src/pages/FingerCamp.test.tsx`, `src/router.test.ts`

- [ ] **Step 1: 写失败的测试**

`src/drills/fingerLevels.test.ts`：

```ts
import { describe, expect, it } from 'vitest';
import { FINGER_LEVELS, fingerTokens } from './fingerLevels';

describe('FINGER_LEVELS', () => {
  it('一共 12 关，编号从 1 开始连续', () => {
    expect(FINGER_LEVELS.map((l) => l.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it('每关只用字母键', () => {
    for (const l of FINGER_LEVELS) expect(l.keys).toMatch(/^[a-z]+$/);
  });

  it('最后一关是全键盘', () => {
    expect(new Set(FINGER_LEVELS[11].keys).size).toBe(26);
  });
});

describe('fingerTokens', () => {
  it('15 组、每组 4 个键，组之间用点隔开', () => {
    const tokens = fingerTokens('fj', () => 0);
    expect(tokens.filter((t) => t.kind === 'hanzi')).toHaveLength(60);
    expect(tokens.filter((t) => t.kind === 'skip')).toHaveLength(14);
    expect(tokens[0]).toEqual({ kind: 'hanzi', char: 'F', key: 'f', tone: '' });
  });

  it('只出这一关的键', () => {
    const keys = new Set(fingerTokens('dk').flatMap((t) => (t.kind === 'hanzi' ? [t.key] : [])));
    for (const k of keys) expect('dk').toContain(k);
  });
});
```

`src/pages/FingerCamp.test.tsx`：

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProfileProvider } from '../storage/ProfileContext';
import { STORAGE_KEY, defaultStore, saveStore } from '../storage/profile';
import { FingerCamp, FingerLevelPage } from './FingerCamp';

const saved = () => JSON.parse(localStorage.getItem(STORAGE_KEY)!).profiles[0];
const seedLevel = (n: number) => {
  const store = defaultStore();
  store.profiles[0].fingerLevel = n;
  saveStore(localStorage, store);
};
const wrap = (ui: React.ReactNode) => render(<ProfileProvider storage={localStorage}>{ui}</ProfileProvider>);

describe('FingerCamp', () => {
  it('第 1 关开着，后面的关卡锁着', () => {
    wrap(<FingerCamp />);
    expect(screen.getByRole('button', { name: '第 1 关：F 和 J' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '第 2 关：D 和 K' })).toBeDisabled();
  });

  it('通过的关卡显示已通过，下一关解锁', () => {
    seedLevel(2);
    wrap(<FingerCamp />);
    expect(screen.getAllByText('已通过')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: '第 3 关：S 和 L' }));
    expect(window.location.hash).toBe('#/finger/3');
  });
});

describe('FingerLevelPage', () => {
  const typeAll = () => {
    for (let n = 0; n < 200; n++) {
      const next = document.querySelector('.now-letter.is-next');
      if (!next) break;
      fireEvent.keyDown(window, { key: next.textContent! });
    }
  };

  it('全对过关，解锁下一关，并记录成绩', () => {
    wrap(<FingerLevelPage level={1} />);
    typeAll();
    expect(screen.getByText('过关啦！第 2 关解锁了')).toBeInTheDocument();
    expect(saved().fingerLevel).toBe(1);
    expect(saved().stars).toBe(3);
    expect(saved().totalChars).toBe(0);
    fireEvent.click(screen.getByRole('button', { name: '下一关 →' }));
    expect(window.location.hash).toBe('#/finger/2');
  });

  it('没解锁的关卡不能直接进', () => {
    wrap(<FingerLevelPage level={5} />);
    expect(screen.getByText('这一关还没解锁')).toBeInTheDocument();
  });
});
```

`src/router.test.ts`：在「认识四种页面」测试里加：

```ts
    expect(parseHash('#/finger')).toEqual({ name: 'finger' });
    expect(parseHash('#/finger/3')).toEqual({ name: 'fingerLevel', level: 3 });
    expect(parseHash('#/pinyin')).toEqual({ name: 'pinyin' });
    expect(parseHash('#/pinyin/zhengti')).toEqual({ name: 'pinyinSet', setId: 'zhengti' });
    expect(parseHash('#/game')).toEqual({ name: 'game' });
    expect(parseHash('#/finger/abc')).toEqual({ name: 'finger' });
```

并在 `toHash` 测试的 `routes` 数组里加：`{ name: 'finger' }, { name: 'fingerLevel', level: 3 }, { name: 'pinyin' }, { name: 'pinyinSet', setId: 'zhengti' }, { name: 'game' }`。

- [ ] **Step 2: 运行，确认失败**

Run: `npx vitest run src/drills src/pages/FingerCamp.test.tsx src/router.test.ts`
Expected: FAIL

- [ ] **Step 3: 改 `src/router.ts`**

`Route` 类型末尾加：

```ts
  | { name: 'finger' }
  | { name: 'fingerLevel'; level: number }
  | { name: 'pinyin' }
  | { name: 'pinyinSet'; setId: string }
  | { name: 'game' };
```

（把原来 `| { name: 'wardrobe' };` 末尾的分号去掉，接在它后面。）

`parseHash` 里，`if (parts[0] === 'wardrobe') ...` 下面加：

```ts
  if (parts[0] === 'finger') {
    const level = Number(parts[1]);
    return parts.length === 2 && Number.isInteger(level) && level > 0 ? { name: 'fingerLevel', level } : { name: 'finger' };
  }
  if (parts[0] === 'pinyin') return parts.length === 2 ? { name: 'pinyinSet', setId: parts[1] } : { name: 'pinyin' };
  if (parts[0] === 'game') return { name: 'game' };
```

`toHash` 的 `switch` 里加：

```ts
    case 'finger':
      return '#/finger';
    case 'fingerLevel':
      return `#/finger/${route.level}`;
    case 'pinyin':
      return '#/pinyin';
    case 'pinyinSet':
      return `#/pinyin/${encodeURIComponent(route.setId)}`;
    case 'game':
      return '#/game';
```

- [ ] **Step 4: 写 `src/drills/fingerLevels.ts`**

```ts
import type { Token } from '../engine/types';

export type FingerLevel = { id: number; name: string; keys: string; tip: string };

export const FINGER_LEVELS: FingerLevel[] = [
  { id: 1, name: 'F 和 J', keys: 'fj', tip: '两根食指的家，摸摸键上的小凸点' },
  { id: 2, name: 'D 和 K', keys: 'dkfj', tip: '中指放在 D 和 K 上' },
  { id: 3, name: 'S 和 L', keys: 'slfjdk', tip: '无名指放在 S 和 L 上' },
  { id: 4, name: '小指 A', keys: 'asdfjkl', tip: '左手小指放在 A 上' },
  { id: 5, name: 'G 和 H', keys: 'ghfj', tip: '食指往中间伸一下' },
  { id: 6, name: '基准键大复习', keys: 'asdfghjkl', tip: '中间一排全部练一遍' },
  { id: 7, name: 'E 和 I', keys: 'eidk', tip: '中指往上伸' },
  { id: 8, name: 'R 和 U', keys: 'rufj', tip: '食指往上伸' },
  { id: 9, name: 'W 和 O', keys: 'wosl', tip: '无名指往上伸' },
  { id: 10, name: '上排', keys: 'qwertyuiop', tip: '整个上排，记得手指回家' },
  { id: 11, name: '下排', keys: 'zxcvbnm', tip: '手指往下伸，按完回到中间一排' },
  { id: 12, name: '全键盘', keys: 'abcdefghijklmnopqrstuvwxyz', tip: '26 个字母全部出场' },
];

/** 出一关的练习：groups 组，每组 size 个键，组之间用点隔开 */
export function fingerTokens(keys: string, rng: () => number = Math.random, groups = 15, size = 4): Token[] {
  const tokens: Token[] = [];
  for (let g = 0; g < groups; g++) {
    if (g > 0) tokens.push({ kind: 'skip', char: '·' });
    for (let i = 0; i < size; i++) {
      const k = keys[Math.floor(rng() * keys.length)];
      tokens.push({ kind: 'hanzi', char: k.toUpperCase(), key: k, tone: '' });
    }
  }
  return tokens;
}
```

- [ ] **Step 5: 写 `src/pages/Modes.css`**

```css
.modes-title { font-size: 46px; }
.modes-intro { margin: 0; font-size: 19px; line-height: 1.6; }
.level-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 18px; }
.level-card {
  display: flex; flex-direction: column; align-items: flex-start; gap: 8px; min-height: 150px; padding: 18px;
  background: #fff; border: 3px solid var(--ink); border-radius: 22px; box-shadow: 0 6px 0 var(--ink); text-align: left; cursor: pointer;
}
.level-card.is-passed { background: var(--mint-soft); }
.level-card.is-current { background: var(--sun); }
.level-card:disabled { cursor: not-allowed; background: #eef1f6; box-shadow: none; border-style: dashed; color: var(--muted); }
.level-no { font: 700 17px var(--font-latin); }
.level-name { font: 400 28px var(--font-display); }
.level-tip { font-size: 17px; line-height: 1.5; }
```

- [ ] **Step 6: 写 `src/pages/FingerCamp.tsx`**

```tsx
import { useCallback, useMemo, useState } from 'react';
import { FINGER_LEVELS, fingerTokens } from '../drills/fingerLevels';
import { navigate } from '../router';
import { FINGER_PASS_ACCURACY } from '../rewards/config';
import { grantDailyBonus } from '../rewards/dailyTasks';
import { syncRewards } from '../rewards/rewards';
import { useProfile } from '../storage/ProfileContext';
import { passFingerLevel, recordPractice, today } from '../storage/profile';
import Drill, { type DrillResult } from './Drill';
import './Modes.css';

export function FingerCamp() {
  const { profile } = useProfile();
  return (
    <main className="page">
      <div className="page-inner">
        <header className="row spread">
          <div className="row">
            <button type="button" className="btn" onClick={() => navigate({ name: 'home' })}>
              ← 回大厅
            </button>
            <h1 className="display modes-title">指法训练营</h1>
          </div>
          <span className="chip">
            已通过 {profile.fingerLevel} / {FINGER_LEVELS.length} 关
          </span>
        </header>
        <p className="modes-intro">从 F 和 J 出发，一关一关认识每根手指的「家」。正确率到 {FINGER_PASS_ACCURACY}% 就能过关，解锁下一关。</p>
        <div className="level-grid">
          {FINGER_LEVELS.map((l) => {
            const passed = l.id <= profile.fingerLevel;
            const open = l.id <= profile.fingerLevel + 1;
            const cls = ['level-card', passed ? 'is-passed' : '', open && !passed ? 'is-current' : ''].filter(Boolean).join(' ');
            return (
              <button
                key={l.id}
                type="button"
                className={cls}
                disabled={!open}
                aria-label={`第 ${l.id} 关：${l.name}`}
                onClick={() => navigate({ name: 'fingerLevel', level: l.id })}
              >
                <span className="level-no">第 {l.id} 关</span>
                <span className="level-name">{l.name}</span>
                <span className="level-tip">{l.tip}</span>
                <span className="tag">{passed ? '已通过' : open ? '开始' : '未解锁'}</span>
              </button>
            );
          })}
        </div>
      </div>
    </main>
  );
}

export function FingerLevelPage({ level: id }: { level: number }) {
  const { profile, update } = useProfile();
  const level = FINGER_LEVELS.find((l) => l.id === id);
  const [round, setRound] = useState(0);
  const [note, setNote] = useState('');
  const [passed, setPassed] = useState(false);
  const tokens = useMemo(() => (level ? fingerTokens(level.keys) : []), [level, round]);

  const onFinish = useCallback(
    (r: DrillResult) => {
      if (!level) return;
      const date = today();
      const ok = r.accuracy >= FINGER_PASS_ACCURACY;
      update((p) => {
        let next = recordPractice(p, { chars: 0, stars: r.stars, activeMs: r.activeMs }, date);
        if (ok) next = passFingerLevel(next, level.id);
        return grantDailyBonus(syncRewards(next, undefined, date).profile, date);
      });
      setPassed(ok);
      setNote(
        ok
          ? level.id < FINGER_LEVELS.length
            ? `过关啦！第 ${level.id + 1} 关解锁了`
            : '全部 12 关通过，指法毕业！'
          : `正确率要到 ${FINGER_PASS_ACCURACY}% 才能过关，再试一次吧`,
      );
    },
    [level, update],
  );

  if (!level || id > profile.fingerLevel + 1) {
    return (
      <main className="page">
        <div className="page-inner">
          <div className="card">
            <h1 className="display">这一关还没解锁</h1>
            <p>先把前面的关卡过了吧！</p>
            <button type="button" className="btn btn-primary" onClick={() => navigate({ name: 'finger' })}>
              回训练营
            </button>
          </div>
        </div>
      </main>
    );
  }

  const hasNext = passed && level.id < FINGER_LEVELS.length;
  return (
    <Drill
      key={`${level.id}-${round}`}
      title={`第 ${level.id} 关 · ${level.name}`}
      tokens={tokens}
      unit="键"
      back={{ label: '← 训练营', route: { name: 'finger' } }}
      onFinish={onFinish}
      onRestart={() => {
        setNote('');
        setPassed(false);
        setRound((n) => n + 1);
      }}
      onNext={
        hasNext
          ? () => {
              setNote('');
              setPassed(false);
              navigate({ name: 'fingerLevel', level: level.id + 1 });
            }
          : undefined
      }
      note={note}
    />
  );
}
```

- [ ] **Step 7: 改 `src/App.tsx`**

加 import：`import { FingerCamp, FingerLevelPage } from './pages/FingerCamp';`。路由分发里加：

```tsx
      {route.name === 'finger' && <FingerCamp />}
      {route.name === 'fingerLevel' && <FingerLevelPage key={route.level} level={route.level} />}
```

- [ ] **Step 8: 运行，确认通过**

Run: `npm test` 和 `npx tsc --noEmit; echo "tsc exit: $?"`
Expected: 全部 PASS，`tsc exit: 0`

- [ ] **Step 9: 提交**

```bash
git add src/drills src/pages/FingerCamp.tsx src/pages/FingerCamp.test.tsx src/pages/Modes.css src/router.ts src/router.test.ts src/App.tsx
git commit -m "feat: 指法训练营 12 关"
```

---

### Task 5: 拼音快打

**Files:**
- Create: `src/drills/pinyinSets.ts`, `src/pages/PinyinDrill.tsx`
- Modify: `src/App.tsx`
- Test: `src/drills/pinyinSets.test.ts`, `src/pages/PinyinDrill.test.tsx`

- [ ] **Step 1: 写失败的测试**

`src/drills/pinyinSets.test.ts`：

```ts
import { describe, expect, it } from 'vitest';
import { PINYIN_SETS, pinyinTokens } from './pinyinSets';

describe('PINYIN_SETS', () => {
  it('四组：声母、韵母、整体认读、易混音', () => {
    expect(PINYIN_SETS.map((s) => s.id)).toEqual(['shengmu', 'yunmu', 'zhengti', 'yihun']);
  });

  it('每个字都是一个汉字，拼音能转成 a–z 的按键', () => {
    for (const s of PINYIN_SETS) {
      for (const [char, tone] of s.items) {
        expect([...char]).toHaveLength(1);
        expect(tone).toMatch(/^[a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]+$/);
      }
    }
  });
});

describe('pinyinTokens', () => {
  it('每个字变成一个要打的字，顺序打乱但一个不少', () => {
    const set = PINYIN_SETS[2];
    const tokens = pinyinTokens(set, () => 0.5);
    expect(tokens).toHaveLength(set.items.length);
    expect(tokens.map((t) => t.char).sort()).toEqual(set.items.map(([c]) => c).sort());
    expect(tokens.find((t) => t.char === '知')).toEqual({ kind: 'hanzi', char: '知', key: 'zhi', tone: 'zhī' });
  });

  it('ü 打成 v', () => {
    const tokens = pinyinTokens(PINYIN_SETS[3]);
    expect(tokens.find((t) => t.char === '女')).toMatchObject({ key: 'nv' });
  });
});
```

`src/pages/PinyinDrill.test.tsx`：

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PINYIN_SETS } from '../drills/pinyinSets';
import { ProfileProvider } from '../storage/ProfileContext';
import { STORAGE_KEY } from '../storage/profile';
import { PinyinHome, PinyinSetPage } from './PinyinDrill';

const wrap = (ui: React.ReactNode) => render(<ProfileProvider storage={localStorage}>{ui}</ProfileProvider>);

describe('PinyinHome', () => {
  it('列出四组，点进去开始练', () => {
    wrap(<PinyinHome />);
    fireEvent.click(screen.getByRole('button', { name: '整体认读：开始练' }));
    expect(window.location.hash).toBe('#/pinyin/zhengti');
  });
});

describe('PinyinSetPage', () => {
  it('打完一组，字数算进打字量', () => {
    wrap(<PinyinSetPage setId="zhengti" />);
    for (let n = 0; n < 300; n++) {
      const next = document.querySelector('.now-letter.is-next');
      if (!next) break;
      fireEvent.keyDown(window, { key: next.textContent! });
    }
    expect(screen.getByText('完成啦！')).toBeInTheDocument();
    const count = PINYIN_SETS.find((s) => s.id === 'zhengti')!.items.length;
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).profiles[0].totalChars).toBe(count);
  });

  it('不存在的组给出返回按钮', () => {
    wrap(<PinyinSetPage setId="nope" />);
    expect(screen.getByText('找不到这一组')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `npx vitest run src/drills/pinyinSets.test.ts src/pages/PinyinDrill.test.tsx`
Expected: FAIL

- [ ] **Step 3: 写 `src/drills/pinyinSets.ts`**

```ts
import { toKey } from '../content/pinyinKey';
import type { Token } from '../engine/types';

export type PinyinSet = { id: string; name: string; desc: string; items: [string, string][] };

export const PINYIN_SETS: PinyinSet[] = [
  {
    id: 'shengmu',
    name: '声母',
    desc: 'b p m f 到 y w，23 个声母的代表字',
    items: [
      ['玻', 'bō'], ['坡', 'pō'], ['摸', 'mō'], ['佛', 'fó'], ['得', 'dé'], ['特', 'tè'], ['讷', 'nè'], ['勒', 'lè'],
      ['哥', 'gē'], ['科', 'kē'], ['喝', 'hē'], ['鸡', 'jī'], ['七', 'qī'], ['西', 'xī'], ['知', 'zhī'], ['吃', 'chī'],
      ['诗', 'shī'], ['日', 'rì'], ['资', 'zī'], ['雌', 'cí'], ['思', 'sī'], ['衣', 'yī'], ['乌', 'wū'],
    ],
  },
  {
    id: 'yunmu',
    name: '韵母',
    desc: 'ai ao ou an en ang……带韵母的常用字',
    items: [
      ['爱', 'ài'], ['奥', 'ào'], ['欧', 'ōu'], ['安', 'ān'], ['恩', 'ēn'], ['昂', 'áng'],
      ['鹅', 'é'], ['耳', 'ěr'], ['翁', 'wēng'], ['雪', 'xuě'], ['学', 'xué'], ['绿', 'lǜ'],
    ],
  },
  {
    id: 'zhengti',
    name: '整体认读',
    desc: 'zhi chi shi ri zi ci si yi wu yu……16 个整体认读音节',
    items: [
      ['知', 'zhī'], ['吃', 'chī'], ['诗', 'shī'], ['日', 'rì'], ['字', 'zì'], ['刺', 'cì'], ['四', 'sì'], ['衣', 'yī'],
      ['屋', 'wū'], ['鱼', 'yú'], ['叶', 'yè'], ['月', 'yuè'], ['圆', 'yuán'], ['音', 'yīn'], ['云', 'yún'], ['鹰', 'yīng'],
    ],
  },
  {
    id: 'yihun',
    name: '易混音',
    desc: 'zh 和 z、ch 和 c、sh 和 s、n 和 l、ü 和 u',
    items: [
      ['猪', 'zhū'], ['租', 'zū'], ['出', 'chū'], ['粗', 'cū'], ['书', 'shū'], ['苏', 'sū'], ['南', 'nán'],
      ['蓝', 'lán'], ['牛', 'niú'], ['六', 'liù'], ['女', 'nǚ'], ['怒', 'nù'], ['绿', 'lǜ'], ['路', 'lù'],
    ],
  },
];

/** 把一组字打乱顺序，变成要打的字 */
export function pinyinTokens(set: PinyinSet, rng: () => number = Math.random): Token[] {
  const items = [...set.items];
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items.map(([char, tone]) => ({ kind: 'hanzi', char, key: toKey(tone), tone }));
}
```

- [ ] **Step 4: 写 `src/pages/PinyinDrill.tsx`**

```tsx
import { useCallback, useMemo, useState } from 'react';
import { PINYIN_SETS, pinyinTokens } from '../drills/pinyinSets';
import { navigate } from '../router';
import { grantDailyBonus } from '../rewards/dailyTasks';
import { syncRewards } from '../rewards/rewards';
import { useProfile } from '../storage/ProfileContext';
import { recordPractice, today } from '../storage/profile';
import Drill, { type DrillResult } from './Drill';
import './Modes.css';

export function PinyinHome() {
  return (
    <main className="page">
      <div className="page-inner">
        <header className="row">
          <button type="button" className="btn" onClick={() => navigate({ name: 'home' })}>
            ← 回大厅
          </button>
          <h1 className="display modes-title">拼音快打</h1>
        </header>
        <p className="modes-intro">看字打拼音，不用打声调，ü 用 V 键。打出的每个字都算进打字量。</p>
        <div className="level-grid">
          {PINYIN_SETS.map((s) => (
            <button
              key={s.id}
              type="button"
              className="level-card is-current"
              aria-label={`${s.name}：开始练`}
              onClick={() => navigate({ name: 'pinyinSet', setId: s.id })}
            >
              <span className="level-name">{s.name}</span>
              <span className="level-tip">{s.desc}</span>
              <span className="tag">{s.items.length} 个字</span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}

export function PinyinSetPage({ setId }: { setId: string }) {
  const { update } = useProfile();
  const set = PINYIN_SETS.find((s) => s.id === setId);
  const [round, setRound] = useState(0);
  const [note, setNote] = useState('');
  const tokens = useMemo(() => (set ? pinyinTokens(set) : []), [set, round]);

  const onFinish = useCallback(
    (r: DrillResult) => {
      const date = today();
      update((p) => grantDailyBonus(syncRewards(recordPractice(p, { chars: r.count, stars: r.stars, activeMs: r.activeMs }, date), undefined, date).profile, date));
      setNote(`打了 ${r.count} 个字，都算进打字量了`);
    },
    [update],
  );

  if (!set) {
    return (
      <main className="page">
        <div className="page-inner">
          <div className="card">
            <h1 className="display">找不到这一组</h1>
            <button type="button" className="btn btn-primary" onClick={() => navigate({ name: 'pinyin' })}>
              回拼音快打
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <Drill
      key={round}
      title={`拼音快打 · ${set.name}`}
      tokens={tokens}
      unit="字"
      back={{ label: '← 拼音快打', route: { name: 'pinyin' } }}
      onFinish={onFinish}
      onRestart={() => {
        setNote('');
        setRound((n) => n + 1);
      }}
      note={note}
    />
  );
}
```

- [ ] **Step 5: 改 `src/App.tsx`**

加 import：`import { PinyinHome, PinyinSetPage } from './pages/PinyinDrill';`。路由分发里加：

```tsx
      {route.name === 'pinyin' && <PinyinHome />}
      {route.name === 'pinyinSet' && <PinyinSetPage key={route.setId} setId={route.setId} />}
```

- [ ] **Step 6: 运行，确认通过**

Run: `npm test` 和 `npx tsc --noEmit; echo "tsc exit: $?"`
Expected: 全部 PASS，`tsc exit: 0`

- [ ] **Step 7: 提交**

```bash
git add src/drills/pinyinSets.ts src/drills/pinyinSets.test.ts src/pages/PinyinDrill.tsx src/pages/PinyinDrill.test.tsx src/App.tsx
git commit -m "feat: 拼音快打（声母、韵母、整体认读、易混音）"
```

---

### Task 6: 龙宫泡泡的游戏规则

**Files:**
- Create: `src/game/bubbles.ts`
- Test: `src/game/bubbles.test.ts`

- [ ] **Step 1: 写失败的测试 `src/game/bubbles.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { type GameState, GOAL, LIVES, MAX_BUBBLES, SPAWN_MS, WORDS, gameStars, newGame, riseMs, targetIds, tick, typeKey } from './bubbles';

const zero = () => 0;
const withBubble = (over: Partial<GameState> = {}): GameState => ({
  ...newGame(),
  bubbles: [{ id: 1, word: WORDS[0], lane: 0, y: 0.5 }],
  nextId: 2,
  spawnIn: 99999,
  ...over,
});

describe('WORDS', () => {
  it('按键都是 a–z，而且不重复', () => {
    for (const w of WORDS) expect(w.key).toMatch(/^[a-z]+$/);
    expect(new Set(WORDS.map((w) => w.key)).size).toBe(WORDS.length);
  });

  it('第一个词是悟空', () => {
    expect(WORDS[0]).toEqual({ text: '悟空', tone: 'wù kōng', key: 'wukong' });
  });
});

describe('tick', () => {
  it('开局马上出第一个泡泡', () => {
    const s = tick(newGame(), 50, zero);
    expect(s.bubbles).toHaveLength(1);
    expect(s.bubbles[0].word).toBe(WORDS[0]);
    expect(s.spawnIn).toBe(SPAWN_MS);
  });

  it('泡泡往上升，升到顶就跑掉，扣一条命', () => {
    const s = tick(withBubble(), riseMs(0) * 0.6, zero);
    expect(s.bubbles.find((b) => b.id === 1)).toBeUndefined();
    expect(s.lives).toBe(LIVES - 1);
    expect(s.combo).toBe(0);
  });

  it('命用完就输了', () => {
    const s = tick(withBubble({ lives: 1 }), riseMs(0), zero);
    expect(s.status).toBe('lost');
  });

  it('同时最多 5 个泡泡', () => {
    let s = newGame();
    for (let n = 0; n < 20; n++) s = tick(s, SPAWN_MS, () => 0.99);
    expect(s.bubbles.length).toBeLessThanOrEqual(MAX_BUBBLES);
  });

  it('戳破得越多，泡泡升得越快', () => {
    expect(riseMs(10)).toBeLessThan(riseMs(0));
  });
});

describe('typeKey', () => {
  it('打对开头的字母，记下来并标出目标泡泡', () => {
    const s = typeKey(withBubble(), 'w');
    expect(s.typed).toBe('w');
    expect([...targetIds(s)]).toEqual([1]);
  });

  it('打完整个拼音就戳破泡泡，加分、连击、记字数', () => {
    let s = withBubble();
    for (const k of 'wukong') s = typeKey(s, k);
    expect(s.bubbles).toHaveLength(0);
    expect(s.popped).toBe(1);
    expect(s.poppedHanzi).toBe(2);
    expect(s.score).toBe(20);
    expect(s.combo).toBe(1);
    expect(s.typed).toBe('');
  });

  it('打错了清空，连击归零', () => {
    const s = typeKey(withBubble({ typed: 'w', combo: 3 }), 'x');
    expect(s.typed).toBe('');
    expect(s.combo).toBe(0);
    expect(s.wrong).toBe(1);
  });

  it('戳破第 20 个就赢了', () => {
    let s = withBubble({ popped: GOAL - 1 });
    for (const k of 'wukong') s = typeKey(s, k);
    expect(s.status).toBe('won');
    expect(gameStars(s)).toBe(3);
  });

  it('不是字母、或者游戏结束后都不管', () => {
    const s = withBubble();
    expect(typeKey(s, '1')).toBe(s);
    const over = { ...s, status: 'lost' as const };
    expect(typeKey(over, 'w')).toBe(over);
  });
});

describe('gameStars', () => {
  it('赢了 3 星，戳破一半 2 星，其余 1 星', () => {
    expect(gameStars({ ...newGame(), status: 'lost', popped: GOAL / 2 })).toBe(2);
    expect(gameStars({ ...newGame(), status: 'lost', popped: 1 })).toBe(1);
  });
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `npx vitest run src/game/bubbles.test.ts`
Expected: FAIL，提示找不到 `./bubbles`

- [ ] **Step 3: 写 `src/game/bubbles.ts`**

```ts
import { toKey } from '../content/pinyinKey';

export type Word = { text: string; tone: string; key: string };

const word = (text: string, tone: string): Word => ({ text, tone, key: toKey(tone.replace(/ /g, '')) });

/** 泡泡里的词，都来自《西游记》 */
export const WORDS: Word[] = [
  word('悟空', 'wù kōng'),
  word('金箍棒', 'jīn gū bàng'),
  word('筋斗云', 'jīn dǒu yún'),
  word('花果山', 'huā guǒ shān'),
  word('水帘洞', 'shuǐ lián dòng'),
  word('龙宫', 'lóng gōng'),
  word('定海神针', 'dìng hǎi shén zhēn'),
  word('猴王', 'hóu wáng'),
  word('石猴', 'shí hóu'),
  word('仙石', 'xiān shí'),
  word('东海', 'dōng hǎi'),
  word('龙王', 'lóng wáng'),
  word('唐僧', 'táng sēng'),
  word('八戒', 'bā jiè'),
  word('沙僧', 'shā sēng'),
  word('白龙马', 'bái lóng mǎ'),
  word('西天', 'xī tiān'),
  word('取经', 'qǔ jīng'),
  word('妖怪', 'yāo guài'),
  word('宝贝', 'bǎo bèi'),
];

export const GOAL = 20;
export const LIVES = 3;
export const RISE_MS = 15000;
export const SPAWN_MS = 2600;
export const MAX_BUBBLES = 5;
export const TICK_MS = 50;
/** 泡泡出现的 5 条竖道，0 最左、4 最右 */
export const LANES = 5;

export type Bubble = { id: number; word: Word; lane: number; y: number };

export type GameState = {
  bubbles: Bubble[];
  nextId: number;
  spawnIn: number;
  typed: string;
  score: number;
  combo: number;
  popped: number;
  poppedHanzi: number;
  lives: number;
  right: number;
  wrong: number;
  elapsed: number;
  status: 'playing' | 'won' | 'lost';
};

export function newGame(): GameState {
  return { bubbles: [], nextId: 1, spawnIn: 0, typed: '', score: 0, combo: 0, popped: 0, poppedHanzi: 0, lives: LIVES, right: 0, wrong: 0, elapsed: 0, status: 'playing' };
}

/** 泡泡从底升到顶要多久；戳破越多越快，最快是原来的 55% */
export function riseMs(popped: number): number {
  return RISE_MS * Math.max(0.55, 1 - popped * 0.02);
}

export function tick(s: GameState, dt: number, rng: () => number = Math.random): GameState {
  if (s.status !== 'playing') return s;
  const step = dt / riseMs(s.popped);
  let lives = s.lives;
  let combo = s.combo;
  const bubbles: Bubble[] = [];
  for (const b of s.bubbles) {
    const y = b.y + step;
    if (y >= 1) {
      lives -= 1;
      combo = 0;
    } else {
      bubbles.push({ ...b, y });
    }
  }
  const typed = s.typed && bubbles.some((b) => b.word.key.startsWith(s.typed)) ? s.typed : '';

  let { nextId } = s;
  let spawnIn = s.spawnIn - dt;
  if (spawnIn <= 0 && bubbles.length < MAX_BUBBLES) {
    const pool = WORDS.filter((w) => !bubbles.some((b) => b.word.key === w.key));
    const lanes = Array.from({ length: LANES }, (_, i) => i).filter((i) => !bubbles.some((b) => b.lane === i && b.y < 0.35));
    if (pool.length > 0 && lanes.length > 0) {
      bubbles.push({ id: nextId, word: pool[Math.floor(rng() * pool.length)], lane: lanes[Math.floor(rng() * lanes.length)], y: 0 });
      nextId += 1;
      spawnIn = SPAWN_MS;
    }
  }

  return { ...s, bubbles, nextId, spawnIn, lives, combo, typed, elapsed: s.elapsed + dt, status: lives <= 0 ? 'lost' : 'playing' };
}

export function typeKey(s: GameState, rawKey: string): GameState {
  if (s.status !== 'playing' || !/^[A-Za-z]$/.test(rawKey)) return s;
  const typed = s.typed + rawKey.toLowerCase();
  const matches = s.bubbles.filter((b) => b.word.key.startsWith(typed));
  if (matches.length === 0) return { ...s, typed: '', combo: 0, wrong: s.wrong + 1 };
  const done = matches.find((b) => b.word.key === typed);
  if (!done) return { ...s, typed, right: s.right + 1 };
  const popped = s.popped + 1;
  return {
    ...s,
    typed: '',
    right: s.right + 1,
    bubbles: s.bubbles.filter((b) => b.id !== done.id),
    score: s.score + done.word.text.length * 10 + s.combo * 5,
    combo: s.combo + 1,
    popped,
    poppedHanzi: s.poppedHanzi + done.word.text.length,
    status: popped >= GOAL ? 'won' : 'playing',
  };
}

/** 正在打的拼音对得上哪些泡泡 */
export function targetIds(s: GameState): Set<number> {
  if (!s.typed) return new Set();
  return new Set(s.bubbles.filter((b) => b.word.key.startsWith(s.typed)).map((b) => b.id));
}

export function gameStars(s: GameState): 1 | 2 | 3 {
  if (s.status === 'won') return 3;
  return s.popped >= GOAL / 2 ? 2 : 1;
}
```

- [ ] **Step 4: 运行，确认通过**

Run: `npx vitest run src/game/bubbles.test.ts` 和 `npx tsc --noEmit; echo "tsc exit: $?"`
Expected: PASS（15 个测试），`tsc exit: 0`

- [ ] **Step 5: 提交**

```bash
git add src/game
git commit -m "feat: 龙宫泡泡的游戏规则"
```

---

### Task 7: 龙宫泡泡页面

**Files:**
- Create: `src/pages/Game.tsx`, `src/pages/Game.css`
- Modify: `src/App.tsx`
- Test: `src/pages/Game.test.tsx`

- [ ] **Step 1: 写失败的测试 `src/pages/Game.test.tsx`**

```tsx
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfileProvider } from '../storage/ProfileContext';
import { STORAGE_KEY } from '../storage/profile';
import Game from './Game';

const saved = () => JSON.parse(localStorage.getItem(STORAGE_KEY)!).profiles[0];

function renderGame() {
  return render(
    <ProfileProvider storage={localStorage}>
      <Game />
    </ProfileProvider>,
  );
}

describe('Game', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('开始前显示玩法，点开始后出现泡泡', () => {
    renderGame();
    expect(screen.getByRole('heading', { name: '龙宫泡泡' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '开始游戏' }));
    act(() => {
      vi.advanceTimersByTime(60);
    });
    expect(screen.getByText('悟空')).toBeInTheDocument();
  });

  it('打出拼音戳破泡泡，加分', () => {
    renderGame();
    fireEvent.click(screen.getByRole('button', { name: '开始游戏' }));
    act(() => {
      vi.advanceTimersByTime(60);
    });
    for (const k of 'wukong') fireEvent.keyDown(window, { key: k });
    expect(screen.queryByText('悟空')).not.toBeInTheDocument();
    expect(screen.getByTestId('game-score')).toHaveTextContent('20');
  });

  it('泡泡都跑掉了就结束，记下成绩', () => {
    renderGame();
    fireEvent.click(screen.getByRole('button', { name: '开始游戏' }));
    act(() => {
      vi.advanceTimersByTime(30000);
    });
    expect(screen.getByText('泡泡跑掉啦')).toBeInTheDocument();
    expect(saved().stars).toBe(1);
    fireEvent.click(screen.getByRole('button', { name: '再玩一次' }));
    expect(screen.queryByText('泡泡跑掉啦')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `npx vitest run src/pages/Game.test.tsx`
Expected: FAIL，提示找不到 `./Game`

- [ ] **Step 3: 写 `src/pages/Game.css`**

```css
.game-title { font-size: 46px; }
.game-main { display: flex; flex-wrap: wrap; gap: 24px; align-items: stretch; }
.game-stage {
  position: relative; flex: 999 1 640px; min-width: 0; height: min(560px, calc(100vh - 160px)); min-height: 420px; overflow: hidden;
  background: #1b3a6b; border: 3px solid var(--ink); border-radius: 32px; box-shadow: 0 8px 0 var(--ink);
}
.game-hint { position: absolute; left: 20px; top: 16px; color: #fff; font-weight: 700; font-size: 17px; }
.bubble {
  position: absolute; width: 130px; height: 130px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
  background: #e6f4ff; border: 3px solid var(--ink); border-radius: 999px; transition: bottom 50ms linear;
}
.bubble b { font-size: 26px; }
.bubble-py { font: 400 17px var(--font-pinyin); color: var(--muted); }
.bubble.is-target { background: var(--sun); border-width: 5px; }
.game-typed {
  position: absolute; left: 50%; bottom: 16px; transform: translateX(-50%); min-width: 240px; padding: 10px 18px; text-align: center;
  background: #fff; border: 3px solid var(--ink); border-radius: 20px; font: 700 26px var(--font-latin);
}
.game-side { flex: 1 1 300px; min-width: 0; display: flex; flex-direction: column; gap: 16px; }
.game-side .card { display: flex; flex-direction: column; gap: 10px; }
.game-hearts { font-size: 28px; color: #e8483b; letter-spacing: 4px; }
.game-start, .game-over { max-width: 640px; margin: 0 auto; display: flex; flex-direction: column; align-items: center; gap: 16px; text-align: center; }
.game-start p, .game-over p { margin: 0; font-size: 19px; line-height: 1.6; }
.game-over .btn, .game-start .btn { min-width: 240px; }
```

- [ ] **Step 4: 写 `src/pages/Game.tsx`**

```tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { GOAL, LANES, TICK_MS, type GameState, gameStars, newGame, targetIds, tick, typeKey } from '../game/bubbles';
import { useTypingInput } from '../hooks/useTypingInput';
import { navigate } from '../router';
import { grantDailyBonus } from '../rewards/dailyTasks';
import { syncRewards } from '../rewards/rewards';
import { useProfile } from '../storage/ProfileContext';
import { recordGameScore, recordPractice, today } from '../storage/profile';
import ProgressBar from '../ui/ProgressBar';
import StarRow from '../ui/StarRow';
import WornMascot from '../ui/WornMascot';
import './Game.css';

export default function Game() {
  const { profile, update } = useProfile();
  const [game, setGame] = useState<GameState | null>(null);
  const [paused, setPaused] = useState(false);
  const [imeWarn, setImeWarn] = useState(false);
  const saved = useRef(false);
  const playing = game?.status === 'playing';

  useEffect(() => {
    if (!playing || paused) return;
    const t = window.setInterval(() => setGame((g) => (g ? tick(g, TICK_MS) : g)), TICK_MS);
    return () => window.clearInterval(t);
  }, [playing, paused]);

  const onLetter = useCallback((key: string) => {
    setPaused(false);
    setImeWarn(false);
    setGame((g) => (g ? typeKey(g, key) : g));
  }, []);
  const onIme = useCallback(() => setImeWarn(true), []);
  const onPause = useCallback(() => setPaused(true), []);
  useTypingInput(playing, { onLetter, onIme, onPause });

  useEffect(() => {
    if (!game || game.status === 'playing' || saved.current) return;
    saved.current = true;
    const date = today();
    const stars = gameStars(game);
    update((p) => {
      const next = recordGameScore(recordPractice(p, { chars: game.poppedHanzi, stars, activeMs: game.elapsed }, date), game.score);
      return grantDailyBonus(syncRewards(next, undefined, date).profile, date);
    });
  }, [game, update]);

  const start = () => {
    saved.current = false;
    setPaused(false);
    setImeWarn(false);
    setGame(newGame());
  };

  const header = (
    <header className="row spread">
      <div className="row">
        <button type="button" className="btn" onClick={() => navigate({ name: 'home' })}>
          ← 回大厅
        </button>
        <h1 className="display game-title">龙宫泡泡</h1>
      </div>
      <span className="chip">
        最高分 <b className="latin">{profile.gameBest}</b>
      </span>
    </header>
  );

  if (!game) {
    return (
      <main className="page">
        <div className="page-inner">
          {header}
          <section className="card game-start">
            <WornMascot size={150} label="键宝" />
            <p>《西游记》里的词语装在泡泡里，从海底往上升。打出它的拼音（不用打声调）就能戳破它！</p>
            <p>戳破 {GOAL} 个就闯关成功；有 3 个泡泡跑到顶上，游戏就结束。</p>
            <p>开始前，记得把输入法切换成英文。</p>
            <button type="button" className="btn btn-primary" onClick={start}>
              开始游戏
            </button>
          </section>
        </div>
      </main>
    );
  }

  if (game.status !== 'playing') {
    const won = game.status === 'won';
    return (
      <main className="page">
        <div className="page-inner">
          {header}
          <section className="card game-over">
            <WornMascot size={150} mood={won ? 'cheer' : 'happy'} label="键宝" />
            <h2 className="display">{won ? '闯关成功！' : '泡泡跑掉啦'}</h2>
            <StarRow count={gameStars(game)} size={56} />
            <p>
              得分 {game.score} · 戳破 {game.popped} 个泡泡 · 打了 {game.poppedHanzi} 个字
            </p>
            <button type="button" className="btn btn-primary" onClick={start}>
              再玩一次
            </button>
            <button type="button" className="btn" onClick={() => navigate({ name: 'home' })}>
              回大厅
            </button>
          </section>
        </div>
      </main>
    );
  }

  const targets = targetIds(game);
  return (
    <main className="page">
      <div className="page-inner">
        {header}
        {imeWarn && (
          <div role="alert" className="banner">
            好像开着中文输入法～按一下 Shift 切换成英文，再接着打。
          </div>
        )}
        {paused && (
          <div role="status" className="banner banner-soft">
            暂停了～按任意字母继续。
          </div>
        )}
        <div className="game-main">
          <section className="game-stage" aria-label="游戏画面">
            <div className="game-hint">打出拼音，戳破泡泡！</div>
            {game.bubbles.map((b) => (
              <div
                key={b.id}
                className={targets.has(b.id) ? 'bubble is-target' : 'bubble'}
                style={{ left: `calc(${b.lane / (LANES - 1)} * (100% - 130px))`, bottom: `calc(${b.y} * (100% - 130px))` }}
              >
                <b>{b.word.text}</b>
                <span className="bubble-py">{b.word.tone}</span>
              </div>
            ))}
            <div className="game-typed" aria-live="polite">
              {game.typed || '　'}
            </div>
          </section>
          <aside className="game-side">
            <div className="card">
              <b>
                得分 <span className="latin" data-testid="game-score">{game.score}</span>
              </b>
              <span>连击 ×{game.combo}</span>
              <span className="game-hearts" role="img" aria-label={`还剩 ${game.lives} 条命`}>
                {'♥'.repeat(game.lives)}
                {'♡'.repeat(Math.max(0, 3 - game.lives))}
              </span>
            </div>
            <div className="card">
              <b>
                目标：戳破 {GOAL} 个（{game.popped} / {GOAL}）
              </b>
              <ProgressBar value={(game.popped * 100) / GOAL} label="戳破的泡泡" />
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 5: 改 `src/App.tsx`**

加 import：`import Game from './pages/Game';`。路由分发里加 `{route.name === 'game' && <Game />}`。

- [ ] **Step 6: 运行，确认通过**

Run: `npm test` 和 `npx tsc --noEmit; echo "tsc exit: $?"`
Expected: 全部 PASS，`tsc exit: 0`

- [ ] **Step 7: 提交**

```bash
git add src/pages/Game.tsx src/pages/Game.css src/pages/Game.test.tsx src/App.tsx
git commit -m "feat: 龙宫泡泡游戏页"
```

---

### Task 8: 首页三个模式能进了

**Files:**
- Modify: `src/pages/Home.tsx`
- Test: `src/pages/Home.test.tsx`

- [ ] **Step 1: 写失败的测试**

把 `src/pages/Home.test.tsx` 里的测试「读书岛入口可以点，其他三个模式即将开放」整个换成：

```tsx
  it('四个模式都能进', () => {
    renderHome();
    fireEvent.click(screen.getByRole('button', { name: '读书岛：去选书' }));
    expect(window.location.hash).toBe('#/books');
    fireEvent.click(screen.getByRole('button', { name: '指法训练营：出发' }));
    expect(window.location.hash).toBe('#/finger');
    fireEvent.click(screen.getByRole('button', { name: '拼音快打：出发' }));
    expect(window.location.hash).toBe('#/pinyin');
    fireEvent.click(screen.getByRole('button', { name: '游戏乐园：去玩' }));
    expect(window.location.hash).toBe('#/game');
  });

  it('指法卡片显示练到第几关', () => {
    const store = defaultStore();
    store.profiles[0].fingerLevel = 2;
    saveStore(localStorage, store);
    renderHome();
    expect(screen.getByText('第 3 / 12 关')).toBeInTheDocument();
  });
```

- [ ] **Step 2: 运行，确认失败**

Run: `npx vitest run src/pages/Home.test.tsx`
Expected: FAIL

- [ ] **Step 3: 改 `src/pages/Home.tsx`**

1. 加 import：`import { FINGER_LEVEL_COUNT } from '../rewards/config';`（如果已经有 config 的 import，就并到同一行）。
2. 把三个 `<ModeSoon ... />` 换成：

```tsx
            <ModeCard
              title="指法训练营"
              desc="从 F 和 J 出发，认识每根手指的「家」"
              tint="var(--blue-soft)"
              tag={`第 ${Math.min(profile.fingerLevel + 1, FINGER_LEVEL_COUNT)} / ${FINGER_LEVEL_COUNT} 关`}
              go="出发"
              onClick={() => navigate({ name: 'finger' })}
            />
            <ModeCard
              title="拼音快打"
              desc="声母、韵母、整体认读，zh / ch / sh 专项练"
              tint="var(--mint-soft)"
              tag="4 组"
              go="出发"
              onClick={() => navigate({ name: 'pinyin' })}
            />
            <ModeCard
              title="游戏乐园"
              desc="龙宫泡泡：打拼音戳破《西游记》词语泡泡"
              tint="var(--lav)"
              tag={`最高分 ${profile.gameBest}`}
              go="去玩"
              onClick={() => navigate({ name: 'game' })}
            />
```

3. 把文件末尾的 `ModeSoon` 函数整个换成：

```tsx
type ModeCardProps = { title: string; desc: string; tint: string; tag: string; go: string; onClick: () => void };

function ModeCard({ title, desc, tint, tag, go, onClick }: ModeCardProps) {
  return (
    <button type="button" className="mode-card" style={{ background: tint }} aria-label={`${title}：${go}`} onClick={onClick}>
      <span className="tag">{tag}</span>
      <span className="display mode-title">{title}</span>
      <span className="mode-desc">{desc}</span>
      <span className="mode-go">{go} →</span>
    </button>
  );
}
```

- [ ] **Step 4: 运行，确认通过**

Run: `npm test` 和 `npx tsc --noEmit; echo "tsc exit: $?"`
Expected: 全部 PASS，`tsc exit: 0`

- [ ] **Step 5: 提交**

```bash
git add src/pages/Home.tsx src/pages/Home.test.tsx
git commit -m "feat: 首页四个模式都能进"
```

---

### Task 9: 构建和浏览器验收

- [ ] `npm run build` 退出码 0。
- [ ] 指法训练营：第 1 关能打，键盘上的手指提示跟着走；过关后第 2 关解锁；没解锁的关卡点不了。
- [ ] 拼音快打：四组都能进，拼音显示正确（Andika 字体），打完字数算进打字量。
- [ ] 龙宫泡泡：泡泡平滑上升，打拼音能戳破，打错清空，3 个跑掉就结束，最高分记得住。
- [ ] 1366×650 下指法和拼音页能放进一屏；手机宽度没有横向滚动条。

---

## 完成标准

- `npm test`、`npm run build` 通过。
- 首页四个模式都能玩，成绩、星星、打字量、奖励和今日任务都正确记录。
