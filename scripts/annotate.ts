import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pinyin } from 'pinyin-pro';
import { type PinyinFn, annotateBody } from '../src/content/annotate';
import type { Book } from '../src/content/schema';
import { parseSource } from '../src/content/sourceFormat';

const pinyinFn: PinyinFn = (text) =>
  pinyin(text, { type: 'all' }).map((x) => ({ origin: x.origin, pinyin: x.pinyin, isZh: x.isZh, polyphonic: x.polyphonic }));

const SRC_DIR = 'content-src';
const OUT_DIR = 'src/content/books';
const files =
  process.argv.length > 2
    ? process.argv.slice(2)
    : readdirSync(SRC_DIR)
        .filter((f) => f.endsWith('.txt'))
        .map((f) => join(SRC_DIR, f));

mkdirSync(OUT_DIR, { recursive: true });

for (const file of files) {
  const { meta, segments } = parseSource(readFileSync(file, 'utf8'));
  const book: Book = { ...meta, segments: [] };
  console.log(`\n《${meta.title}》 ${file}`);
  for (const seg of segments) {
    const r = annotateBody(seg.body, pinyinFn);
    book.segments.push({ id: seg.id, title: seg.title, tokens: r.tokens, ...(seg.quiz ? { quiz: seg.quiz } : {}) });
    for (const p of r.polyphones) {
      console.log(`  [多音字] ${seg.id} 第 ${p.index + 1} 字「${p.char}」用了 ${p.chosen}（可选：${p.options.join(' / ')}）`);
    }
    for (const u of r.unknown) console.log(`  [标不出] ${seg.id} 第 ${u.index + 1} 字「${u.char}」已改为自动跳过`);
  }
  const out = join(OUT_DIR, `${meta.id}.json`);
  writeFileSync(out, JSON.stringify(book, null, 2) + '\n', 'utf8');
  console.log(`  已写入 ${out}`);
}
