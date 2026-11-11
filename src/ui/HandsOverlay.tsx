import { type Finger, fingerOf } from '../engine/fingers';

export type KeyBox = { x: number; y: number; w: number; h: number };

type HomeFinger = Exclude<Finger, 'th'>;

/** 每根手指平时放在哪个键上（基准键位） */
const HOME: Record<HomeFinger, string> = { lp: 'a', lr: 's', lm: 'd', li: 'f', ri: 'j', rm: 'k', rr: 'l', rp: ';' };
const LEFT: HomeFinger[] = ['lp', 'lr', 'lm', 'li'];
const RIGHT: HomeFinger[] = ['ri', 'rm', 'rr', 'rp'];

const SKIN = '#F2C4A0';
const INK = '#1F2A44';

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * 盖在屏幕键盘上的半透明双手。手指平时搭在基准键上；
 * 负责下一个键的手指会变黄，并反复「伸过去、按下、收回」，告诉孩子往哪个方向伸。
 */
export default function HandsOverlay({ boxes, nextKey }: { boxes: Record<string, KeyBox>; nextKey: string | null }) {
  const space = boxes[' '];
  if (!space || LEFT.concat(RIGHT).some((f) => !boxes[HOME[f]])) return null;

  const keyW = boxes.f.w;
  const keyH = boxes.f.h;
  const fingerW = Math.max(10, keyW * 0.42);
  const baseY = space.y - space.h * 0.75;
  const palmBottom = space.y + space.h * 0.5;
  const active = nextKey ? fingerOf(nextKey) : null;
  const target = nextKey ? boxes[nextKey] : undefined;
  const still = prefersReducedMotion();

  const finger = (f: HomeFinger) => {
    const home = boxes[HOME[f]];
    const isActive = f === active && target !== undefined;
    const reaches = isActive && (target.x !== home.x || target.y !== home.y);
    const tip = isActive && still ? target : home;
    return (
      <g key={f} data-hand-finger={f} className={isActive ? 'kb-hand-finger is-active' : 'kb-hand-finger'}>
        <line x1={home.x} y1={baseY} x2={tip.x} y2={tip.y} strokeWidth={fingerW} strokeLinecap="round">
          {isActive && !still && reaches && (
            <>
              <animate attributeName="x2" values={`${home.x};${target.x};${target.x};${home.x}`} keyTimes="0;0.35;0.7;1" dur="1.6s" repeatCount="indefinite" />
              <animate attributeName="y2" values={`${home.y};${target.y};${target.y};${home.y}`} keyTimes="0;0.35;0.7;1" dur="1.6s" repeatCount="indefinite" />
            </>
          )}
          {isActive && !still && !reaches && (
            <animate attributeName="stroke-width" values={`${fingerW};${fingerW * 1.25};${fingerW}`} dur="0.9s" repeatCount="indefinite" />
          )}
        </line>
      </g>
    );
  };

  const palm = (fingers: HomeFinger[]) => {
    const xs = fingers.map((f) => boxes[HOME[f]].x);
    const left = Math.min(...xs) - keyW * 0.45;
    const right = Math.max(...xs) + keyW * 0.45;
    return <rect className="kb-hand-palm" x={left} y={baseY - keyH * 0.1} width={right - left} height={palmBottom - baseY + keyH * 0.1} rx={keyW * 0.5} />;
  };

  const thumbsActive = active === 'th';
  const leftThumbFrom = { x: boxes.f.x + keyW * 0.2, y: baseY + keyH * 0.25 };
  const rightThumbFrom = { x: boxes.j.x - keyW * 0.2, y: baseY + keyH * 0.25 };
  const thumb = (id: 'lt' | 'rt', from: { x: number; y: number }, toX: number) => (
    <g key={id} data-hand-finger={id} className={thumbsActive ? 'kb-hand-finger is-active' : 'kb-hand-finger'}>
      <line x1={from.x} y1={from.y} x2={toX} y2={space.y} strokeWidth={fingerW} strokeLinecap="round" />
    </g>
  );

  const reachHome = active && active !== 'th' ? boxes[HOME[active]] : undefined;
  const showArrow = target && reachHome && (target.x !== reachHome.x || target.y !== reachHome.y);

  return (
    <svg className="kb-hands" aria-hidden="true" style={{ ['--hand-skin' as string]: SKIN, ['--hand-ink' as string]: INK }}>
      {palm(LEFT)}
      {palm(RIGHT)}
      {thumb('lt', leftThumbFrom, space.x - space.w * 0.2)}
      {thumb('rt', rightThumbFrom, space.x + space.w * 0.2)}
      {LEFT.concat(RIGHT)
        .filter((f) => f !== active)
        .map(finger)}
      {showArrow && (
        <line className="kb-hand-arrow" x1={reachHome.x} y1={reachHome.y} x2={target.x} y2={target.y} strokeWidth={3} strokeDasharray="6 6" />
      )}
      {target && active && active !== 'th' && (
        <circle className="kb-hand-target" cx={target.x} cy={target.y} r={Math.min(keyW, keyH) * 0.5}>
          {!still && <animate attributeName="r" values={`${keyH * 0.35};${keyH * 0.6};${keyH * 0.35}`} dur="1.6s" repeatCount="indefinite" />}
        </circle>
      )}
      {active && active !== 'th' && finger(active)}
    </svg>
  );
}
