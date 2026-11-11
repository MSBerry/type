import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProfileProvider } from '../storage/ProfileContext';
import { STORAGE_KEY, defaultStore, saveStore, setupChild } from '../storage/profile';
import Profiles from './Profiles';

describe('Profiles', () => {
  it('列出所有小朋友，点一下就切换并回首页', () => {
    saveStore(localStorage, setupChild(defaultStore(), { nickname: '小刚', grade: 6, avatar: 'blue' }));
    render(
      <ProfileProvider storage={localStorage}>
        <Profiles />
      </ProfileProvider>,
    );
    expect(screen.getByRole('heading', { name: '谁在练习？' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '小刚，6 年级（正在用）' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '小朋友，5 年级' }));
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).activeId).toBe('p1');
    expect(window.location.hash).toBe('#/');
  });

  it('可以去加一个小朋友', () => {
    render(
      <ProfileProvider storage={localStorage}>
        <Profiles />
      </ProfileProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: '＋ 加一个小朋友' }));
    expect(window.location.hash).toBe('#/welcome');
  });
});
