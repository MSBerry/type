import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProfileProvider } from '../storage/ProfileContext';
import { defaultStore, saveStore } from '../storage/profile';
import Bookshelf from './Bookshelf';

function renderShelf() {
  return render(
    <ProfileProvider storage={localStorage}>
      <Bookshelf />
    </ProfileProvider>,
  );
}

describe('Bookshelf', () => {
  it('默认显示档案里的年级（五年级）', () => {
    renderShelf();
    expect(screen.getByRole('tab', { name: '五年级' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('heading', { name: '古典名著' })).toBeInTheDocument();
  });

  it('已上线的书可以开始，没上线的显示即将上线', () => {
    renderShelf();
    expect(screen.getByRole('button', { name: '开始打字：《西游记》' })).toBeEnabled();
    const sanguo = screen.getByText('三国演义').closest('article')!;
    expect(within(sanguo).getByRole('button', { name: '即将上线' })).toBeDisabled();
  });

  it('切换年级', () => {
    renderShelf();
    fireEvent.click(screen.getByRole('tab', { name: '四年级' }));
    expect(screen.getByRole('heading', { name: '神话故事' })).toBeInTheDocument();
    expect(screen.getByText('中国古代神话')).toBeInTheDocument();
  });

  it('点开始打字进入第一段', () => {
    renderShelf();
    fireEvent.click(screen.getByRole('button', { name: '开始打字：《西游记》' }));
    expect(window.location.hash).toBe('#/practice/xiyouji/c1-1');
  });

  it('打过的书显示进度，继续时跳到没打过的段', () => {
    const store = defaultStore();
    store.profiles[0].bookProgress.xiyouji = { done: ['c1-1'], lastSegment: 'c1-1', updatedAt: 1 };
    saveStore(localStorage, store);
    renderShelf();
    expect(screen.getByText('已打 1 / 4 段')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '继续打字：《西游记》' }));
    expect(window.location.hash).toBe('#/practice/xiyouji/c1-2');
  });

  it('每本书都写着读完能得到的大皮肤', () => {
    renderShelf();
    expect(screen.getByText('读完送大皮肤「美猴王」')).toBeInTheDocument();
  });
  it('全部打完的书显示已读完', () => {
    const store = defaultStore();
    store.profiles[0].bookProgress.xiyouji = { done: ['c1-1', 'c1-2', 'c1-3', 'c1-4'], lastSegment: 'c1-4', updatedAt: 1 };
    saveStore(localStorage, store);
    renderShelf();
    expect(screen.getByText('已读完 · 全部 4 段')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '再读一遍：《西游记》' })).toBeEnabled();
  });
});
