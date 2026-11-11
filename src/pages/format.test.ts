import { describe, expect, it } from 'vitest';
import { formatDuration, headlineFor } from './format';

describe('formatDuration', () => {
  it('毫秒变成 分:秒', () => {
    expect(formatDuration(65000)).toBe('1:05');
    expect(formatDuration(4000)).toBe('0:04');
    expect(formatDuration(600000)).toBe('10:00');
  });
});

describe('headlineFor', () => {
  it('按星星给不同的夸奖', () => {
    expect(headlineFor(3, '小明')).toBe('太棒了，小明！');
    expect(headlineFor(2, '小明')).toBe('真不错，小明！');
    expect(headlineFor(1, '小明')).toBe('完成啦，小明！再练练会更好');
  });
});
