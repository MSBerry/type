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
