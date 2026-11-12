import { FINGER_TINT, type Finger, fingerOf } from '../engine/fingers';

type HandFinger = Exclude<Finger, 'th'>;

/** 左手每根手指的形状（以手掌中心为原点，右手镜像） */
type Shape = { x: number; len: number; w: number; rot: number };
const LEFT_SHAPES: [HandFinger, Shape][] = [
  ['lp', { x: -72, len: 72, w: 34, rot: -16 }],
  ['lr', { x: -36, len: 98, w: 37, rot: -6 }],
  ['lm', { x: 2, len: 110, w: 38, rot: 0 }],
  ['li', { x: 40, len: 94, w: 37, rot: 7 }],
];
const MIRROR: Record<HandFinger, HandFinger> = { lp: 'rp', lr: 'rr', lm: 'rm', li: 'ri', ri: 'li', rm: 'lm', rr: 'lr', rp: 'lp' };

const FINGER_BASE = -78; // 手指根部（掌心上沿）的高度
const HAND_Y = 225; // 手掌中心在画布里的高度
const HANDS = { left: 330, right: 670 };

function tipOf(s: Shape): { x: number; y: number } {
  const r = (s.rot * Math.PI) / 180;
  return { x: s.x + Math.sin(r) * s.len, y: FINGER_BASE - Math.cos(r) * s.len };
}

function FingerShape({ id, s, active }: { id: string; s: Shape; active: boolean }) {
  const tint = FINGER_TINT[fingerOf(id === 'lt' || id === 'rt' ? ' ' : findKeyOf(id))];
  return (
    <g data-hand-finger={id} className={active ? 'kb-hand-finger is-active' : 'kb-hand-finger'}>
      <g transform={`translate(${s.x} ${FINGER_BASE}) rotate(${s.rot})`}>
        <g className="kb-hand-press">
          <rect x={-s.w / 2} y={-s.len} width={s.w} height={s.len + 40} rx={s.w / 2} style={{ fill: active ? undefined : tint }} />
          <rect className="kb-hand-nail" x={-s.w * 0.28} y={-s.len + 7} width={s.w * 0.56} height={s.w * 0.5} rx={s.w * 0.2} />
        </g>
      </g>
    </g>
  );
}

/** 这根手指负责的任意一个键，用来取它的颜色 */
function findKeyOf(f: string): string {
  return { lp: 'a', lr: 's', lm: 'd', li: 'f', ri: 'j', rm: 'k', rr: 'l', rp: ';' }[f] ?? ' ';
}

const THUMB: Shape = { x: 78, len: 78, w: 40, rot: 58 };

function Hand({ side, active }: { side: 'left' | 'right'; active: Finger | null }) {
  const flip = side === 'right';
  const thumbId = flip ? 'rt' : 'lt';
  return (
    <g transform={`translate(${HANDS[side]} ${HAND_Y}) scale(${flip ? -1 : 1} 1)`}>
      {/* 拇指在手掌下面先画，看起来从掌根伸出来 */}
      <g transform="translate(0 52)">
        <FingerShape id={thumbId} s={THUMB} active={active === 'th'} />
      </g>
      <rect className="kb-hand-palm" x={-98} y={-96} width={190} height={170} rx={60} />
      {LEFT_SHAPES.map(([f, s]) => {
        const id = flip ? MIRROR[f] : f;
        return <FingerShape key={id} id={id} s={s} active={active === id} />;
      })}
    </g>
  );
}

/** 要按的键冒在负责的手指头顶上 */
function KeyBubble({ finger, label }: { finger: Finger; label: string }) {
  let x: number;
  let y: number;
  if (finger === 'th') {
    x = 500;
    y = HAND_Y - 10;
  } else {
    const left = finger.startsWith('l');
    const base = left ? finger : MIRROR[finger];
    const shape = LEFT_SHAPES.find(([f]) => f === base)![1];
    const tip = tipOf(shape);
    x = HANDS[left ? 'left' : 'right'] + (left ? tip.x : -tip.x);
    y = HAND_Y + tip.y - 34;
  }
  const w = label.length > 1 ? 84 : 52;
  return (
    <g className="kb-hand-bubble" transform={`translate(${x} ${y})`}>
      <rect x={-w / 2} y={-26} width={w} height={46} rx={14} />
      <text x={0} y={8} textAnchor="middle">
        {label}
      </text>
    </g>
  );
}

/**
 * 键盘下方的一双卡通手。每根手指的颜色和它负责的键一样；
 * 负责下一个键的手指变黄、上下点动，头顶冒出要按的键。
 */
export default function HandsOverlay({ nextKey }: { nextKey: string | null }) {
  const active = nextKey ? fingerOf(nextKey) : null;
  const label = nextKey === ' ' ? '空格' : nextKey?.toUpperCase() ?? '';
  return (
    <svg className="kb-hands" viewBox="150 -25 700 325" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
      <Hand side="left" active={active} />
      <Hand side="right" active={active} />
      <text className="kb-hand-name" x={HANDS.left} y={HAND_Y + 34} textAnchor="middle">
        左手
      </text>
      <text className="kb-hand-name" x={HANDS.right} y={HAND_Y + 34} textAnchor="middle">
        右手
      </text>
      {active && nextKey && <KeyBubble finger={active} label={label} />}
    </svg>
  );
}
