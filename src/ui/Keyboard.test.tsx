import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Keyboard from './Keyboard';

describe('Keyboard', () => {
  it('高亮下一个要按的键，按错的键标橙色', () => {
    const { container } = render(<Keyboard nextKey="h" wrongKey="x" />);
    expect(container.querySelector('[data-key="h"]')).toHaveClass('is-next');
    expect(container.querySelector('[data-key="x"]')).toHaveClass('is-wrong');
    expect(container.querySelectorAll('.is-next')).toHaveLength(1);
  });

  it('连续按错同一个键时，抖动动画重新开始', () => {
    const { container, rerender } = render(<Keyboard nextKey="h" wrongKey="x" wrongTick={1} />);
    const first = container.querySelector('[data-key="x"]');
    rerender(<Keyboard nextKey="h" wrongKey="x" wrongTick={2} />);
    expect(container.querySelector('[data-key="x"]')).not.toBe(first);
  });

  it('F 和 J 有定位凸点', () => {
    const { getByTestId } = render(<Keyboard nextKey={null} wrongKey={null} />);
    expect(getByTestId('bump-f')).toBeInTheDocument();
    expect(getByTestId('bump-j')).toBeInTheDocument();
  });

  it('错键刚好是下一个键时，只显示高亮', () => {
    const { container } = render(<Keyboard nextKey="h" wrongKey="h" />);
    expect(container.querySelector('[data-key="h"]')).not.toHaveClass('is-wrong');
  });

  it('整块键盘对读屏软件隐藏（文字提示另外给）', () => {
    const { container } = render(<Keyboard nextKey="a" wrongKey={null} />);
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('键盘下方的双手', () => {
  it('不打开时不画手', () => {
    const { container } = render(<Keyboard nextKey="t" wrongKey={null} />);
    expect(container.querySelector('.kb-hands')).toBeNull();
  });

  it('画出两只手的 8 根手指和 2 根拇指', () => {
    const { container } = render(<Keyboard nextKey="t" wrongKey={null} showHands />);
    expect(container.querySelectorAll('[data-hand-finger]')).toHaveLength(10);
  });

  it('亮起负责下一个键的手指，头顶冒出这个键', () => {
    const { container } = render(<Keyboard nextKey="t" wrongKey={null} showHands />);
    expect(container.querySelector('[data-hand-finger="li"]')).toHaveClass('is-active');
    expect(container.querySelectorAll('.is-active')).toHaveLength(1);
    expect(container.querySelector('.kb-hand-bubble')).toHaveTextContent('T');
  });

  it('右手的键亮右手的手指', () => {
    const { container } = render(<Keyboard nextKey="j" wrongKey={null} showHands />);
    expect(container.querySelector('[data-hand-finger="ri"]')).toHaveClass('is-active');
    expect(container.querySelector('[data-hand-finger="li"]')).not.toHaveClass('is-active');
  });

  it('空格亮两根拇指', () => {
    const { container } = render(<Keyboard nextKey=" " wrongKey={null} showHands />);
    expect(container.querySelector('[data-hand-finger="lt"]')).toHaveClass('is-active');
    expect(container.querySelector('[data-hand-finger="rt"]')).toHaveClass('is-active');
    expect(container.querySelector('.kb-hand-bubble')).toHaveTextContent('空格');
  });

  it('没有下一个键时手指都不亮', () => {
    const { container } = render(<Keyboard nextKey={null} wrongKey={null} showHands />);
    expect(container.querySelectorAll('.is-active')).toHaveLength(0);
    expect(container.querySelector('.kb-hand-bubble')).toBeNull();
  });
});
