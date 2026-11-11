import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { getSegment } from '../content/library';
import { ProfileProvider } from '../storage/ProfileContext';
import { STORAGE_KEY } from '../storage/profile';
import Practice from './Practice';

function renderPractice(bookId = 'xiyouji', segmentId = 'c1-1') {
  return render(
    <ProfileProvider storage={localStorage}>
      <Practice bookId={bookId} segmentId={segmentId} />
    </ProfileProvider>,
  );
}

function typeKeys(keys: string) {
  for (const k of keys) fireEvent.keyDown(window, { key: k });
}

function lettersOf(segmentId: string) {
  return getSegment('xiyouji', segmentId)!
    .tokens.flatMap((t) => (t.kind === 'hanzi' ? [t.key] : []))
    .join('');
}

const current = () => document.querySelector('[aria-current="true"]');

describe('Practice', () => {
  it('从第一个字开始，打对后跳到下一个字', () => {
    renderPractice();
    expect(current()).toHaveTextContent('海');
    expect(screen.getByText('现在打这个字')).toBeInTheDocument();
    typeKeys('hai');
    expect(current()).toHaveTextContent('外');
  });

  it('按错时键宝提示按到了哪个键', () => {
    renderPractice();
    typeKeys('x');
    expect(screen.getByText('哎呀，按到 X 啦。看看发光的那个键！')).toBeInTheDocument();
  });

  it('开着中文输入法时显示切换提示', () => {
    renderPractice();
    fireEvent.keyDown(window, { key: 'Process' });
    expect(screen.getByRole('alert')).toHaveTextContent('中文输入法');
  });

  it('可以关掉拼音', () => {
    renderPractice();
    fireEvent.click(screen.getByRole('button', { name: '拼音：开' }));
    expect(screen.getByRole('button', { name: '拼音：关' })).toBeInTheDocument();
  });

  it('打完整段：显示完成卡片、保存进度，能去看成绩', () => {
    renderPractice();
    typeKeys(lettersOf('c1-1'));
    expect(screen.getByText('整段完成！')).toBeInTheDocument();
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!).profiles[0];
    expect(saved.bookProgress.xiyouji.done).toEqual(['c1-1']);
    expect(saved.stars).toBe(3);
    expect(saved.totalChars).toBe(52);
    fireEvent.click(screen.getByRole('button', { name: '看看我的成绩' }));
    expect(window.location.hash).toBe('#/result');
  });

  it('连续按错同一个键，键盘上的错键会重新抖动', () => {
    renderPractice();
    typeKeys('x');
    const first = document.querySelector('[data-key="x"]');
    typeKeys('x');
    expect(document.querySelector('[data-key="x"]')).not.toBe(first);
  });

  it('点按钮不抢键盘焦点，免得按空格时误触发重来', () => {
    renderPractice();
    expect(fireEvent.mouseDown(screen.getByRole('button', { name: '重新开始这一段' }))).toBe(false);
    expect(fireEvent.mouseDown(screen.getByRole('button', { name: '拼音：开' }))).toBe(false);
  });

  it('找不到这一段时给出返回按钮', () => {
    renderPractice('sanguo', 'x');
    expect(screen.getByText('找不到这一段')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '回读书岛' }));
    expect(window.location.hash).toBe('#/books');
  });
});
