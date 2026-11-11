import { describe, expect, it } from 'vitest';
import { quizOrder } from './quizOrder';

describe('quizOrder', () => {
  it('是 0..n-1 的一个排列', () => {
    expect([...quizOrder(4, 'xiyouji/c1-1')].sort()).toEqual([0, 1, 2, 3]);
  });

  it('同一段每次都一样', () => {
    expect(quizOrder(3, 'sanguo/c1-2')).toEqual(quizOrder(3, 'sanguo/c1-2'));
  });

  it('原来第一个选项会出现在不同位置', () => {
    const where = new Set(Array.from({ length: 30 }, (_, i) => quizOrder(3, `book/s${i}`).indexOf(0)));
    expect(where.size).toBe(3);
  });
});
