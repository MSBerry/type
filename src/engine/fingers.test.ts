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
