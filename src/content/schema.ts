import type { Token } from '../engine/types';

export type Quiz = { q: string; options: string[]; answer: number };
export type Segment = { id: string; title: string; tokens: Token[]; quiz?: Quiz };
export type BookKind = 'prose' | 'poem';

export type BookMeta = {
  id: string;
  title: string;
  author: string;
  /** 0 表示通用（古诗词小站） */
  grade: 0 | 4 | 5 | 6;
  term: '上册' | '下册' | '通用';
  theme: string;
  skinId: string;
  skinName: string;
  /** 封面底色 */
  cover: string;
  /** 封面上的大字 */
  mark: string;
  kind: BookKind;
};

export type Book = BookMeta & { segments: Segment[] };

export const SEGMENT_RANGE: Record<BookKind, [number, number]> = {
  prose: [40, 80],
  poem: [16, 120],
};

export function hanziCount(seg: Segment): number {
  return seg.tokens.filter((t) => t.kind === 'hanzi').length;
}

export function validateBook(book: Book): string[] {
  const errors: string[] = [];
  if (!book.skinId) errors.push(`${book.id}: 缺少 skinId`);
  if (book.segments.length === 0) errors.push(`${book.id}: 没有任何段落`);
  const [min, max] = SEGMENT_RANGE[book.kind];
  const seen = new Set<string>();
  for (const seg of book.segments) {
    const where = `${book.id}/${seg.id}`;
    if (seen.has(seg.id)) errors.push(`${where}: 段落 id 重复`);
    seen.add(seg.id);
    const n = hanziCount(seg);
    if (n < min || n > max) errors.push(`${where}: 有 ${n} 个汉字，应在 ${min}–${max} 之间`);
    seg.tokens.forEach((t, i) => {
      if ([...t.char].length !== 1) errors.push(`${where} 第 ${i + 1} 个字符: char 必须是单个字符`);
      if (t.kind === 'hanzi' && !/^[a-z]+$/.test(t.key)) {
        errors.push(`${where} 第 ${i + 1} 个字符「${t.char}」: 按键「${t.key}」只能包含 a–z`);
      }
    });
    if (seg.quiz) {
      const { q, options, answer } = seg.quiz;
      if (q.trim() === '') errors.push(`${where}: 小考考的问题是空的`);
      if (options.length < 2) errors.push(`${where}: 小考考至少要 2 个选项`);
      if (options.some((o) => o.trim() === '')) errors.push(`${where}: 小考考有空选项`);
      if (new Set(options).size !== options.length) errors.push(`${where}: 小考考有重复选项`);
      if (!Number.isInteger(answer) || answer < 0 || answer >= options.length) errors.push(`${where}: 小考考答案下标越界`);
    }
  }
  return errors;
}

/** 家长导入的文章，书的 id 都以它开头 */
export const CUSTOM_BOOK_PREFIX = 'my-';
