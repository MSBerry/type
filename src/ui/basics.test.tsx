import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Mascot from './Mascot';
import ProgressBar from './ProgressBar';
import StarRow from './StarRow';

describe('Mascot', () => {
  it('有无障碍名字，表情可切换', () => {
    render(<Mascot label="键宝在挥手" mood="oops" />);
    const img = screen.getByRole('img', { name: '键宝在挥手' });
    expect(img).toHaveAttribute('data-mood', 'oops');
  });
});

describe('ProgressBar', () => {
  it('数值限制在 0–100 并取整', () => {
    render(<ProgressBar value={150.4} label="进度" />);
    expect(screen.getByRole('progressbar', { name: '进度' })).toHaveAttribute('aria-valuenow', '100');
  });
});

describe('StarRow', () => {
  it('显示几颗亮星', () => {
    const { container } = render(<StarRow count={2} />);
    expect(screen.getByRole('img', { name: '2 颗星' })).toBeInTheDocument();
    const fills = [...container.querySelectorAll('path')].map((p) => p.getAttribute('fill'));
    expect(fills).toEqual(['#FFC93C', '#FFC93C', '#FFFFFF']);
  });
});
