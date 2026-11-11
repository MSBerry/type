import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getSegment } from '../content/library';
import { ProfileProvider } from '../storage/ProfileContext';
import { STORAGE_KEY, defaultStore, saveStore } from '../storage/profile';
import Practice, { IDLE_PAUSE_MS } from './Practice';

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

describe('Practice 的计时和重打', () => {
  const saved = () => JSON.parse(localStorage.getItem(STORAGE_KEY)!).profiles[0];

  it('打完时解锁奖励，就算不进结算页也已保存', () => {
    const store = defaultStore();
    store.profiles[0].totalChars = 480;
    saveStore(localStorage, store);
    renderPractice();
    typeKeys(lettersOf('c1-1'));
    expect(saved().skinsOwned).toContain('scarf');
    expect(saved().skinsNew).toContain('scarf');
    expect(saved().badges).toContain('first');
    expect(screen.getByText('有新奖励等你领！')).toBeInTheDocument();
  });

  it('键宝穿着选好的皮肤', () => {
    const store = defaultStore();
    store.profiles[0].skinsOwned = ['classic', 'mint'];
    store.profiles[0].skinWorn = 'mint';
    saveStore(localStorage, store);
    const { container } = renderPractice();
    expect(container.querySelector('[data-part="body"]')).toHaveAttribute('fill', '#34C38F');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('10 秒不按键自动暂停', () => {
    vi.useFakeTimers();
    renderPractice();
    typeKeys('h');
    act(() => {
      vi.advanceTimersByTime(IDLE_PAUSE_MS);
    });
    expect(screen.getByRole('status')).toHaveTextContent('休息一下');
  });

  it('窗口失焦期间的时间不计入打字时长', () => {
    vi.useFakeTimers();
    renderPractice();
    const letters = lettersOf('c1-1');
    typeKeys(letters[0]);
    fireEvent.blur(window);
    vi.setSystemTime(Date.now() + 60_000);
    typeKeys(letters.slice(1));
    const day = Object.values(saved().daily)[0] as { minutes: number };
    expect(day.minutes).toBe(0);
  });

  it('再打一次也会记录成绩', () => {
    renderPractice();
    typeKeys(lettersOf('c1-1'));
    fireEvent.click(screen.getByRole('button', { name: '再打一次' }));
    typeKeys(lettersOf('c1-1'));
    expect(saved().totalChars).toBe(104);
  });

  it('按错时键宝换成担心的表情', () => {
    renderPractice();
    typeKeys('x');
    expect(screen.getByRole('img', { name: '键宝' })).toHaveAttribute('data-mood', 'oops');
  });

  it('有中文语音时可以听一听这一段', () => {
    const speakFn = vi.fn();
    vi.stubGlobal('speechSynthesis', {
      getVoices: () => [{ lang: 'zh-CN', name: 'Tingting' }],
      speak: speakFn,
      cancel: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    vi.stubGlobal(
      'SpeechSynthesisUtterance',
      class {
        text: string;
        voice: unknown = null;
        lang = '';
        rate = 1;
        constructor(text: string) {
          this.text = text;
        }
      },
    );
    renderPractice();
    fireEvent.click(screen.getByRole('button', { name: '听一听' }));
    expect(speakFn).toHaveBeenCalledTimes(1);
    expect(speakFn.mock.calls[0][0].text.length).toBeGreaterThan(10);
  });

  it('没有中文语音时不显示听一听', () => {
    renderPractice();
    expect(screen.queryByRole('button', { name: '听一听' })).not.toBeInTheDocument();
  });
});
