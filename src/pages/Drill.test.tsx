import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Token } from '../engine/types';
import { ProfileProvider } from '../storage/ProfileContext';
import Drill from './Drill';

const TOKENS: Token[] = [
  { kind: 'hanzi', char: 'F', key: 'f', tone: '' },
  { kind: 'hanzi', char: 'J', key: 'j', tone: '' },
  { kind: 'skip', char: '·' },
  { kind: 'hanzi', char: 'F', key: 'f', tone: '' },
];

function renderDrill(over: Partial<Parameters<typeof Drill>[0]> = {}) {
  const props = {
    title: '第 1 关 · F 和 J',
    tokens: TOKENS,
    unit: '键',
    back: { label: '← 训练营', route: { name: 'finger' as const } },
    onFinish: vi.fn(),
    onRestart: vi.fn(),
    ...over,
  };
  render(
    <ProfileProvider storage={localStorage}>
      <Drill {...props} />
    </ProfileProvider>,
  );
  return props;
}

const type = (keys: string) => {
  for (const k of keys) fireEvent.keyDown(window, { key: k });
};

describe('Drill', () => {
  it('显示标题、进度和要按的键', () => {
    renderDrill();
    expect(screen.getByRole('heading', { name: '第 1 关 · F 和 J' })).toBeInTheDocument();
    expect(screen.getByText('0 / 3 键')).toBeInTheDocument();
    expect(screen.getByText('现在按这个')).toBeInTheDocument();
  });

  it('打完后只回报一次成绩，显示完成卡片和说明', () => {
    const props = renderDrill({ note: '过关啦！' });
    type('fjf');
    expect(props.onFinish).toHaveBeenCalledTimes(1);
    expect(props.onFinish).toHaveBeenCalledWith(expect.objectContaining({ count: 3, accuracy: 100, stars: 3 }));
    expect(screen.getByText('完成啦！')).toBeInTheDocument();
    expect(screen.getByText('过关啦！')).toBeInTheDocument();
  });

  it('再来一次交给外面重新出题', () => {
    const props = renderDrill();
    type('fjf');
    fireEvent.click(screen.getByRole('button', { name: '再来一次' }));
    expect(props.onRestart).toHaveBeenCalled();
  });

  it('有下一关时显示下一关按钮', () => {
    const onNext = vi.fn();
    renderDrill({ onNext });
    type('fjf');
    fireEvent.click(screen.getByRole('button', { name: '下一关 →' }));
    expect(onNext).toHaveBeenCalled();
  });

  it('返回按钮', () => {
    renderDrill();
    fireEvent.click(screen.getByRole('button', { name: '← 训练营' }));
    expect(window.location.hash).toBe('#/finger');
  });
});
