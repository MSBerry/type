import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProfileProvider } from '../storage/ProfileContext';
import { STORAGE_KEY, defaultStore, exportStore, saveStore, setupChild, today } from '../storage/profile';
import Parent from './Parent';

const saved = () => JSON.parse(localStorage.getItem(STORAGE_KEY)!);
const renderParent = () =>
  render(
    <ProfileProvider storage={localStorage}>
      <Parent rng={() => 0} />
    </ProfileProvider>,
  );
const unlock = () => {
  fireEvent.change(screen.getByLabelText('答案'), { target: { value: '20' } });
  fireEvent.click(screen.getByRole('button', { name: '进入' }));
};

// jsdom 没有 URL.createObjectURL / revokeObjectURL，测试里临时装上，测完拿掉
const originalUrl = { create: URL.createObjectURL, revoke: URL.revokeObjectURL };

describe('Parent', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    const u = URL as unknown as Record<string, unknown>;
    if (originalUrl.create) u.createObjectURL = originalUrl.create;
    else delete u.createObjectURL;
    if (originalUrl.revoke) u.revokeObjectURL = originalUrl.revoke;
    else delete u.revokeObjectURL;
  });

  it('先做一道加法题才能进', () => {
    renderParent();
    expect(screen.getByText('10 + 10 = ?')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('答案'), { target: { value: '19' } });
    fireEvent.click(screen.getByRole('button', { name: '进入' }));
    expect(screen.getByText('不对哦，换一道题再试试')).toBeInTheDocument();
    unlock();
    expect(screen.getByRole('heading', { name: '家长中心' })).toBeInTheDocument();
  });

  it('看到近 7 天和易错键', () => {
    const store = defaultStore();
    store.profiles[0].daily[today()] = { minutes: 12, chars: 300 };
    store.profiles[0].keyErrors = { s: 7, k: 3 };
    saveStore(localStorage, store);
    renderParent();
    unlock();
    expect(screen.getByRole('heading', { name: '近 7 天' })).toBeInTheDocument();
    expect(screen.getByText('300')).toBeInTheDocument();
    expect(screen.getByText('S × 7')).toBeInTheDocument();
  });

  it('改每日时长和声音，马上保存', () => {
    renderParent();
    unlock();
    fireEvent.change(screen.getByLabelText('每天练习时长'), { target: { value: '30' } });
    fireEvent.click(screen.getByRole('button', { name: '声音：开' }));
    expect(saved().profiles[0].settings).toMatchObject({ dailyLimitMin: 30, sound: false });
  });

  it('可以切换小朋友、去加小朋友', () => {
    saveStore(localStorage, setupChild(defaultStore(), { nickname: '小刚', grade: 6, avatar: 'blue' }));
    renderParent();
    unlock();
    fireEvent.click(screen.getByRole('button', { name: '看小朋友的' }));
    expect(saved().activeId).toBe('p1');
    fireEvent.click(screen.getByRole('button', { name: '＋ 加一个小朋友' }));
    expect(window.location.hash).toBe('#/welcome');
  });

  it('导出备份：下载一个 JSON 文件', () => {
    // 组件 1 秒后才 revoke，用假计时器免得它在测试结束后才跑
    vi.useFakeTimers();
    const create = vi.fn(() => 'blob:x');
    URL.createObjectURL = create;
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    renderParent();
    unlock();
    fireEvent.click(screen.getByRole('button', { name: '导出备份' }));
    expect(create).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
  });

  it('导入备份：成功就替换，失败就说原因、不动现有数据', async () => {
    saveStore(localStorage, defaultStore());
    renderParent();
    unlock();
    const input = screen.getByLabelText('导入备份');

    fireEvent.change(input, { target: { files: [new File(['oops'], 'bad.json', { type: 'application/json' })] } });
    expect(await screen.findByText('这不是小键盘大冒险的备份文件（读不出内容）')).toBeInTheDocument();
    expect(saved().profiles).toHaveLength(1);

    const backup = exportStore(setupChild(defaultStore(), { nickname: '小刚', grade: 6, avatar: 'blue' }));
    fireEvent.change(input, { target: { files: [new File([backup], 'good.json', { type: 'application/json' })] } });
    expect(await screen.findByText('已恢复 2 个小朋友的进度')).toBeInTheDocument();
    expect(saved().profiles).toHaveLength(2);
  });
});
