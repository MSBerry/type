import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Hands from './Hands';
import Keyboard from './Keyboard';

describe('Keyboard', () => {
  it('高亮下一个要按的键，按错的键标橙色', () => {
    const { container } = render(<Keyboard nextKey="h" wrongKey="x" />);
    expect(container.querySelector('[data-key="h"]')).toHaveClass('is-next');
    expect(container.querySelector('[data-key="x"]')).toHaveClass('is-wrong');
    expect(container.querySelectorAll('.is-next')).toHaveLength(1);
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

describe('Hands', () => {
  it('亮起对应的手指', () => {
    const { container } = render(<Hands finger="ri" />);
    expect(container.querySelector('[data-finger="ri"]')).toHaveClass('is-on');
    expect(container.querySelectorAll('.is-on')).toHaveLength(1);
  });

  it('大拇指两只一起亮', () => {
    const { container } = render(<Hands finger="th" />);
    expect(container.querySelector('[data-finger="lt"]')).toHaveClass('is-on');
    expect(container.querySelector('[data-finger="rt"]')).toHaveClass('is-on');
  });

  it('没有要按的键时都不亮', () => {
    const { container } = render(<Hands finger={null} />);
    expect(container.querySelectorAll('.is-on')).toHaveLength(0);
  });
});
