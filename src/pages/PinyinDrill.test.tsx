import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PINYIN_SETS } from '../drills/pinyinSets';
import { ProfileProvider } from '../storage/ProfileContext';
import { STORAGE_KEY } from '../storage/profile';
import { PinyinHome, PinyinSetPage } from './PinyinDrill';

const wrap = (ui: React.ReactNode) => render(<ProfileProvider storage={localStorage}>{ui}</ProfileProvider>);

describe('PinyinHome', () => {
  it('列出四组，点进去开始练', () => {
    wrap(<PinyinHome />);
    fireEvent.click(screen.getByRole('button', { name: '整体认读：开始练' }));
    expect(window.location.hash).toBe('#/pinyin/zhengti');
  });
});

describe('PinyinSetPage', () => {
  it('打完一组，字数算进打字量', () => {
    wrap(<PinyinSetPage setId="zhengti" />);
    for (let n = 0; n < 300; n++) {
      const next = document.querySelector('.now-letter.is-next');
      if (!next) break;
      fireEvent.keyDown(window, { key: next.textContent! });
    }
    expect(screen.getByText('完成啦！')).toBeInTheDocument();
    const count = PINYIN_SETS.find((s) => s.id === 'zhengti')!.items.length;
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).profiles[0].totalChars).toBe(count);
  });

  it('不存在的组给出返回按钮', () => {
    wrap(<PinyinSetPage setId="nope" />);
    expect(screen.getByText('找不到这一组')).toBeInTheDocument();
  });
});
