export type Finger = 'lp' | 'lr' | 'lm' | 'li' | 'ri' | 'rm' | 'rr' | 'rp' | 'th';

export const KEY_ROWS: string[][] = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/'],
];

export const HOME_KEYS = ['f', 'j'];

const FINGER_BY_KEY: Record<string, Finger> = {
  q: 'lp', a: 'lp', z: 'lp',
  w: 'lr', s: 'lr', x: 'lr',
  e: 'lm', d: 'lm', c: 'lm',
  r: 'li', t: 'li', f: 'li', g: 'li', v: 'li', b: 'li',
  y: 'ri', u: 'ri', h: 'ri', j: 'ri', n: 'ri', m: 'ri',
  i: 'rm', k: 'rm', ',': 'rm',
  o: 'rr', l: 'rr', '.': 'rr',
  p: 'rp', ';': 'rp', '/': 'rp',
};

export function fingerOf(key: string): Finger {
  return FINGER_BY_KEY[key.toLowerCase()] ?? 'th';
}

export const FINGER_NAME: Record<Finger, string> = {
  lp: '左手小指',
  lr: '左手无名指',
  lm: '左手中指',
  li: '左手食指',
  ri: '右手食指',
  rm: '右手中指',
  rr: '右手无名指',
  rp: '右手小指',
  th: '大拇指',
};

export const FINGER_TINT: Record<Finger, string> = {
  lp: '#EDE6FF',
  rp: '#EDE6FF',
  lr: '#DDF5EA',
  rr: '#DDF5EA',
  lm: '#DCEBFF',
  rm: '#DCEBFF',
  li: '#FFE6D3',
  ri: '#FFE6D3',
  th: '#F1F3F8',
};
