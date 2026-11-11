import { type MouseEvent, useEffect, useRef } from 'react';
import { FINGER_NAME, fingerOf } from '../engine/fingers';
import { currentToken, expectedKey } from '../engine/session';
import { accuracy, speedCpm, starsFor } from '../engine/stats';
import type { Token } from '../engine/types';
import { useTypingSession } from '../hooks/useTypingSession';
import { type Route, navigate } from '../router';
import Keyboard from '../ui/Keyboard';
import Passage from '../ui/Passage';
import ProgressBar from '../ui/ProgressBar';
import StarRow from '../ui/StarRow';
import WornMascot from '../ui/WornMascot';
import { coachMessage } from './coach';
import './Practice.css';

export type DrillResult = { count: number; accuracy: number; speed: number; stars: 1 | 2 | 3; activeMs: number };

type Props = {
  title: string;
  tokens: Token[];
  /** 进度和速度的单位：键 或 字 */
  unit: string;
  back: { label: string; route: Route };
  onFinish: (r: DrillResult) => void;
  /** 「再来一次」和「重来」：由外面重新出题 */
  onRestart: () => void;
  onNext?: () => void;
  /** 完成卡片上的说明，比如「过关啦！」 */
  note?: string;
};

const keepFocus = (e: MouseEvent) => e.preventDefault();

/** 指法训练营和拼音快打共用的练习页 */
export default function Drill({ title, tokens, unit, back, onFinish, onRestart, onNext, note }: Props) {
  const { session, imeWarn, paused } = useTypingSession(tokens);
  const reported = useRef(false);

  useEffect(() => {
    if (!session.done || reported.current) return;
    reported.current = true;
    const acc = accuracy(session);
    onFinish({ count: session.cursor, accuracy: acc, speed: speedCpm(session), stars: starsFor(acc), activeMs: session.activeMs });
  }, [session, onFinish]);

  const cur = currentToken(session);
  const next = expectedKey(session);
  const finger = next ? fingerOf(next) : null;
  const acc = accuracy(session);
  const typed = session.right + session.wrong;
  const total = session.hanziIdx.length;

  return (
    <main className="page practice-page">
      <div className="page-inner practice-inner">
        <header className="row practice-header">
          <button type="button" className="btn" onClick={() => navigate(back.route)}>
            {back.label}
          </button>
          <h1 className="chip practice-book">
            <span className="practice-book-title">{title}</span>
          </h1>
          <div className="practice-progress">
            <ProgressBar value={(session.cursor * 100) / Math.max(1, total)} label="进度" height={22} />
            <b className="latin">
              {session.cursor} / {total} {unit}
            </b>
          </div>
          <span className="chip">
            速度 <b className="latin">{speedCpm(session)}</b> {unit}/分
          </span>
          <span className="chip">
            正确率 <b className="latin">{acc}%</b>
          </span>
          <span className="chip">
            <StarRow count={typed === 0 ? 3 : starsFor(acc)} />
          </span>
          <button type="button" className="btn" onMouseDown={keepFocus} onClick={onRestart} aria-label="重新开始">
            重来
          </button>
        </header>

        {(imeWarn || (paused && !session.done)) && (
          <div className="practice-banners">
            {imeWarn && (
              <div role="alert" className="banner">
                好像开着中文输入法～按一下 Shift 切换成英文，再接着打。
              </div>
            )}
            {paused && !session.done && (
              <div role="status" className="banner banner-soft">
                休息一下～按任意字母就继续。
              </div>
            )}
          </div>
        )}

        <div className="practice-body">
          <div className="practice-left">
            <section className="card practice-passage" aria-label="练习内容">
              <Passage session={session} showPinyin />
            </section>
            <section className="card practice-keyboard" aria-label="键盘提示">
              <Keyboard nextKey={next} wrongKey={session.lastWrongKey} wrongTick={session.wrong} showHands />
            </section>
          </div>

          <aside className="practice-side">
            {cur && next ? (
              <div className="card now-card">
                <div className="now-label">现在按这个</div>
                <div className="row now-row">
                  <div className="now-char">{cur.char}</div>
                  {cur.tone && <div className="now-tone">{cur.tone}</div>}
                </div>
                <div className="now-letters">
                  {[...cur.key].map((letter, j) => (
                    <span
                      key={j}
                      className={j < session.pos ? 'now-letter is-done' : j === session.pos ? 'now-letter is-next' : 'now-letter'}
                    >
                      {letter}
                    </span>
                  ))}
                </div>
                <p className="now-finger">
                  用 <b>{finger ? FINGER_NAME[finger] : ''}</b> 按 <b className="latin">{next.toUpperCase()}</b> 键
                </p>
              </div>
            ) : (
              <div className="card done-card">
                <StarRow count={starsFor(acc)} size={56} />
                <h2 className="display">完成啦！</h2>
                {note && <p className="done-new">{note}</p>}
                <p>
                  速度 {speedCpm(session)} {unit}/分 · 正确率 {acc}%
                </p>
                {onNext && (
                  <button type="button" className="btn btn-primary" onClick={onNext}>
                    下一关 →
                  </button>
                )}
                <button type="button" className={onNext ? 'btn' : 'btn btn-primary'} onClick={onRestart}>
                  再来一次
                </button>
              </div>
            )}
            <div className="practice-coach">
              <WornMascot size={86} mood={session.lastWrongKey ? 'oops' : 'happy'} />
              <p className="coach-bubble" aria-live="polite">
                {coachMessage(session)}
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
