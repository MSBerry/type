import { useEffect, useRef } from 'react';
import { tokenStatus } from '../engine/session';
import type { Session, Token } from '../engine/types';
import './Passage.css';

type Item = { token: Token; index: number };

/** 把标点和前一个字放在一组，换行时不会分开 */
function toUnits(tokens: Token[]): Item[][] {
  const units: Item[][] = [];
  tokens.forEach((token, index) => {
    if (token.kind === 'skip' && units.length > 0) units[units.length - 1].push({ token, index });
    else units.push([{ token, index }]);
  });
  return units;
}

export default function Passage({ session, showPinyin }: { session: Session; showPinyin: boolean }) {
  const currentRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    currentRef.current?.scrollIntoView?.({ block: 'nearest' });
  }, [session.cursor]);

  const renderItem = ({ token: t, index: i }: Item) => {
    const st = tokenStatus(session, i);
    if (t.kind === 'skip') {
      return (
        <span key={i} className={`pg-skip is-${st}`}>
          {t.char}
        </span>
      );
    }
    const py = st === 'current' || showPinyin ? t.tone : '';
    return (
      <span
        key={i}
        ref={st === 'current' ? currentRef : undefined}
        className={`pg-cell is-${st}`}
        aria-current={st === 'current' ? 'true' : undefined}
      >
        <span className="pg-py">{py}</span>
        <span className="pg-ch">{t.char}</span>
      </span>
    );
  };

  return (
    <p className="passage" lang="zh-CN">
      {toUnits(session.tokens).map((unit) => (
        <span key={unit[0].index} className="pg-unit">
          {unit.map(renderItem)}
        </span>
      ))}
    </p>
  );
}
