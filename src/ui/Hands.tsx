import { FINGER_TINT, type Finger } from '../engine/fingers';
import './Keyboard.css';

type Slot = { id: string; finger: Finger; h: number };

const LEFT: Slot[] = [
  { id: 'lp', finger: 'lp', h: 50 },
  { id: 'lr', finger: 'lr', h: 68 },
  { id: 'lm', finger: 'lm', h: 78 },
  { id: 'li', finger: 'li', h: 68 },
  { id: 'lt', finger: 'th', h: 40 },
];
const RIGHT: Slot[] = [
  { id: 'rt', finger: 'th', h: 40 },
  { id: 'ri', finger: 'ri', h: 68 },
  { id: 'rm', finger: 'rm', h: 78 },
  { id: 'rr', finger: 'rr', h: 68 },
  { id: 'rp', finger: 'rp', h: 50 },
];

export default function Hands({ finger }: { finger: Finger | null }) {
  const hand = (slots: Slot[], name: string) => (
    <div className="hand">
      <div className="hand-fingers">
        {slots.map((s) => (
          <div
            key={s.id}
            data-finger={s.id}
            className={s.finger === finger ? 'finger is-on' : 'finger'}
            style={{ height: s.h, background: FINGER_TINT[s.finger] }}
          />
        ))}
      </div>
      <div className="palm">{name}</div>
    </div>
  );
  return (
    <div className="hands" aria-hidden="true">
      {hand(LEFT, '左手')}
      {hand(RIGHT, '右手')}
    </div>
  );
}
