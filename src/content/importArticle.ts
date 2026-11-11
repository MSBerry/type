import { type PinyinFn, annotateBody } from './annotate';
import { type Book, CUSTOM_BOOK_PREFIX } from './schema';

export const ARTICLE_MAX_CHARS = 3000;
const SEG_MIN = 40;
const SEG_MAX = 80;
const isHan = (c: string) => /\p{Script=Han}/u.test(c);
const hanCount = (s: string) => [...s].filter(isHan).length;
const ENDS = '。！？；!?…';
const CLOSERS = '”’」』）)';

/** 拆成句子：句末标点（连同后面的右引号）结束一句，换行也结束一句 */
function sentences(text: string): string[] {
  const out: string[] = [];
  let cur = '';
  const chars = [...text];
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (c === '\n') {
      if (cur) out.push(cur);
      cur = '';
      continue;
    }
    cur += c;
    if (ENDS.includes(c)) {
      while (i + 1 < chars.length && (ENDS.includes(chars[i + 1]) || CLOSERS.includes(chars[i + 1]))) cur += chars[++i];
      out.push(cur);
      cur = '';
    }
  }
  if (cur) out.push(cur);
  return out;
}

/** 太长的句子：够 40 字后在逗号处切，最多 80 字硬切 */
function hardSplit(s: string): string[] {
  const out: string[] = [];
  let cur = '';
  let n = 0;
  for (const c of s) {
    cur += c;
    if (isHan(c)) n += 1;
    if ((n >= SEG_MIN && /[，、,：:]/.test(c)) || n >= SEG_MAX) {
      out.push(cur);
      cur = '';
      n = 0;
    }
  }
  if (cur) out.push(cur);
  return out;
}

/** 把文章切成一段一段：每段尽量 40–80 个汉字，按句子切 */
export function splitArticle(text: string): string[] {
  const lines = text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => l.replace(/\s+/g, ''))
    .filter(Boolean);
  const parts: string[] = [];
  let cur = '';
  let n = 0;
  const flush = () => {
    if (cur) parts.push(cur);
    cur = '';
    n = 0;
  };
  for (const s of sentences(lines.join('\n'))) {
    const k = hanCount(s);
    if (k > SEG_MAX) {
      flush();
      parts.push(...hardSplit(s));
      continue;
    }
    if (n + k > SEG_MAX) flush();
    cur += s;
    n += k;
    if (n >= SEG_MIN) flush();
  }
  flush();
  if (parts.length > 1) {
    const last = parts[parts.length - 1];
    const prev = parts[parts.length - 2];
    if (hanCount(last) < 20 && hanCount(prev) + hanCount(last) <= 100) parts.splice(-2, 2, prev + last);
  }
  return parts.filter((p) => hanCount(p) > 0);
}

export type ImportResult = { book: Book; unknown: string[] };

export function buildCustomBook(title: string, text: string, pinyinFn: PinyinFn, now = Date.now()): ImportResult {
  const name = title.trim().slice(0, 20) || '我的文章';
  // 方括号在课文源文件里表示手动拼音，这里去掉；超出基本平面的字符（emoji 等）也去掉
  const body = [...text.replace(/[[\]［］]/g, '')].filter((c) => c.length === 1).join('').slice(0, ARTICLE_MAX_CHARS);
  const parts = splitArticle(body);
  if (parts.length === 0) throw new Error('文章里没有汉字');
  const unknown = new Set<string>();
  const segments = parts.map((part, i) => {
    const r = annotateBody(part, pinyinFn);
    for (const u of r.unknown) unknown.add(u.char);
    return { id: `s${i + 1}`, title: `第 ${i + 1} 段`, tokens: r.tokens };
  });
  return {
    book: {
      id: `${CUSTOM_BOOK_PREFIX}${now.toString(36)}`,
      title: name,
      author: '我的文章',
      grade: 0,
      term: '通用',
      theme: '我的文章',
      skinId: '',
      skinName: '',
      cover: '#8B6CFF',
      mark: [...name][0],
      kind: 'prose',
      segments,
    },
    unknown: [...unknown],
  };
}

/** 拼音库比较大，用到时才加载（打包成单独的文件） */
export async function loadPinyinFn(): Promise<PinyinFn> {
  const { pinyin } = await import('pinyin-pro');
  return (text) => pinyin(text, { type: 'all' }).map((x) => ({ origin: x.origin, pinyin: x.pinyin, isZh: x.isZh, polyphonic: x.polyphonic }));
}
