import { useCallback, useEffect, useRef } from 'react';
import type { Session } from '../engine/types';
import { useProfile } from '../storage/ProfileContext';
import { type SfxName, sfx } from './sound';

/** 按档案里的「声音」开关决定响不响 */
export function useSfx() {
  const { profile } = useProfile();
  const on = profile.settings.sound;
  return useCallback(
    (name: SfxName) => {
      if (on) sfx[name]();
    },
    [on],
  );
}

/** 跟着打字会话放声音：按对、按错、打完 */
export function useTypingSounds(session: Session) {
  const play = useSfx();
  const prev = useRef({ right: session.right, wrong: session.wrong, done: session.done });
  useEffect(() => {
    const p = prev.current;
    if (session.done && !p.done) play('cheer');
    else if (session.wrong > p.wrong) play('wrong');
    else if (session.right > p.right) play('key');
    prev.current = { right: session.right, wrong: session.wrong, done: session.done };
  }, [session.right, session.wrong, session.done, play]);
}
