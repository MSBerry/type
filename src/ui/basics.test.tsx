import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SKINS } from '../rewards/skins';
import Mascot from './Mascot';
import ProgressBar from './ProgressBar';
import StarRow from './StarRow';

describe('Mascot', () => {
  it('有无障碍名字，表情可切换', () => {
    render(<Mascot label="键宝在挥手" mood="oops" />);
    const img = screen.getByRole('img', { name: '键宝在挥手' });
    expect(img).toHaveAttribute('data-mood', 'oops');
  });

  it('按皮肤换身体颜色和配饰', () => {
    const { container } = render(<Mascot skinId="scarf" />);
    expect(container.querySelector('[data-layer="scarf"]')).toBeInTheDocument();
    expect(container.querySelector('[data-part="body"]')).toHaveAttribute('fill', '#FFC93C');
  });

  it('换颜色的皮肤没有配饰', () => {
    const { container } = render(<Mascot skinId="mint" />);
    expect(container.querySelector('[data-part="body"]')).toHaveAttribute('fill', '#34C38F');
    expect(container.querySelector('[data-layer]')).toBeNull();
  });

  it('戴帽子时不显示天线', () => {
    const { container } = render(<Mascot skinId="straw" />);
    expect(container.querySelector('[data-part="antenna"]')).toBeNull();
  });

  it('每套皮肤都画得出来', () => {
    for (const s of SKINS) {
      const { container, unmount } = render(<Mascot skinId={s.id} />);
      for (const layer of s.layers) expect(container.querySelector(`[data-layer="${layer}"]`)).toBeInTheDocument();
      unmount();
    }
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
