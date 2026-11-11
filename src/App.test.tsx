import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from './App';
import { getSegment } from './content/library';

describe('App', () => {
  it('默认进入首页', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: '你好，小朋友！' })).toBeInTheDocument();
  });

  it('按地址进入读书岛', () => {
    window.location.hash = '#/books';
    render(<App />);
    expect(screen.getByRole('heading', { name: '读书岛' })).toBeInTheDocument();
  });

  it('按地址进入练习页', () => {
    window.location.hash = '#/practice/xiyouji/c1-1';
    render(<App />);
    expect(screen.getByText('现在打这个字')).toBeInTheDocument();
  });

  it('换页时回到页面顶部', () => {
    const spy = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    render(<App />);
    spy.mockClear();
    act(() => {
      window.location.hash = '#/books';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(spy).toHaveBeenCalledWith(0, 0);
    spy.mockRestore();
  });

  it('能保存时不显示提示条', () => {
    render(<App />);
    expect(screen.queryByText(/不允许保存/)).not.toBeInTheDocument();
  });

  it('打完一段后能看到成绩（页面之间的交接）', async () => {
    window.location.hash = '#/practice/xiyouji/c1-1';
    render(<App />);
    const letters = getSegment('xiyouji', 'c1-1')!
      .tokens.flatMap((t) => (t.kind === 'hanzi' ? [t.key] : []))
      .join('');
    for (const k of letters) fireEvent.keyDown(window, { key: k });
    fireEvent.click(screen.getByRole('button', { name: '看看我的成绩' }));
    expect(await screen.findByRole('heading', { name: '太棒了，小朋友！' })).toBeInTheDocument();
    expect(screen.getByTestId('stat-chars')).toHaveTextContent('52');
    expect(screen.getByText('花果山在哪个国家？')).toBeInTheDocument();
  });

  it('不能保存时显示提示条', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    render(<App />);
    expect(screen.getByRole('alert')).toHaveTextContent('不允许保存');
    spy.mockRestore();
  });
});
