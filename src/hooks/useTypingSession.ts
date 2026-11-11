import { useCallback, useEffect, useState } from 'react';
import { createSession, pause, press } from '../engine/session';
import type { Token } from '../engine/types';
import { useTypingInput } from './useTypingInput';

export const IDLE_PAUSE_MS = 10_000;

/** 一次打字练习：接键盘、识别中文输入法、失焦和 10 秒不按键时暂停 */
export function useTypingSession(tokens: Token[]) {
  const [session, setSession] = useState(() => createSession(tokens));
  const [imeWarn, setImeWarn] = useState(false);
  const [paused, setPaused] = useState(false);

  const onLetter = useCallback((key: string, now: number) => {
    setImeWarn(false);
    setPaused(false);
    setSession((s) => press(s, key, now).session);
  }, []);
  const onIme = useCallback(() => setImeWarn(true), []);
  const onPause = useCallback(() => {
    setSession((s) => pause(s));
    setPaused(true);
  }, []);
  useTypingInput(!session.done, { onLetter, onIme, onPause });

  useEffect(() => {
    if (session.done || session.lastPressAt === null) return;
    const t = window.setTimeout(onPause, IDLE_PAUSE_MS);
    return () => window.clearTimeout(t);
  }, [session.lastPressAt, session.done, onPause]);

  const restart = useCallback(() => {
    setSession(createSession(tokens));
    setPaused(false);
    setImeWarn(false);
  }, [tokens]);

  return { session, imeWarn, paused, restart };
}
