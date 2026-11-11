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
  if (s.done || !/^[A-Za-z]$/.test(rawKey)) return { session: s, result: 'ignored' };
  const key = rawKey.toLowerCase();

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
