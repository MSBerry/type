import { describe, expect, it } from 'vitest';
import type { Token } from '../engine/types';
import { type Book, hanziCount, validateBook } from './schema';

function hanzi(n: number): Token[] {
  return Array.from({ length: n }, () => ({ kind: 'hanzi' as const, char: '字', key: 'zi', tone: 'zì' }));
}

function makeBook(over: Partial<Book> = {}): Book {
  return {
    id: 'demo',
    title: '示例',
    author: '测试',
    grade: 5,
    term: '下册',
    theme: '古典名著',
    skinId: 'monkey',
    skinName: '美猴王',
    cover: '#FF7A45',
    mark: '示',
    kind: 'prose',
    segments: [{ id: 's1', title: '第一段', tokens: [...hanzi(50), { kind: 'skip', char: '。' }], quiz: { q: '问题', options: ['甲', '乙'], answer: 0 } }],
    ...over,
  };
}

describe('hanziCount', () => {
  it('只数汉字，不数标点', () => {
    expect(hanziCount(makeBook().segments[0])).toBe(50);
  });
});

describe('validateBook', () => {
  it('合格的书没有错误', () => {
    expect(validateBook(makeBook())).toEqual([]);
  });

  it('普通段落必须 40–80 字', () => {
    const errors = validateBook(makeBook({ segments: [{ id: 's1', title: 't', tokens: hanzi(10) }] }));
    expect(errors.join()).toContain('有 10 个汉字，应在 40–80 之间');
  });

  it('古诗允许 16–120 字', () => {
    expect(validateBook(makeBook({ kind: 'poem', segments: [{ id: 's1', title: 't', tokens: hanzi(20) }] }))).toEqual([]);
  });

  it('按键只能是 a–z', () => {
    const tokens: Token[] = [...hanzi(49), { kind: 'hanzi', char: '女', key: 'nü', tone: 'nǚ' }];
    expect(validateBook(makeBook({ segments: [{ id: 's1', title: 't', tokens }] })).join()).toContain('「女」');
  });

  it('段落 id 不能重复', () => {
    const seg = { id: 's1', title: 't', tokens: hanzi(50) };
    expect(validateBook(makeBook({ segments: [seg, seg] })).join()).toContain('段落 id 重复');
  });

  it('小考考答案下标不能越界', () => {
    const errors = validateBook(makeBook({ segments: [{ id: 's1', title: 't', tokens: hanzi(50), quiz: { q: '?', options: ['甲', '乙'], answer: 2 } }] }));
    expect(errors.join()).toContain('答案下标越界');
  });

  it('没有段落、没有皮肤都要报错', () => {
    const errors = validateBook(makeBook({ segments: [], skinId: '' }));
    expect(errors.join()).toContain('没有任何段落');
    expect(errors.join()).toContain('skinId');
  });
});
