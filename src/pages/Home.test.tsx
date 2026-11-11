import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { getBook } from '../content/library';
import { ProfileProvider } from '../storage/ProfileContext';
import { defaultStore, saveStore } from '../storage/profile';
import Home from './Home';

const XIYOUJI_ALL = getBook('xiyouji')!.segments.map((s) => s.id);

function renderHome() {
  return render(
    <ProfileProvider storage={localStorage}>
      <Home />
    </ProfileProvider>,
  );
}

describe('Home', () => {
  it('显示今日任务、速度等级和徽章', () => {
    renderHome();
    expect(screen.getByRole('heading', { name: '今日任务' })).toBeInTheDocument();
    expect(screen.getByText('打一段课外书')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '速度等级' })).toBeInTheDocument();
    expect(screen.getByText('打到 20 字/分，升级「小兔」，送大皮肤')).toBeInTheDocument();
    expect(screen.getByText('已收集 0 / 16')).toBeInTheDocument();
  });

  it('可以进衣橱，有新皮肤时有提示', () => {
    const store = defaultStore();
    store.profiles[0].skinsNew = ['scarf'];
    saveStore(localStorage, store);
    renderHome();
    fireEvent.click(screen.getByRole('button', { name: '我的衣橱：有新皮肤' }));
    expect(window.location.hash).toBe('#/wardrobe');
  });

  it('显示离下一个小皮肤还差多少字', () => {
    renderHome();
    expect(screen.getByText('再打 500 字，解锁「红围巾」')).toBeInTheDocument();
  });

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
    expect(screen.getByText(`已打 1 / ${getBook('xiyouji')!.segments.length} 段`)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '继续打字 →' }));
    expect(window.location.hash).toBe('#/practice/xiyouji/c1-2');
  });

  it('四个模式都能进', () => {
    renderHome();
    fireEvent.click(screen.getByRole('button', { name: '读书岛：去选书' }));
    expect(window.location.hash).toBe('#/books');
    fireEvent.click(screen.getByRole('button', { name: '指法训练营：出发' }));
    expect(window.location.hash).toBe('#/finger');
    fireEvent.click(screen.getByRole('button', { name: '拼音快打：出发' }));
    expect(window.location.hash).toBe('#/pinyin');
    fireEvent.click(screen.getByRole('button', { name: '游戏乐园：去玩' }));
    expect(window.location.hash).toBe('#/game');
  });

  it('指法卡片显示练到第几关', () => {
    const store = defaultStore();
    store.profiles[0].fingerLevel = 2;
    saveStore(localStorage, store);
    renderHome();
    expect(screen.getByText('第 3 / 12 关')).toBeInTheDocument();
  });
  it('读完的书显示再读一遍', () => {
    const store = defaultStore();
    store.profiles[0].bookProgress.xiyouji = { done: XIYOUJI_ALL, lastSegment: XIYOUJI_ALL[XIYOUJI_ALL.length - 1], updatedAt: 5 };
    saveStore(localStorage, store);
    renderHome();
    fireEvent.click(screen.getByRole('button', { name: '再读一遍 →' }));
    expect(window.location.hash).toBe('#/practice/xiyouji/c1-1');
  });

  it('有家长中心入口', () => {
    renderHome();
    fireEvent.click(screen.getByRole('button', { name: '家长中心' }));
    expect(window.location.hash).toBe('#/parent');
  });
});
