import { useEffect, useRef } from 'react';
import { tokenStatus } from '../engine/session';
import type { Session } from '../engine/types';
import './Passage.css';

export default function Passage({ session, showPinyin }: { session: Session; showPinyin: boolean }) {
  const currentRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    currentRef.current?.scrollIntoView?.({ block: 'nearest' });
  }, [session.cursor]);

  return (
    <p className="passage" lang="zh-CN">
      {session.tokens.map((t, i) => {
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
      })}
    </p>
  );
}
