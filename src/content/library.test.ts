import { describe, expect, it } from 'vitest';
import { getBook, getSegment, listCustomBooks, listShelf, nextSegmentId, segmentAfter, setCustomBooks } from './library';
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
    expect(xiyouji?.segmentIds.slice(0, 4)).toEqual(['c1-1', 'c1-2', 'c1-3', 'c1-4']);
    expect(xiyouji?.segmentIds).toEqual(getBook('xiyouji')!.segments.map((s) => s.id));
    // 没内容的书：哪些书上线会变，从全部年级里找一本还没上线的
    const notReady = ([0, 4, 5, 6] as const).flatMap((g) => listShelf(g).flatMap((grp) => grp.books)).find((b) => !b.ready)!;
    expect(notReady).toBeDefined();
    expect(getBook(notReady.id)).toBeNull();
    expect(notReady.segmentIds).toEqual([]);
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
    const notReady = SHELF.find((b) => listShelf(b.grade).some((g) => g.books.some((x) => x.id === b.id && !x.ready)))!;
    expect(getBook(notReady.id)).toBeNull();
    expect(getBook('nope')).toBeNull();
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
    expect(segmentAfter(book, book.segments[book.segments.length - 1].id)).toBeNull();
  });
});

describe('自己导入的文章', () => {
  it('登记后 getBook 能找到，换一批就替换', () => {
    const book = { id: 'my-1', title: '小猫', segments: [{ id: 's1', title: '第 1 段', tokens: [] }] } as unknown as Book;
    setCustomBooks([book]);
    expect(getBook('my-1')?.title).toBe('小猫');
    expect(getSegment('my-1', 's1')?.title).toBe('第 1 段');
    expect(listCustomBooks()).toHaveLength(1);
    setCustomBooks([]);
    expect(getBook('my-1')).toBeNull();
  });
});
