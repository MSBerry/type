import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProfileProvider } from '../storage/ProfileContext';
import { STORAGE_KEY, defaultStore, saveStore } from '../storage/profile';
import Welcome from './Welcome';

const saved = () => JSON.parse(localStorage.getItem(STORAGE_KEY)!);
const wrap = (mode: 'first' | 'add') =>
  render(
    <ProfileProvider storage={localStorage}>
      <Welcome mode={mode} />
    </ProfileProvider>,
  );

describe('Welcome', () => {
  it('第一次打开：三步建档', () => {
    wrap('first');
    expect(screen.getByRole('heading', { name: '欢迎来到小键盘大冒险！' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '第 1 步：选一个头像' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '头像：薄荷绿' }));
    fireEvent.click(screen.getByRole('button', { name: '下一步' }));

    expect(screen.getByRole('button', { name: '下一步' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('你叫什么名字？'), { target: { value: ' 小红 ' } });
    fireEvent.click(screen.getByRole('button', { name: '下一步' }));

    expect(screen.getByRole('button', { name: '开始冒险！' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '四年级' }));
    fireEvent.click(screen.getByRole('button', { name: '开始冒险！' }));

    const store = saved();
    expect(store.setupDone).toBe(true);
    expect(store.profiles).toHaveLength(1);
    expect(store.profiles[0]).toMatchObject({ nickname: '小红', grade: 4, avatar: 'mint' });
    expect(window.location.hash).toBe('#/');
  });

  it('可以回到上一步', () => {
    wrap('first');
    fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    fireEvent.click(screen.getByRole('button', { name: '上一步' }));
    expect(screen.getByRole('heading', { name: '第 1 步：选一个头像' })).toBeInTheDocument();
  });

  it('加一个小朋友：新建档案并切换过去，可以取消', () => {
    saveStore(localStorage, defaultStore());
    wrap('add');
    expect(screen.getByRole('heading', { name: '加一个小朋友' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    fireEvent.change(screen.getByLabelText('你叫什么名字？'), { target: { value: '小刚' } });
    fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    fireEvent.click(screen.getByRole('button', { name: '六年级' }));
    fireEvent.click(screen.getByRole('button', { name: '开始冒险！' }));
    const store = saved();
    expect(store.profiles).toHaveLength(2);
    expect(store.activeId).toBe('p2');
  });

  it('加一个小朋友时有取消按钮，第一次打开时没有', () => {
    saveStore(localStorage, defaultStore());
    wrap('add');
    fireEvent.click(screen.getByRole('button', { name: '← 取消' }));
    expect(window.location.hash).toBe('#/profiles');
  });
});
