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
