import { fireEvent, render, screen } from '@testing-library/react';
import { Component, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { ProfileProvider, useProfile } from './ProfileContext';
import { STORAGE_KEY, addStars } from './profile';

/** 接住子组件抛出的错误并显示出来（React 19 不会把渲染错误抛给 render()） */
class Catch extends Component<{ children: ReactNode }, { msg: string }> {
  state = { msg: '' };
  static getDerivedStateFromError(e: Error) {
    return { msg: e.message };
  }
  render() {
    return this.state.msg ? <p>{this.state.msg}</p> : this.props.children;
  }
}

function Probe() {
  const { profile, persistent, update } = useProfile();
  return (
    <div>
      <span data-testid="stars">{profile.stars}</span>
      <span data-testid="persistent">{String(persistent)}</span>
      <button type="button" onClick={() => update((p) => addStars(p, 2))}>加星</button>
    </div>
  );
}

describe('ProfileProvider', () => {
  it('更新档案后立即保存到本机', () => {
    render(
      <ProfileProvider storage={localStorage}>
        <Probe />
      </ProfileProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: '加星' }));
    expect(screen.getByTestId('stars')).toHaveTextContent('2');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).profiles[0].stars).toBe(2);
  });

  it('没有存储时照样能用，但标记为不持久', () => {
    render(
      <ProfileProvider storage={null}>
        <Probe />
      </ProfileProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: '加星' }));
    expect(screen.getByTestId('stars')).toHaveTextContent('2');
    expect(screen.getByTestId('persistent')).toHaveTextContent('false');
  });

  it('遇到更新版本的存档时不写入，保住原数据', () => {
    const newer = JSON.stringify({ version: 2, profiles: [] });
    localStorage.setItem(STORAGE_KEY, newer);
    render(
      <ProfileProvider storage={localStorage}>
        <Probe />
      </ProfileProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: '加星' }));
    expect(screen.getByTestId('stars')).toHaveTextContent('2');
    expect(screen.getByTestId('persistent')).toHaveTextContent('false');
    expect(localStorage.getItem(STORAGE_KEY)).toBe(newer);
  });

  it('保存失败时照样能用，并标记为不持久', () => {
    const full = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    } as unknown as Storage;
    render(
      <ProfileProvider storage={full}>
        <Probe />
      </ProfileProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: '加星' }));
    expect(screen.getByTestId('stars')).toHaveTextContent('2');
    expect(screen.getByTestId('persistent')).toHaveTextContent('false');
  });

  it('在 Provider 外面用会报出清楚的错误', () => {
    render(
      <Catch>
        <Probe />
      </Catch>,
    );
    expect(screen.getByText(/ProfileProvider/)).toBeInTheDocument();
  });

  it('档案没有变化时不写存储', () => {
    function NoChange() {
      const { update } = useProfile();
      return (
        <button type="button" onClick={() => update((p) => p)}>
          不变
        </button>
      );
    }
    render(
      <ProfileProvider storage={localStorage}>
        <NoChange />
      </ProfileProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: '不变' }));
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
