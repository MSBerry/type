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
