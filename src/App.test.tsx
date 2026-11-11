import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from './App';

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
});
