import { useLayoutEffect, useRef, useState } from 'react';
import { FINGER_TINT, HOME_KEYS, KEY_ROWS, fingerOf } from '../engine/fingers';
import HandsOverlay, { type KeyBox } from './HandsOverlay';
import './Keyboard.css';

type Props = { nextKey: string | null; wrongKey: string | null; wrongTick?: number; showHands?: boolean };

/** 量出每个键相对键盘左上角的中心位置，窗口大小变化时重新量 */
function useKeyBoxes(enabled: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const [boxes, setBoxes] = useState<Record<string, KeyBox>>({});
  useLayoutEffect(() => {
    const el = ref.current;
    if (!enabled || !el) return;
    const measure = () => {
      const base = el.getBoundingClientRect();
      const next: Record<string, KeyBox> = {};
      el.querySelectorAll<HTMLElement>('[data-key]').forEach((k) => {
        const r = k.getBoundingClientRect();
        // 去掉「下一个键」上浮的 5px，让手指对准键的原位
        const lift = k.classList.contains('is-next') ? 5 : 0;
        next[k.dataset.key ?? ''] = { x: r.left - base.left + r.width / 2, y: r.top - base.top + r.height / 2 + lift, w: r.width, h: r.height };
      });
      setBoxes(next);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [enabled]);
  return { ref, boxes };
}

/** 每排左右留白，让三排键一样宽、错开排列，像真键盘 */
const ROW_PAD: [string, string][] = [
  ['0%', '6%'],
  ['2.5%', '3.5%'],
  ['5%', '1%'],
];

export default function Keyboard({ nextKey, wrongKey, wrongTick = 0, showHands = false }: Props) {
  const { ref, boxes } = useKeyBoxes(showHands);
  return (
    <div className="kb" aria-hidden="true" ref={ref}>
      {KEY_ROWS.map((row, r) => (
        <div className="kb-row" key={r} style={{ paddingLeft: ROW_PAD[r][0], paddingRight: ROW_PAD[r][1] }}>
          {row.map((k) => {
            const isWrong = k === wrongKey && k !== nextKey;
            const cls = ['kb-key', k === nextKey ? 'is-next' : '', isWrong ? 'is-wrong' : ''].filter(Boolean).join(' ');
            return (
              <div key={isWrong ? `${k}-${wrongTick}` : k} className={cls} data-key={k} style={{ background: FINGER_TINT[fingerOf(k)] }}>
                <span>{k.toUpperCase()}</span>
                {HOME_KEYS.includes(k) && <span className="kb-bump" data-testid={`bump-${k}`} />}
              </div>
            );
          })}
        </div>
      ))}
      <div className="kb-row kb-space-row">
        <div className="kb-key kb-space" data-key=" ">
          空格
        </div>
      </div>
      {showHands && <HandsOverlay boxes={boxes} nextKey={nextKey} />}
    </div>
  );
}
