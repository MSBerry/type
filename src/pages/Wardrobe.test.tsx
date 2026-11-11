import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProfileProvider } from '../storage/ProfileContext';
import { STORAGE_KEY, defaultStore, saveStore } from '../storage/profile';
import Wardrobe from './Wardrobe';

function renderPage() {
  return render(
    <ProfileProvider storage={localStorage}>
      <Wardrobe />
    </ProfileProvider>,
  );
}

const saved = () => JSON.parse(localStorage.getItem(STORAGE_KEY)!).profiles[0];

function seedScarf() {
  const store = defaultStore();
  store.profiles[0].skinsOwned = ['classic', 'scarf'];
  store.profiles[0].skinsNew = ['scarf'];
  saveStore(localStorage, store);
}

describe('Wardrobe', () => {
  it('默认显示正穿着的皮肤和拥有数量', () => {
    renderPage();
    expect(screen.getByText('键宝正穿着它')).toBeInTheDocument();
    expect(screen.getByText('已拥有 1 / 18 套')).toBeInTheDocument();
  });

  it('点没解锁的皮肤显示解锁条件', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: '美猴王：读完《西游记》' }));
    expect(screen.getByText('解锁条件：读完《西游记》')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '穿上它' })).not.toBeInTheDocument();
  });

  it('新皮肤有 NEW 标记，试穿后保存，标记消失', () => {
    seedScarf();
    renderPage();
    expect(screen.getByText('NEW')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '红围巾：已拥有，新' }));
    expect(screen.queryByText('NEW')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '穿上它' }));
    expect(saved().skinWorn).toBe('scarf');
    expect(saved().skinsNew).toEqual([]);
    expect(screen.getByText('键宝正穿着它')).toBeInTheDocument();
  });

  it('显示离下一个小皮肤还差多少字', () => {
    renderPage();
    expect(screen.getByText('再打 500 字得「红围巾」')).toBeInTheDocument();
  });

  it('返回大厅', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: '← 回大厅' }));
    expect(window.location.hash).toBe('#/');
  });
});
