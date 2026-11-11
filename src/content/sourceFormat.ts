import type { BookKind, BookMeta, Quiz } from './schema';

export type RawSegment = { id: string; title: string; body: string; quiz?: Quiz };
export type ParsedSource = { meta: BookMeta; segments: RawSegment[] };

const REQUIRED = ['id', 'title', 'author', 'grade', 'term', 'theme', 'skinId', 'skinName', 'cover', 'mark', 'kind'] as const;

export function parseSource(text: string): ParsedSource {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  const header: Record<string, string> = {};
  const segments: RawSegment[] = [];
  let cur: RawSegment | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const at = `第 ${i + 1} 行`;
    if (line === '' || line.startsWith('#')) continue;

    if (line.startsWith('===')) {
      const m = /^===\s*([A-Za-z0-9_-]+)\s*\|\s*(.+)$/.exec(line);
      if (!m) throw new Error(`${at}：段落标题应写成「=== 段落id | 标题」`);
      cur = { id: m[1], title: m[2].trim(), body: '' };
      segments.push(cur);
      continue;
    }

    if (cur === null) {
      const m = /^([A-Za-z]+)\s*:\s*(.+)$/.exec(line);
      if (!m) throw new Error(`${at}：书的信息应写成「字段: 值」`);
      header[m[1]] = m[2].trim();
      continue;
    }

    if (line.startsWith('?')) {
      const [q, ...opts] = line
        .slice(1)
        .split('|')
        .map((s) => s.trim())
        .filter(Boolean);
      const answer = opts.findIndex((o) => o.startsWith('*'));
      if (!q || opts.length < 2 || answer < 0) throw new Error(`${at}：小考考应写成「? 问题 | *正确答案 | 错误答案」`);
      cur.quiz = { q, options: opts.map((o) => o.replace(/^\*/, '').trim()), answer };
      continue;
    }

    cur.body += line;
  }

  for (const k of REQUIRED) if (!header[k]) throw new Error(`缺少书的信息「${k}」`);
  const grade = Number(header.grade);
  if (![0, 4, 5, 6].includes(grade)) throw new Error('grade 只能是 0、4、5、6');
  if (!['上册', '下册', '通用'].includes(header.term)) throw new Error('term 只能是 上册、下册、通用');
  if (!['prose', 'poem'].includes(header.kind)) throw new Error('kind 只能是 prose 或 poem');
  if (segments.length === 0) throw new Error('至少要有一个段落（=== 开头）');

  const meta: BookMeta = {
    id: header.id,
    title: header.title,
    author: header.author,
    grade: grade as BookMeta['grade'],
    term: header.term as BookMeta['term'],
    theme: header.theme,
    skinId: header.skinId,
    skinName: header.skinName,
    cover: header.cover,
    mark: header.mark,
    kind: header.kind as BookKind,
  };
  return { meta, segments };
}
