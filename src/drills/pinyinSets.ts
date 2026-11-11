import { toKey } from '../content/pinyinKey';
import type { Token } from '../engine/types';

export type PinyinSet = { id: string; name: string; desc: string; items: [string, string][] };

export const PINYIN_SETS: PinyinSet[] = [
  {
    id: 'shengmu',
    name: '声母',
    desc: 'b p m f 到 y w，23 个声母的代表字',
    items: [
      ['玻', 'bō'], ['坡', 'pō'], ['摸', 'mō'], ['佛', 'fó'], ['得', 'dé'], ['特', 'tè'], ['讷', 'nè'], ['勒', 'lè'],
      ['哥', 'gē'], ['科', 'kē'], ['喝', 'hē'], ['鸡', 'jī'], ['七', 'qī'], ['西', 'xī'], ['知', 'zhī'], ['吃', 'chī'],
      ['诗', 'shī'], ['日', 'rì'], ['资', 'zī'], ['雌', 'cí'], ['思', 'sī'], ['衣', 'yī'], ['乌', 'wū'],
    ],
  },
  {
    id: 'yunmu',
    name: '韵母',
    desc: 'ai ao ou an en ang……带韵母的常用字',
    items: [
      ['爱', 'ài'], ['奥', 'ào'], ['欧', 'ōu'], ['安', 'ān'], ['恩', 'ēn'], ['昂', 'áng'],
      ['鹅', 'é'], ['耳', 'ěr'], ['翁', 'wēng'], ['雪', 'xuě'], ['学', 'xué'], ['绿', 'lǜ'],
    ],
  },
  {
    id: 'zhengti',
    name: '整体认读',
    desc: 'zhi chi shi ri zi ci si yi wu yu……16 个整体认读音节',
    items: [
      ['知', 'zhī'], ['吃', 'chī'], ['诗', 'shī'], ['日', 'rì'], ['字', 'zì'], ['刺', 'cì'], ['四', 'sì'], ['衣', 'yī'],
      ['屋', 'wū'], ['鱼', 'yú'], ['叶', 'yè'], ['月', 'yuè'], ['圆', 'yuán'], ['音', 'yīn'], ['云', 'yún'], ['鹰', 'yīng'],
    ],
  },
  {
    id: 'yihun',
    name: '易混音',
    desc: 'zh 和 z、ch 和 c、sh 和 s、n 和 l、ü 和 u',
    items: [
      ['猪', 'zhū'], ['租', 'zū'], ['出', 'chū'], ['粗', 'cū'], ['书', 'shū'], ['苏', 'sū'], ['南', 'nán'],
      ['蓝', 'lán'], ['牛', 'niú'], ['六', 'liù'], ['女', 'nǚ'], ['怒', 'nù'], ['绿', 'lǜ'], ['路', 'lù'],
    ],
  },
];

/** 把一组字打乱顺序，变成要打的字 */
export function pinyinTokens(set: PinyinSet, rng: () => number = Math.random): Token[] {
  const items = [...set.items];
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items.map(([char, tone]) => ({ kind: 'hanzi', char, key: toKey(tone), tone }));
}
