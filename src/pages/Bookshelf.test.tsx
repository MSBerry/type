import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { getBook, listShelf } from '../content/library';
import { ProfileProvider } from '../storage/ProfileContext';
import type { Book } from '../content/schema';
import { defaultStore, saveStore } from '../storage/profile';
import Bookshelf from './Bookshelf';

const XIYOUJI_ALL = getBook('xiyouji')!.segments.map((s) => s.id);

function renderShelf() {
  return render(
    <ProfileProvider storage={localStorage}>
      <Bookshelf />
    </ProfileProvider>,
  );
}

describe('Bookshelf', () => {
  it('已拥有皮肤时写已获得', () => {
    const store = defaultStore();
    store.profiles[0].skinsOwned = ['classic', 'monkey'];
    saveStore(localStorage, store);
    renderShelf();
    expect(screen.getByText('已获得大皮肤「美猴王」')).toBeInTheDocument();
  });

  it('只读完书但皮肤没发时，不写已获得', () => {
    const store = defaultStore();
    store.profiles[0].bookProgress.xiyouji = { done: XIYOUJI_ALL, lastSegment: XIYOUJI_ALL[XIYOUJI_ALL.length - 1], updatedAt: 1 };
    saveStore(localStorage, store);
    renderShelf();
    expect(screen.getByText('读完送大皮肤「美猴王」')).toBeInTheDocument();
  });

  it('默认显示档案里的年级（五年级）', () => {
    renderShelf();
    expect(screen.getByRole('tab', { name: '五年级' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('heading', { name: '古典名著' })).toBeInTheDocument();
  });

  it('已上线的书可以开始，没上线的显示即将上线', () => {
    renderShelf();
    expect(screen.getByRole('button', { name: '开始打字：《西游记》' })).toBeEnabled();
    // 找一本还没上线的书（哪些书上线会变，不写死）
    const grade = ([4, 5, 6] as const).find((g) => listShelf(g).some((grp) => grp.books.some((b) => !b.ready)))!;
    const notReady = listShelf(grade).flatMap((grp) => grp.books).find((b) => !b.ready)!;
    fireEvent.click(screen.getByRole('tab', { name: `${'四五六'[grade - 4]}年级` }));
    const article = screen.getByText(notReady.title).closest('article')!;
    expect(within(article).getByRole('button', { name: '即将上线' })).toBeDisabled();
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
    expect(screen.getByText(`已打 1 / ${XIYOUJI_ALL.length} 段`)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '继续打字：《西游记》' }));
    expect(window.location.hash).toBe('#/practice/xiyouji/c1-2');
  });

  it('每本书都写着读完能得到的大皮肤', () => {
    renderShelf();
    expect(screen.getByText('读完送大皮肤「美猴王」')).toBeInTheDocument();
  });
  it('全部打完的书显示已读完', () => {
    const store = defaultStore();
    store.profiles[0].bookProgress.xiyouji = { done: XIYOUJI_ALL, lastSegment: XIYOUJI_ALL[XIYOUJI_ALL.length - 1], updatedAt: 1 };
    saveStore(localStorage, store);
    renderShelf();
    expect(screen.getByText(`已读完 · 全部 ${XIYOUJI_ALL.length} 段`)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '再读一遍：《西游记》' })).toBeEnabled();
  });

  it('有导入的文章时显示「我的文章」书架', () => {
    const store = defaultStore();
    store.customBooks = [
      { id: 'my-1', title: '小猫钓鱼', author: '我的文章', grade: 0, term: '通用', theme: '我的文章', skinId: '', skinName: '', cover: '#8B6CFF', mark: '小', kind: 'prose', segments: [{ id: 's1', title: '第 1 段', tokens: [{ kind: 'hanzi', char: '猫', key: 'mao', tone: 'māo' }] }] } as Book,
    ];
    saveStore(localStorage, store);
    renderShelf();
    expect(screen.getByRole('heading', { name: '我的文章' })).toBeInTheDocument();
    expect(screen.queryByText(/大皮肤「」/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '开始打字：《小猫钓鱼》' }));
    expect(window.location.hash).toBe('#/practice/my-1/s1');
  });
});
