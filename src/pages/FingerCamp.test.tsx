import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProfileProvider } from '../storage/ProfileContext';
import { STORAGE_KEY, defaultStore, saveStore } from '../storage/profile';
import { FingerCamp, FingerLevelPage } from './FingerCamp';

const saved = () => JSON.parse(localStorage.getItem(STORAGE_KEY)!).profiles[0];
const seedLevel = (n: number) => {
  const store = defaultStore();
  store.profiles[0].fingerLevel = n;
  saveStore(localStorage, store);
};
const wrap = (ui: React.ReactNode) => render(<ProfileProvider storage={localStorage}>{ui}</ProfileProvider>);

describe('FingerCamp', () => {
  it('第 1 关开着，后面的关卡锁着', () => {
    wrap(<FingerCamp />);
    expect(screen.getByRole('button', { name: '第 1 关：F 和 J' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '第 2 关：D 和 K' })).toBeDisabled();
  });

  it('通过的关卡显示已通过，下一关解锁', () => {
    seedLevel(2);
    wrap(<FingerCamp />);
    expect(screen.getAllByText('已通过')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: '第 3 关：S 和 L' }));
    expect(window.location.hash).toBe('#/finger/3');
  });
});

describe('FingerLevelPage', () => {
  const typeAll = () => {
    for (let n = 0; n < 200; n++) {
      const next = document.querySelector('.now-letter.is-next');
      if (!next) break;
      fireEvent.keyDown(window, { key: next.textContent! });
    }
  };

  it('全对过关，解锁下一关，并记录成绩', () => {
    wrap(<FingerLevelPage level={1} />);
    typeAll();
    expect(screen.getByText('过关啦！第 2 关解锁了')).toBeInTheDocument();
    expect(saved().fingerLevel).toBe(1);
    expect(saved().stars).toBe(3);
    expect(saved().totalChars).toBe(0);
    fireEvent.click(screen.getByRole('button', { name: '下一关 →' }));
    expect(window.location.hash).toBe('#/finger/2');
  });

  it('没解锁的关卡不能直接进', () => {
    wrap(<FingerLevelPage level={5} />);
    expect(screen.getByText('这一关还没解锁')).toBeInTheDocument();
  });
});
