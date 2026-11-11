import { toKey } from '../content/pinyinKey';

export type Word = { text: string; tone: string; key: string };

const word = (text: string, tone: string): Word => ({ text, tone, key: toKey(tone.replace(/ /g, '')) });

/** 泡泡里的词，都来自《西游记》 */
export const WORDS: Word[] = [
  word('悟空', 'wù kōng'),
  word('金箍棒', 'jīn gū bàng'),
  word('筋斗云', 'jīn dǒu yún'),
  word('花果山', 'huā guǒ shān'),
  word('水帘洞', 'shuǐ lián dòng'),
  word('龙宫', 'lóng gōng'),
  word('定海神针', 'dìng hǎi shén zhēn'),
  word('猴王', 'hóu wáng'),
  word('石猴', 'shí hóu'),
  word('仙石', 'xiān shí'),
  word('东海', 'dōng hǎi'),
  word('龙王', 'lóng wáng'),
  word('唐僧', 'táng sēng'),
  word('八戒', 'bā jiè'),
  word('沙僧', 'shā sēng'),
  word('白龙马', 'bái lóng mǎ'),
  word('西天', 'xī tiān'),
  word('取经', 'qǔ jīng'),
  word('妖怪', 'yāo guài'),
  word('宝贝', 'bǎo bèi'),
];

export const GOAL = 20;
export const LIVES = 3;
export const RISE_MS = 15000;
export const SPAWN_MS = 2600;
export const MAX_BUBBLES = 5;
export const TICK_MS = 50;
/** 泡泡出现的 5 条竖道，0 最左、4 最右 */
export const LANES = 5;

export type Bubble = { id: number; word: Word; lane: number; y: number };

export type GameState = {
  bubbles: Bubble[];
  nextId: number;
  spawnIn: number;
  typed: string;
  score: number;
  combo: number;
  popped: number;
  poppedHanzi: number;
  lives: number;
  right: number;
  wrong: number;
  elapsed: number;
  status: 'playing' | 'won' | 'lost';
};

export function newGame(): GameState {
  return { bubbles: [], nextId: 1, spawnIn: 0, typed: '', score: 0, combo: 0, popped: 0, poppedHanzi: 0, lives: LIVES, right: 0, wrong: 0, elapsed: 0, status: 'playing' };
}

/** 泡泡从底升到顶要多久；戳破越多越快，最快是原来的 55% */
export function riseMs(popped: number): number {
  return RISE_MS * Math.max(0.55, 1 - popped * 0.02);
}

export function tick(s: GameState, dt: number, rng: () => number = Math.random): GameState {
  if (s.status !== 'playing') return s;
  const step = dt / riseMs(s.popped);
  let lives = s.lives;
  let combo = s.combo;
  const bubbles: Bubble[] = [];
  for (const b of s.bubbles) {
    const y = b.y + step;
    if (y >= 1) {
      lives -= 1;
      combo = 0;
    } else {
      bubbles.push({ ...b, y });
    }
  }
  const typed = s.typed && bubbles.some((b) => b.word.key.startsWith(s.typed)) ? s.typed : '';

  let { nextId } = s;
  let spawnIn = s.spawnIn - dt;
  if (spawnIn <= 0 && bubbles.length < MAX_BUBBLES) {
    const pool = WORDS.filter((w) => !bubbles.some((b) => b.word.key === w.key));
    const lanes = Array.from({ length: LANES }, (_, i) => i).filter((i) => !bubbles.some((b) => b.lane === i && b.y < 0.35));
    if (pool.length > 0 && lanes.length > 0) {
      bubbles.push({ id: nextId, word: pool[Math.floor(rng() * pool.length)], lane: lanes[Math.floor(rng() * lanes.length)], y: 0 });
      nextId += 1;
      spawnIn = SPAWN_MS;
    }
  }

  return { ...s, bubbles, nextId, spawnIn, lives, combo, typed, elapsed: s.elapsed + dt, status: lives <= 0 ? 'lost' : 'playing' };
}

export function typeKey(s: GameState, rawKey: string): GameState {
  if (s.status !== 'playing' || !/^[A-Za-z]$/.test(rawKey)) return s;
  const typed = s.typed + rawKey.toLowerCase();
  const matches = s.bubbles.filter((b) => b.word.key.startsWith(typed));
  if (matches.length === 0) return { ...s, typed: '', combo: 0, wrong: s.wrong + 1 };
  const done = matches.find((b) => b.word.key === typed);
  if (!done) return { ...s, typed, right: s.right + 1 };
  const popped = s.popped + 1;
  return {
    ...s,
    typed: '',
    right: s.right + 1,
    bubbles: s.bubbles.filter((b) => b.id !== done.id),
    score: s.score + done.word.text.length * 10 + s.combo * 5,
    combo: s.combo + 1,
    popped,
    poppedHanzi: s.poppedHanzi + done.word.text.length,
    status: popped >= GOAL ? 'won' : 'playing',
  };
}

/** 正在打的拼音对得上哪些泡泡 */
export function targetIds(s: GameState): Set<number> {
  if (!s.typed) return new Set();
  return new Set(s.bubbles.filter((b) => b.word.key.startsWith(s.typed)).map((b) => b.id));
}

export function gameStars(s: GameState): 1 | 2 | 3 {
  if (s.status === 'won') return 3;
  return s.popped >= GOAL / 2 ? 2 : 1;
}
