import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import App from './App';

it('能渲染出应用名字', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: '小键盘大冒险' })).toBeInTheDocument();
});
