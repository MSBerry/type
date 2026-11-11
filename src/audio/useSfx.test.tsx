import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSession, press } from '../engine/session';
import type { Session, Token } from '../engine/types';
import { ProfileProvider } from '../storage/ProfileContext';
import { defaultStore, saveStore } from '../storage/profile';
import { sfx } from './sound';
import { useTypingSounds } from './useSfx';

const TOKENS: Token[] = [
  { kind: 'hanzi', char: '大', key: 'da', tone: 'dà' },
];

function Probe({ session }: { session: Session }) {
  useTypingSounds(session);
  return null;
}

function setup(sound = true) {
  const store = defaultStore();
  store.profiles[0].settings.sound = sound;
  saveStore(localStorage, store);
  const s0 = createSession(TOKENS);
  const ui = (s: Session) => (
    <ProfileProvider storage={localStorage}>
      <Probe session={s} />
    </ProfileProvider>
  );
  const view = render(ui(s0));
  return { s0, rerender: (s: Session) => view.rerender(ui(s)) };
}

describe('useTypingSounds', () => {
  afterEach(() => vi.restoreAllMocks());

  it('按对、按错、打完各有声音', () => {
    const key = vi.spyOn(sfx, 'key').mockImplementation(() => undefined);
    const wrong = vi.spyOn(sfx, 'wrong').mockImplementation(() => undefined);
    const cheer = vi.spyOn(sfx, 'cheer').mockImplementation(() => undefined);
    const { s0, rerender } = setup();
    const s1 = press(s0, 'x', 1000).session;
    rerender(s1);
    expect(wrong).toHaveBeenCalledTimes(1);
    const s2 = press(s1, 'd', 1100).session;
    rerender(s2);
    expect(key).toHaveBeenCalledTimes(1);
    const s3 = press(s2, 'a', 1200).session;
    rerender(s3);
    expect(cheer).toHaveBeenCalledTimes(1);
    expect(key).toHaveBeenCalledTimes(1);
  });

  it('声音关掉就不响', () => {
    const wrong = vi.spyOn(sfx, 'wrong').mockImplementation(() => undefined);
    const { s0, rerender } = setup(false);
    rerender(press(s0, 'x', 1000).session);
    expect(wrong).not.toHaveBeenCalled();
  });

  it('没有 Web Audio 的浏览器里调用也不会出错', () => {
    expect(() => sfx.key()).not.toThrow();
  });
});
