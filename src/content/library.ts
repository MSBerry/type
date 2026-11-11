import type { Book, BookMeta, Segment } from './schema';
import { SHELF } from './shelf';

const modules = import.meta.glob<{ default: Book }>('./books/*.json', { eager: true });
const READY = new Map<string, Book>(Object.values(modules).map((m) => [m.default.id, m.default]));

export type ShelfBook = BookMeta & { ready: boolean; segmentIds: string[] };
export type ShelfGroup = { term: BookMeta['term']; theme: string; books: ShelfBook[] };

export function listShelf(grade: BookMeta['grade']): ShelfGroup[] {
  const groups: ShelfGroup[] = [];
  for (const meta of SHELF.filter((b) => b.grade === grade)) {
    let group = groups.find((g) => g.term === meta.term);
    if (!group) {
      group = { term: meta.term, theme: meta.theme, books: [] };
      groups.push(group);
    }
    const book = READY.get(meta.id);
    group.books.push({ ...meta, ready: Boolean(book), segmentIds: book ? book.segments.map((s) => s.id) : [] });
  }
  return groups;
}

export function getBook(id: string): Book | null {
  return READY.get(id) ?? null;
}

export function getSegment(bookId: string, segmentId: string): Segment | null {
  return getBook(bookId)?.segments.find((s) => s.id === segmentId) ?? null;
}

export function nextSegmentId(segmentIds: string[], done: string[]): string | null {
  if (segmentIds.length === 0) return null;
  return segmentIds.find((id) => !done.includes(id)) ?? segmentIds[0];
}

export function segmentAfter(book: Book, segmentId: string): string | null {
  const i = book.segments.findIndex((s) => s.id === segmentId);
  return i >= 0 && i + 1 < book.segments.length ? book.segments[i + 1].id : null;
}
