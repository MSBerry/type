import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { getBook, getSegment } from '../content/library';
import type { SegmentResult } from '../engine/stats';
import { ProfileProvider } from '../storage/ProfileContext';
import { STORAGE_KEY, defaultStore, saveStore, today } from '../storage/profile';
import Result from './Result';

const RESULT: SegmentResult = {
  bookId: 'xiyouji',
  segmentId: 'c1-1',
  hanzi: 52,
  speed: 24,
  accuracy: 96,
  stars: 3,
  activeMs: 65000,
  keyErrors: { z: 2, h: 1 },
  topErrors: [
    { key: 'z', count: 2 },
    { key: 'h', count: 1 },
  ],
  maxStreak: 0,
};

function renderResult(result: SegmentResult = RESULT) {
  return render(
    <ProfileProvider storage={localStorage} initialResult={result}>
      <Result />
    </ProfileProvider>,
  );
}

function Remount() {
  const [show, setShow] = useState(true);
  return (
    <>
      <button type="button" onClick={() => setShow((s) => !s)}>
        切换
      </button>
      {show && <Result />}
    </>
  );
}

describe('Result', () => {
  it('显示新解锁的奖励，可以马上穿上', () => {
    const store = defaultStore();
    store.profiles[0].skinsOwned = ['classic', 'scarf'];
    store.profiles[0].skinsNew = ['scarf'];
    saveStore(localStorage, store);
    renderResult({ ...RESULT, unlocks: { skins: ['scarf'], badges: ['first'], speedLevel: 1 } });
    expect(screen.getByRole('heading', { name: '获得奖励' })).toBeInTheDocument();
    expect(screen.getByText('红围巾')).toBeInTheDocument();
    expect(screen.getByText('初次上手')).toBeInTheDocument();
    expect(screen.getByText('速度升到「小兔」啦！')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '马上穿上：红围巾' }));
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).profiles[0].skinWorn).toBe('scarf');
    expect(screen.getByText('穿好啦')).toBeInTheDocument();
  });

  it('没有新奖励时不显示奖励区', () => {
    renderResult({ ...RESULT, unlocks: { skins: [], badges: [], speedLevel: null } });
    expect(screen.queryByRole('heading', { name: '获得奖励' })).not.toBeInTheDocument();
  });

  it('答对小考考记到当天，完成全部任务再奖励', () => {
    const store = defaultStore();
    const date = today();
    store.profiles[0].daily[date] = { minutes: 1, chars: 120, segments: 1 };
    saveStore(localStorage, store);
    renderResult();
    fireEvent.click(screen.getByRole('button', { name: '傲来国' }));
    const p = JSON.parse(localStorage.getItem(STORAGE_KEY)!).profiles[0];
    expect(p.daily[date].quizRight).toBe(1);
    expect(p.stars).toBe(4);
  });

  it('离开再回到结算页，不能再答一次刷星星', () => {
    render(
      <ProfileProvider storage={localStorage} initialResult={RESULT}>
        <Remount />
      </ProfileProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: '傲来国' }));
    fireEvent.click(screen.getByRole('button', { name: '切换' }));
    fireEvent.click(screen.getByRole('button', { name: '切换' }));
    expect(screen.getByText('答对啦！星星 +1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '傲来国' }));
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).profiles[0].stars).toBe(1);
  });

  it('答完后对错不只靠颜色，有对勾和叉', () => {
    renderResult();
    fireEvent.click(screen.getByRole('button', { name: '车迟国' }));
    expect(screen.getByText('✓')).toBeInTheDocument();
    expect(screen.getByText('✗')).toBeInTheDocument();
  });

  it('显示夸奖、星星和四项成绩', () => {
    renderResult();
    expect(screen.getByRole('heading', { name: '太棒了，小朋友！' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '3 颗星' })).toBeInTheDocument();
    expect(screen.getByTestId('stat-speed')).toHaveTextContent('24');
    expect(screen.getByTestId('stat-acc')).toHaveTextContent('96%');
    expect(screen.getByTestId('stat-time')).toHaveTextContent('1:05');
    expect(screen.getByTestId('stat-chars')).toHaveTextContent('52');
  });

  it('列出要多练的键', () => {
    renderResult();
    expect(screen.getByText('Z')).toBeInTheDocument();
    expect(screen.getByText('错 2 次')).toBeInTheDocument();
  });

  it('小考考答对多给 1 颗星，只能答一次', () => {
    renderResult();
    fireEvent.click(screen.getByRole('button', { name: '傲来国' }));
    expect(screen.getByText('答对啦！星星 +1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '女儿国' }));
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).profiles[0].stars).toBe(1);
  });

  it('答错时告诉正确答案', () => {
    renderResult();
    fireEvent.click(screen.getByRole('button', { name: '车迟国' }));
    expect(screen.getByText('再想想～正确答案是「傲来国」')).toBeInTheDocument();
  });

  it('下一段按钮去这本书的下一段', () => {
    renderResult();
    fireEvent.click(screen.getByRole('button', { name: '下一段 →' }));
    expect(window.location.hash).toBe('#/practice/xiyouji/c1-2');
  });

  it('最后一段时改成回读书岛', () => {
    const segs = getBook('xiyouji')!.segments;
    renderResult({ ...RESULT, segmentId: segs[segs.length - 1].id });
    fireEvent.click(screen.getByRole('button', { name: '这本读完啦，回读书岛' }));
    expect(window.location.hash).toBe('#/books');
  });

  it('没有成绩时引导去读书岛', () => {
    render(
      <ProfileProvider storage={localStorage}>
        <Result />
      </ProfileProvider>,
    );
    expect(screen.getByText('还没有成绩哦')).toBeInTheDocument();
  });
  it('选项顺序打乱后，判对错仍然按原来的正确答案', () => {
    // 用一段带小考考的真实段落；无论选项怎么排，点正确答案的文字就算对
    const seg = getSegment('xiyouji', 'c1-1')!;
    renderResult({ ...RESULT, segmentId: seg.id });
    fireEvent.click(screen.getByRole('button', { name: seg.quiz!.options[seg.quiz!.answer] }));
    expect(screen.getByText('答对啦！星星 +1')).toBeInTheDocument();
  });
});
