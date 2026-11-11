import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createSession, press } from '../engine/session';
import type { Token } from '../engine/types';
import Passage from './Passage';

const TOKENS: Token[] = [
  { kind: 'hanzi', char: '你', key: 'ni', tone: 'nǐ' },
  { kind: 'hanzi', char: '好', key: 'hao', tone: 'hǎo' },
  { kind: 'skip', char: '，' },
  { kind: 'hanzi', char: '海', key: 'hai', tone: 'hǎi' },
];

function afterTyping(keys: string) {
  let s = createSession(TOKENS);
  [...keys].forEach((k, i) => {
    s = press(s, k, i * 100).session;
  });
  return s;
}

describe('Passage', () => {
  it('标出已完成、当前、未开始', () => {
    const { container } = render(<Passage session={afterTyping('ni')} showPinyin />);
    const cells = container.querySelectorAll('.pg-cell, .pg-skip');
    expect(cells[0]).toHaveClass('is-done');
    expect(cells[1]).toHaveClass('is-current');
    expect(cells[1]).toHaveAttribute('aria-current', 'true');
    expect(cells[2]).toHaveClass('is-todo');
    expect(cells[1]).toHaveTextContent('hǎo好');
  });

  it('关掉拼音后只有当前字显示拼音', () => {
    const { container } = render(<Passage session={afterTyping('ni')} showPinyin={false} />);
    const py = [...container.querySelectorAll('.pg-py')].map((e) => e.textContent);
    expect(py).toEqual(['', 'hǎo', '']);
  });

  it('当前字变化时滚动到看得见的位置', () => {
    const spy = vi.fn();
    Element.prototype.scrollIntoView = spy;
    const { rerender } = render(<Passage session={afterTyping('')} showPinyin />);
    spy.mockClear();
    rerender(<Passage session={afterTyping('ni')} showPinyin />);
    expect(spy).toHaveBeenCalledWith({ block: 'nearest' });
    delete (Element.prototype as Partial<Element>).scrollIntoView;
  });

  it('标点和前一个字不分开，行首不会出现标点', () => {
    const { container } = render(<Passage session={afterTyping('')} showPinyin />);
    const comma = [...container.querySelectorAll('.pg-skip')].find((e) => e.textContent === '，')!;
    expect(comma.parentElement).toHaveClass('pg-unit');
    expect(comma.parentElement).toHaveTextContent('好，');
  });
  it('前引号和书名号跟后一个字在同一组', () => {
    const tokens: Token[] = [
      { kind: 'hanzi', char: '说', key: 'shuo', tone: 'shuō' },
      { kind: 'skip', char: '：' },
      { kind: 'skip', char: '“' },
      { kind: 'hanzi', char: '读', key: 'du', tone: 'dú' },
      { kind: 'skip', char: '《' },
      { kind: 'hanzi', char: '西', key: 'xi', tone: 'xī' },
      { kind: 'skip', char: '》' },
      { kind: 'skip', char: '”' },
    ];
    render(<Passage session={createSession(tokens)} showPinyin />);
    const unitOf = (ch: string) => screen.getByText(ch).closest('.pg-unit');
    expect(unitOf('“')).toBe(unitOf('读'));
    expect(unitOf('《')).toBe(unitOf('西'));
    expect(unitOf('：')).toBe(unitOf('说'));
    expect(unitOf('”')).toBe(unitOf('西'));
  });
});
