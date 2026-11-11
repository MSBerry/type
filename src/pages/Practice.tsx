import { type MouseEvent, useEffect, useRef } from 'react';
import { speak, stopSpeaking, useChineseVoice } from '../audio/speech';
import { useTypingSounds } from '../audio/useSfx';
import { getBook, getSegment } from '../content/library';
import type { Book, Segment } from '../content/schema';
import { FINGER_NAME, fingerOf } from '../engine/fingers';
import { currentToken, expectedKey } from '../engine/session';
import { accuracy, buildResult, speedCpm, starsFor } from '../engine/stats';
import { useTypingSession } from '../hooks/useTypingSession';
import { navigate } from '../router';
import { grantDailyBonus } from '../rewards/dailyTasks';
import { syncRewards } from '../rewards/rewards';
import { useProfile } from '../storage/ProfileContext';
import { recordSegment, today } from '../storage/profile';
import Keyboard from '../ui/Keyboard';
import Passage from '../ui/Passage';
import ProgressBar from '../ui/ProgressBar';
import StarRow from '../ui/StarRow';
import WornMascot from '../ui/WornMascot';
import { coachMessage } from './coach';
import './Practice.css';

export { IDLE_PAUSE_MS } from '../hooks/useTypingSession';

/** 打字过程中点按钮不抢焦点，否则孩子按空格或回车会再次触发这个按钮 */
const keepFocus = (e: MouseEvent) => e.preventDefault();

export default function Practice({ bookId, segmentId }: { bookId: string; segmentId: string }) {
  const book = getBook(bookId);
  const segment = getSegment(bookId, segmentId);
  if (!book || !segment) {
    return (
      <main className="page">
        <div className="page-inner">
          <div className="card">
            <h1 className="display">找不到这一段</h1>
            <p>可能这本书还没上线。</p>
            <button type="button" className="btn btn-primary" onClick={() => navigate({ name: 'books' })}>
              回读书岛
            </button>
          </div>
        </div>
      </main>
    );
  }
  return <PracticeSession key={`${bookId}/${segmentId}`} book={book} segment={segment} />;
}

function PracticeSession({ book, segment }: { book: Book; segment: Segment }) {
  const { profile, update, lastResult, setLastResult } = useProfile();
  const { session, imeWarn, paused, restart: resetSession } = useTypingSession(segment.tokens);
  const saved = useRef(false);
  useTypingSounds(session);
  const voice = useChineseVoice();
  useEffect(() => stopSpeaking, []);

  // 打完一段：记成绩、发奖励，只记一次。奖励在这里就保存，孩子不进结算页也不会丢。
  useEffect(() => {
    if (!session.done || saved.current) return;
    saved.current = true;
    const result = buildResult(session, book.id, segment.id);
    const date = today();
    const { profile: rewarded, unlocks } = syncRewards(recordSegment(profile, result, date), result, date);
    setLastResult({ ...result, unlocks });
    update(() => grantDailyBonus(rewarded, date));
  }, [session, book.id, segment.id, profile, setLastResult, update]);

  const restart = () => {
    saved.current = false;
    resetSession();
  };
  const togglePinyin = () =>
    update((p) => ({ ...p, settings: { ...p.settings, showPinyin: !p.settings.showPinyin } }));

  const cur = currentToken(session);
  const next = expectedKey(session);
  const finger = next ? fingerOf(next) : null;
  const acc = accuracy(session);
  const typed = session.right + session.wrong;
  const total = session.hanziIdx.length;
  const showPinyin = profile.settings.showPinyin;
  const u = lastResult?.unlocks;
  const hasNewRewards = session.done && u !== undefined && (u.skins.length > 0 || u.badges.length > 0 || u.speedLevel !== null);

  return (
    <main className="page practice-page">
      <div className="page-inner practice-inner">
        <header className="row practice-header">
          <button type="button" className="btn" onClick={() => navigate({ name: 'books' })}>
            ← 读书岛
          </button>
          <h1 className="chip practice-book">
            <span className="mini-cover" style={{ background: book.cover }}>
              {book.mark}
            </span>
            <span className="practice-book-title">
              《{book.title}》{segment.title}
            </span>
          </h1>
          <div className="practice-progress">
            <ProgressBar value={(session.cursor * 100) / Math.max(1, total)} label="本段进度" height={22} />
            <b className="latin">
              {session.cursor} / {total} 字
            </b>
          </div>
          <span className="chip">
            速度 <b className="latin">{speedCpm(session)}</b> 字/分
          </span>
          <span className="chip">
            正确率 <b className="latin">{acc}%</b>
          </span>
          <span className="chip">
            <StarRow count={typed === 0 ? 3 : starsFor(acc)} />
          </span>
          <button type="button" className="btn" aria-pressed={showPinyin} onMouseDown={keepFocus} onClick={togglePinyin}>
            拼音：{showPinyin ? '开' : '关'}
          </button>
          <button type="button" className="btn" onMouseDown={keepFocus} onClick={restart} aria-label="重新开始这一段">
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
            <section className="card practice-passage" aria-label="课文">
              <Passage session={session} showPinyin={showPinyin} />
              <div className="practice-tools">
                <p className="practice-tip">小提示：只打拼音字母，不用打声调；标点会自动跳过。ü 用 V 键。</p>
                {voice && (
                  <button
                    type="button"
                    className="btn"
                    onMouseDown={keepFocus}
                    onClick={() => speak(segment.tokens.map((t) => t.char).join(''), voice)}
                  >
                    听一听
                  </button>
                )}
              </div>
            </section>
            <section className="card practice-keyboard" aria-label="键盘提示">
              <Keyboard nextKey={next} wrongKey={session.lastWrongKey} wrongTick={session.wrong} showHands />
            </section>
          </div>

          <aside className="practice-side">
            {cur && next ? (
              <div className="card now-card">
                <div className="now-label">现在打这个字</div>
                <div className="row now-row">
                  <div className="now-char">{cur.char}</div>
                  <div className="now-tone">{cur.tone}</div>
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
                <h2 className="display">整段完成！</h2>
                {hasNewRewards && <p className="done-new">有新奖励等你领！</p>}
                <p>
                  速度 {speedCpm(session)} 字/分 · 正确率 {acc}%
                </p>
                <button type="button" className="btn btn-primary" onClick={() => navigate({ name: 'result' })}>
                  看看我的成绩
                </button>
                <button type="button" className="btn" onClick={restart}>
                  再打一次
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
