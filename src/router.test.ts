import { describe, expect, it } from 'vitest';
import { type Route, parseHash, toHash } from './router';

describe('parseHash', () => {
  it('认识四种页面', () => {
    expect(parseHash('')).toEqual({ name: 'home' });
    expect(parseHash('#/')).toEqual({ name: 'home' });
    expect(parseHash('#/books')).toEqual({ name: 'books' });
    expect(parseHash('#/practice/xiyouji/c1-2')).toEqual({ name: 'practice', bookId: 'xiyouji', segmentId: 'c1-2' });
    expect(parseHash('#/result')).toEqual({ name: 'result' });
    expect(parseHash('#/wardrobe')).toEqual({ name: 'wardrobe' });
    expect(parseHash('#/finger')).toEqual({ name: 'finger' });
    expect(parseHash('#/finger/3')).toEqual({ name: 'fingerLevel', level: 3 });
    expect(parseHash('#/pinyin')).toEqual({ name: 'pinyin' });
    expect(parseHash('#/pinyin/zhengti')).toEqual({ name: 'pinyinSet', setId: 'zhengti' });
    expect(parseHash('#/game')).toEqual({ name: 'game' });
    expect(parseHash('#/finger/abc')).toEqual({ name: 'finger' });
  });

  it('不认识的地址回首页', () => {
    expect(parseHash('#/whatever')).toEqual({ name: 'home' });
    expect(parseHash('#/practice/onlybook')).toEqual({ name: 'home' });
  });

  it('地址被弄坏时回首页，不崩溃', () => {
    expect(parseHash('#/practice/%E0%A4%A/x')).toEqual({ name: 'home' });
    expect(parseHash('#/%')).toEqual({ name: 'home' });
  });
});

describe('toHash', () => {
  it('和 parseHash 互相还原', () => {
    const routes: Route[] = [{ name: 'home' }, { name: 'books' }, { name: 'practice', bookId: 'xiyouji', segmentId: 'c1-1' }, { name: 'result' }, { name: 'wardrobe' }, { name: 'finger' }, { name: 'fingerLevel', level: 3 }, { name: 'pinyin' }, { name: 'pinyinSet', setId: 'zhengti' }, { name: 'game' }];
    for (const r of routes) expect(parseHash(toHash(r))).toEqual(r);
  });
});
