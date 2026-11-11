import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { type TypingHandlers, useTypingInput } from './useTypingInput';

function Harness({ enabled, h }: { enabled: boolean; h: TypingHandlers }) {
  useTypingInput(enabled, h);
  return null;
}

function setup(enabled = true) {
  const h = { onLetter: vi.fn(), onIme: vi.fn(), onPause: vi.fn() };
  render(<Harness enabled={enabled} h={h} />);
  return h;
}

describe('useTypingInput', () => {
  it('字母键交给 onLetter', () => {
    const h = setup();
    fireEvent.keyDown(window, { key: 'a' });
    fireEvent.keyDown(window, { key: 'Z' });
    expect(h.onLetter).toHaveBeenNthCalledWith(1, 'a', expect.any(Number));
    expect(h.onLetter).toHaveBeenNthCalledWith(2, 'Z', expect.any(Number));
  });

  it('数字、功能键、组合键都不管', () => {
    const h = setup();
    fireEvent.keyDown(window, { key: '1' });
    fireEvent.keyDown(window, { key: 'Enter' });
    fireEvent.keyDown(window, { key: 'a', ctrlKey: true });
    fireEvent.keyDown(window, { key: 'a', metaKey: true });
    expect(h.onLetter).not.toHaveBeenCalled();
  });

  it('按住一个键不放时只算一次', () => {
    const h = setup();
    fireEvent.keyDown(window, { key: 'a' });
    fireEvent.keyDown(window, { key: 'a', repeat: true });
    expect(h.onLetter).toHaveBeenCalledTimes(1);
  });

  it('识别中文输入法正在拼写', () => {
    const h = setup();
    fireEvent.keyDown(window, { key: 'Process' });
    fireEvent.keyDown(window, { key: 'h', isComposing: true });
    fireEvent.keyDown(window, { key: 'h', keyCode: 229 });
    expect(h.onIme).toHaveBeenCalledTimes(3);
    expect(h.onLetter).not.toHaveBeenCalled();
  });

  it('窗口失焦时暂停', () => {
    const h = setup();
    fireEvent.blur(window);
    expect(h.onPause).toHaveBeenCalledTimes(1);
  });

  it('关闭时什么都不监听', () => {
    const h = setup(false);
    fireEvent.keyDown(window, { key: 'a' });
    expect(h.onLetter).not.toHaveBeenCalled();
  });
});
