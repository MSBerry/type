import type { Token } from '../engine/types';
import { toKey } from './pinyinKey';

export type PinyinItem = { origin: string; pinyin: string; isZh: boolean; polyphonic: string[] };
export type PinyinFn = (text: string) => PinyinItem[];
export type AnnotateReport = {
  tokens: Token[];
  /** 有多个读音、又没有人工指定的字，需要人核对 */
  polyphones: { index: number; char: string; chosen: string; options: string[] }[];
  /** 标不出拼音的字，已改为自动跳过 */
  unknown: { index: number; char: string }[];
};

export function annotateBody(body: string, pinyinFn: PinyinFn): AnnotateReport {
  const src = [...body.replace(/［/g, '[').replace(/］/g, ']')];
  const chars: string[] = [];
  const overrides = new Map<number, string>();
  for (let i = 0; i < src.length; i++) {
    if (src[i] === '[') {
      if (chars.length === 0) throw new Error(`「${body.slice(0, 20)}…」开头的 [ 前面没有字`);
      const end = src.indexOf(']', i);
      if (end < 0) throw new Error(`「${body.slice(0, 20)}…」里有没闭合的 [`);
      overrides.set(chars.length - 1, src.slice(i + 1, end).join('').trim());
      i = end;
      continue;
    }
    chars.push(src[i]);
  }

  const items = pinyinFn(chars.join(''));
  if (items.length !== chars.length || items.some((it, i) => it.origin !== chars[i])) {
    throw new Error(`拼音库返回的结果和原文对不上：${chars.join('').slice(0, 20)}…`);
  }

  const report: AnnotateReport = { tokens: [], polyphones: [], unknown: [] };
  items.forEach((it, i) => {
    const char = chars[i];
    if (!it.isZh) {
      report.tokens.push({ kind: 'skip', char });
      return;
    }
    const tone = overrides.get(i) ?? it.pinyin;
    const key = toKey(tone);
    if (!/^[a-z]+$/.test(key)) {
      if (overrides.has(i)) throw new Error(`「${char}」的手动拼音「${tone}」不合法`);
      report.unknown.push({ index: i, char });
      report.tokens.push({ kind: 'skip', char });
      return;
    }
    if (!overrides.has(i) && it.polyphonic.length > 1) {
      report.polyphones.push({ index: i, char, chosen: tone, options: it.polyphonic });
    }
    report.tokens.push({ kind: 'hanzi', char, key, tone });
  });
  return report;
}
