import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfileProvider } from '../storage/ProfileContext';
import { STORAGE_KEY } from '../storage/profile';
import Game from './Game';

const saved = () => JSON.parse(localStorage.getItem(STORAGE_KEY)!).profiles[0];

function renderGame() {
  return render(
    <ProfileProvider storage={localStorage}>
      <Game />
    </ProfileProvider>,
  );
}

describe('Game', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('开始前显示玩法，点开始后出现泡泡', () => {
    renderGame();
    expect(screen.getByRole('heading', { name: '龙宫泡泡' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '开始游戏' }));
    act(() => {
      vi.advanceTimersByTime(60);
    });
    expect(screen.getByText('悟空')).toBeInTheDocument();
  });

  it('打出拼音戳破泡泡，加分', () => {
    renderGame();
    fireEvent.click(screen.getByRole('button', { name: '开始游戏' }));
    act(() => {
      vi.advanceTimersByTime(60);
    });
    for (const k of 'wukong') fireEvent.keyDown(window, { key: k });
    expect(screen.queryByText('悟空')).not.toBeInTheDocument();
    expect(screen.getByTestId('game-score')).toHaveTextContent('20');
  });

  it('泡泡都跑掉了就结束，记下成绩', () => {
    renderGame();
    fireEvent.click(screen.getByRole('button', { name: '开始游戏' }));
    act(() => {
      vi.advanceTimersByTime(30000);
    });
    expect(screen.getByText('泡泡跑掉啦')).toBeInTheDocument();
    expect(saved().stars).toBe(1);
    fireEvent.click(screen.getByRole('button', { name: '再玩一次' }));
    expect(screen.queryByText('泡泡跑掉啦')).not.toBeInTheDocument();
  });
});
