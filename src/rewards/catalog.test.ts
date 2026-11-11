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
