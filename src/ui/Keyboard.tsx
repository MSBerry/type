import { FINGER_TINT, HOME_KEYS, KEY_ROWS, fingerOf } from '../engine/fingers';
import './Keyboard.css';

type Props = { nextKey: string | null; wrongKey: string | null };

/** 每排左右留白，让三排键一样宽、错开排列，像真键盘 */
const ROW_PAD: [string, string][] = [
  ['0%', '6%'],
  ['2.5%', '3.5%'],
  ['5%', '1%'],
];

export default function Keyboard({ nextKey, wrongKey }: Props) {
  return (
    <div className="kb" aria-hidden="true">
      {KEY_ROWS.map((row, r) => (
        <div className="kb-row" key={r} style={{ paddingLeft: ROW_PAD[r][0], paddingRight: ROW_PAD[r][1] }}>
          {row.map((k) => {
            const cls = ['kb-key', k === nextKey ? 'is-next' : '', k === wrongKey && k !== nextKey ? 'is-wrong' : '']
              .filter(Boolean)
              .join(' ');
            return (
              <div key={k} className={cls} data-key={k} style={{ background: FINGER_TINT[fingerOf(k)] }}>
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
    </div>
  );
}
