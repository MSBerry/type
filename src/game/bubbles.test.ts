import { describe, expect, it } from 'vitest';
import { type GameState, GOAL, LIVES, MAX_BUBBLES, SPAWN_MS, WORDS, gameStars, newGame, riseMs, targetIds, tick, typeKey } from './bubbles';

const zero = () => 0;
const withBubble = (over: Partial<GameState> = {}): GameState => ({
  ...newGame(),
  bubbles: [{ id: 1, word: WORDS[0], lane: 0, y: 0.5 }],
  nextId: 2,
  spawnIn: 99999,
  ...over,
});

describe('WORDS', () => {
  it('按键都是 a–z，而且不重复', () => {
    for (const w of WORDS) expect(w.key).toMatch(/^[a-z]+$/);
    expect(new Set(WORDS.map((w) => w.key)).size).toBe(WORDS.length);
  });

  it('第一个词是悟空', () => {
    expect(WORDS[0]).toEqual({ text: '悟空', tone: 'wù kōng', key: 'wukong' });
  });
});

describe('tick', () => {
  it('开局马上出第一个泡泡', () => {
    const s = tick(newGame(), 50, zero);
    expect(s.bubbles).toHaveLength(1);
    expect(s.bubbles[0].word).toBe(WORDS[0]);
    expect(s.spawnIn).toBe(SPAWN_MS);
  });

  it('泡泡往上升，升到顶就跑掉，扣一条命', () => {
    const s = tick(withBubble(), riseMs(0) * 0.6, zero);
    expect(s.bubbles.find((b) => b.id === 1)).toBeUndefined();
    expect(s.lives).toBe(LIVES - 1);
    expect(s.combo).toBe(0);
  });

  it('命用完就输了', () => {
    const s = tick(withBubble({ lives: 1 }), riseMs(0), zero);
    expect(s.status).toBe('lost');
  });

  it('同时最多 5 个泡泡', () => {
    let s = newGame();
    for (let n = 0; n < 20; n++) s = tick(s, SPAWN_MS, () => 0.99);
    expect(s.bubbles.length).toBeLessThanOrEqual(MAX_BUBBLES);
  });

  it('戳破得越多，泡泡升得越快', () => {
    expect(riseMs(10)).toBeLessThan(riseMs(0));
  });
});

describe('typeKey', () => {
  it('打对开头的字母，记下来并标出目标泡泡', () => {
    const s = typeKey(withBubble(), 'w');
    expect(s.typed).toBe('w');
    expect([...targetIds(s)]).toEqual([1]);
  });

  it('打完整个拼音就戳破泡泡，加分、连击、记字数', () => {
    let s = withBubble();
    for (const k of 'wukong') s = typeKey(s, k);
    expect(s.bubbles).toHaveLength(0);
    expect(s.popped).toBe(1);
    expect(s.poppedHanzi).toBe(2);
    expect(s.score).toBe(20);
    expect(s.combo).toBe(1);
    expect(s.typed).toBe('');
  });

  it('打错了清空，连击归零', () => {
    const s = typeKey(withBubble({ typed: 'w', combo: 3 }), 'x');
    expect(s.typed).toBe('');
    expect(s.combo).toBe(0);
    expect(s.wrong).toBe(1);
  });

  it('戳破第 20 个就赢了', () => {
    let s = withBubble({ popped: GOAL - 1 });
    for (const k of 'wukong') s = typeKey(s, k);
    expect(s.status).toBe('won');
    expect(gameStars(s)).toBe(3);
  });

  it('不是字母、或者游戏结束后都不管', () => {
    const s = withBubble();
    expect(typeKey(s, '1')).toBe(s);
    const over = { ...s, status: 'lost' as const };
    expect(typeKey(over, 'w')).toBe(over);
  });
});

describe('gameStars', () => {
  it('赢了 3 星，戳破一半 2 星，其余 1 星', () => {
    expect(gameStars({ ...newGame(), status: 'lost', popped: GOAL / 2 })).toBe(2);
    expect(gameStars({ ...newGame(), status: 'lost', popped: 1 })).toBe(1);
  });
});
