import { describe, expect, it } from 'vitest';
import { getBook, getSegment, listShelf, nextSegmentId, segmentAfter } from './library';
import { SHELF } from './shelf';
import type { Book } from './schema';

describe('SHELF', () => {
  it('书的 id 不重复', () => {
    expect(new Set(SHELF.map((b) => b.id)).size).toBe(SHELF.length);
  });

  it('每本书的皮肤不重复', () => {
    expect(new Set(SHELF.map((b) => b.skinId)).size).toBe(SHELF.length);
  });

  it('每本上线的书都在书目里，信息一致', () => {
    const modules = import.meta.glob<{ default: Book }>('./books/*.json', { eager: true });
    expect(Object.keys(modules).length).toBeGreaterThan(0);
    for (const m of Object.values(modules)) {
      const meta = SHELF.find((b) => b.id === m.default.id);
      expect(meta, `《${m.default.title}》不在 SHELF 里`).toBeDefined();
      expect(m.default).toMatchObject(meta!);
    }
  });
});

describe('listShelf', () => {
  it('五年级分成上册、下册两排', () => {
    const groups = listShelf(5);
    expect(groups.map((g) => g.term)).toEqual(['上册', '下册']);
    expect(groups[1].theme).toBe('古典名著');
  });

  it('有内容的书标记为已上线，带段落列表', () => {
    const xiyouji = listShelf(5)[1].books.find((b) => b.id === 'xiyouji');
    expect(xiyouji?.ready).toBe(true);
    expect(xiyouji?.segmentIds).toEqual(['c1-1', 'c1-2', 'c1-3', 'c1-4']);
    const sanguo = listShelf(5)[1].books.find((b) => b.id === 'sanguo');
    expect(sanguo?.ready).toBe(false);
    expect(sanguo?.segmentIds).toEqual([]);
  });

  it('古诗词小站是通用的', () => {
    expect(listShelf(0)[0].books.map((b) => b.id)).toEqual(['gushici']);
  });
});

describe('getBook / getSegment', () => {
  it('能拿到已上线的书和段落', () => {
    expect(getBook('xiyouji')?.title).toBe('西游记');
    expect(getSegment('xiyouji', 'c1-1')?.title).toBe('第一回 · 傲来国花果山');
  });

  it('没上线或不存在的返回 null', () => {
    expect(getBook('sanguo')).toBeNull();
    expect(getSegment('xiyouji', 'nope')).toBeNull();
  });

  it('已上线的书和书目里的信息一致', () => {
    const book = getBook('xiyouji');
    const meta = SHELF.find((b) => b.id === 'xiyouji');
    expect(book?.title).toBe(meta?.title);
    expect(book?.skinId).toBe(meta?.skinId);
  });
});

describe('nextSegmentId / segmentAfter', () => {
  const ids = ['c1-1', 'c1-2', 'c1-3'];
  it('跳到第一个没打过的段', () => {
    expect(nextSegmentId(ids, ['c1-1'])).toBe('c1-2');
  });
  it('全部打完就从头开始', () => {
    expect(nextSegmentId(ids, ids)).toBe('c1-1');
  });
  it('没有段落返回 null', () => {
    expect(nextSegmentId([], [])).toBeNull();
  });
  it('找下一段，最后一段返回 null', () => {
    const book = getBook('xiyouji')!;
    expect(segmentAfter(book, 'c1-1')).toBe('c1-2');
    expect(segmentAfter(book, 'c1-4')).toBeNull();
  });
});
