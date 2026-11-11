import { useEffect, useRef } from 'react';

export type TypingHandlers = {
  onLetter: (key: string, now: number) => void;
  /** 检测到中文输入法正在拼写 */
  onIme: () => void;
  /** 窗口失焦 */
  onPause: () => void;
};

export function useTypingInput(enabled: boolean, handlers: TypingHandlers): void {
  const ref = useRef(handlers);
  useEffect(() => {
    ref.current = handlers;
  });

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.isComposing || e.key === 'Process' || e.keyCode === 229) {
        ref.current.onIme();
        return;
      }
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      if (/^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault();
        ref.current.onLetter(e.key, Date.now());
      }
    };
    const onBlur = () => ref.current.onPause();
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('blur', onBlur);
    };
  }, [enabled]);
}
