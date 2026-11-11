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

  it('拆开的 Unicode（NFD）也能认出 ü', () => {
    expect(toKey('nǚ'.normalize('NFD'))).toBe('nv');
    expect(toKey('lü'.normalize('NFD'))).toBe('lv');
  });

  it('j q x y 后面按课本写法打 u', () => {
    expect(toKey('qù')).toBe('qu');
    expect(toKey('yú')).toBe('yu');
  });

  it('大写也转成小写', () => {
    expect(toKey('Hǎi')).toBe('hai');
  });
});
