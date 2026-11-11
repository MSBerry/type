import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProfileProvider } from '../storage/ProfileContext';
import { defaultStore, saveStore } from '../storage/profile';
import Home from './Home';

function renderHome() {
  return render(
    <ProfileProvider storage={localStorage}>
      <Home />
    </ProfileProvider>,
  );
}

describe('Home', () => {
  it('第一次来：打招呼，引导去读书岛', () => {
    renderHome();
    expect(screen.getByRole('heading', { name: '你好，小朋友！' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '去读书岛 →' }));
    expect(window.location.hash).toBe('#/books');
  });

  it('读过书：显示继续读，并跳到没打过的段', () => {
    const store = defaultStore();
    store.profiles[0].bookProgress.xiyouji = { done: ['c1-1'], lastSegment: 'c1-1', updatedAt: 5 };
    saveStore(localStorage, store);
    renderHome();
    expect(screen.getByText('继续读：《西游记》')).toBeInTheDocument();
    expect(screen.getByText('已打 1 / 4 段')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '继续打字 →' }));
    expect(window.location.hash).toBe('#/practice/xiyouji/c1-2');
  });

  it('读书岛入口可以点，其他三个模式即将开放', () => {
    renderHome();
    fireEvent.click(screen.getByRole('button', { name: '读书岛：去选书' }));
    expect(window.location.hash).toBe('#/books');
    for (const name of ['指法训练营', '拼音快打', '游戏乐园']) {
      expect(screen.getByRole('button', { name: `${name}：即将开放` })).toBeDisabled();
    }
  });
  it('读完的书显示再读一遍', () => {
    const store = defaultStore();
    store.profiles[0].bookProgress.xiyouji = { done: ['c1-1', 'c1-2', 'c1-3', 'c1-4'], lastSegment: 'c1-4', updatedAt: 5 };
    saveStore(localStorage, store);
    renderHome();
    fireEvent.click(screen.getByRole('button', { name: '再读一遍 →' }));
    expect(window.location.hash).toBe('#/practice/xiyouji/c1-1');
  });
});
