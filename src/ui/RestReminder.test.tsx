import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProfileProvider } from '../storage/ProfileContext';
import { defaultStore, saveStore, today } from '../storage/profile';
import RestReminder from './RestReminder';

function seed(minutes: number, limit: number) {
  const store = defaultStore();
  store.profiles[0].daily[today()] = { minutes, chars: 100 };
  store.profiles[0].settings.dailyLimitMin = limit;
  saveStore(localStorage, store);
  render(
    <ProfileProvider storage={localStorage}>
      <RestReminder />
    </ProfileProvider>,
  );
}

describe('RestReminder', () => {
  it('练够了时长就提醒，点「知道啦」关掉', () => {
    seed(21.4, 20);
    expect(screen.getByRole('heading', { name: '休息一下吧！' })).toBeInTheDocument();
    expect(screen.getByText(/今天已经练了 21 分钟/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '知道啦' }));
    expect(screen.queryByRole('heading', { name: '休息一下吧！' })).not.toBeInTheDocument();
  });

  it('没练够不提醒', () => {
    seed(5, 20);
    expect(screen.queryByRole('heading', { name: '休息一下吧！' })).not.toBeInTheDocument();
  });

  it('家长设成「不提醒」就不提醒', () => {
    seed(90, 0);
    expect(screen.queryByRole('heading', { name: '休息一下吧！' })).not.toBeInTheDocument();
  });
});
