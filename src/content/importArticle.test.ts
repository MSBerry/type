import { describe, expect, it } from 'vitest';
import type { PinyinFn } from './annotate';
import { buildCustomBook, loadPinyinFn, splitArticle } from './importArticle';

const han = (s: string) => [...s].filter((c) => /\p{Script=Han}/u.test(c)).length;

describe('splitArticle', () => {
  it('短文章就是一段，换行和空格去掉', () => {
    expect(splitArticle('  小猫钓鱼。\n\n 它很开心！ ')).toEqual(['小猫钓鱼。它很开心！']);
  });

  it('长文章按句子切，每段不超过 80 个字', () => {
    const text = '小猫跟着妈妈到河边去钓鱼，一会儿看蜻蜓，一会儿追蝴蝶。'.repeat(12);
    const parts = splitArticle(text);
    expect(parts.length).toBeGreaterThan(3);
    for (const p of parts) expect(han(p)).toBeLessThanOrEqual(80);
    expect(parts.join('')).toBe(text);
  });

  it('没有句号的超长句子在逗号处切开', () => {
    const text = `${'春天来了，'.repeat(40)}`;
    for (const p of splitArticle(text)) expect(han(p)).toBeLessThanOrEqual(80);
  });
});

describe('buildCustomBook', () => {
  const fake: PinyinFn = (text) =>
    [...text].map((c) => ({ origin: c, pinyin: c === '龘' ? '' : 'mā', isZh: /\p{Script=Han}/u.test(c), polyphonic: [] }));

  it('生成一本「我的文章」书', () => {
    const { book } = buildCustomBook(' 小猫钓鱼 ', '小猫钓鱼。', fake, 1000);
    expect(book).toMatchObject({ id: 'my-rs', title: '小猫钓鱼', theme: '我的文章', mark: '小', skinId: '' });
    expect(book.segments).toHaveLength(1);
    expect(book.segments[0]).toMatchObject({ id: 's1', title: '第 1 段' });
  });

  it('标不出拼音的字自动跳过，并告诉家长', () => {
    const { book, unknown } = buildCustomBook('', '龘龘小猫。', fake);
    expect(book.title).toBe('我的文章');
    expect(unknown).toEqual(['龘']);
    expect(book.segments[0].tokens[0]).toEqual({ kind: 'skip', char: '龘' });
  });

  it('方括号不会被当成手动拼音', () => {
    const { book } = buildCustomBook('', '小[猫]钓鱼。', fake);
    expect(book.segments[0].tokens.map((t) => t.char).join('')).toBe('小猫钓鱼。');
  });

  it('没有汉字就报错', () => {
    expect(() => buildCustomBook('', 'hello 123', fake)).toThrow('没有汉字');
  });

  it('用真的拼音库', async () => {
    const fn = await loadPinyinFn();
    const { book } = buildCustomBook('', '女孩去上学。', fn);
    expect(book.segments[0].tokens.filter((t) => t.kind === 'hanzi').map((t) => (t.kind === 'hanzi' ? t.key : ''))).toEqual(['nv', 'hai', 'qu', 'shang', 'xue']);
  });
});
