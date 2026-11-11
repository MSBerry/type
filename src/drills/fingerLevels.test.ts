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
