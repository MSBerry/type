import type { Token } from '../engine/types';

export type FingerLevel = { id: number; name: string; keys: string; tip: string };

export const FINGER_LEVELS: FingerLevel[] = [
  { id: 1, name: 'F 和 J', keys: 'fj', tip: '两根食指的家，摸摸键上的小凸点' },
  { id: 2, name: 'D 和 K', keys: 'dkfj', tip: '中指放在 D 和 K 上' },
  { id: 3, name: 'S 和 L', keys: 'slfjdk', tip: '无名指放在 S 和 L 上' },
  { id: 4, name: '小指 A', keys: 'asdfjkl', tip: '左手小指放在 A 上' },
  { id: 5, name: 'G 和 H', keys: 'ghfj', tip: '食指往中间伸一下' },
  { id: 6, name: '基准键大复习', keys: 'asdfghjkl', tip: '中间一排全部练一遍' },
  { id: 7, name: 'E 和 I', keys: 'eidk', tip: '中指往上伸' },
  { id: 8, name: 'R 和 U', keys: 'rufj', tip: '食指往上伸' },
  { id: 9, name: 'W 和 O', keys: 'wosl', tip: '无名指往上伸' },
  { id: 10, name: '上排', keys: 'qwertyuiop', tip: '整个上排，记得手指回家' },
  { id: 11, name: '下排', keys: 'zxcvbnm', tip: '手指往下伸，按完回到中间一排' },
  { id: 12, name: '全键盘', keys: 'abcdefghijklmnopqrstuvwxyz', tip: '26 个字母全部出场' },
];

/** 出一关的练习：groups 组，每组 size 个键，组之间用点隔开 */
export function fingerTokens(keys: string, rng: () => number = Math.random, groups = 15, size = 4): Token[] {
  const tokens: Token[] = [];
  for (let g = 0; g < groups; g++) {
    if (g > 0) tokens.push({ kind: 'skip', char: '·' });
    for (let i = 0; i < size; i++) {
      const k = keys[Math.floor(rng() * keys.length)];
      tokens.push({ kind: 'hanzi', char: k.toUpperCase(), key: k, tone: '' });
    }
  }
  return tokens;
}
