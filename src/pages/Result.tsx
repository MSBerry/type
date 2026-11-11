import { getBook, getSegment, segmentAfter } from '../content/library';
import { navigate } from '../router';
import { useProfile } from '../storage/ProfileContext';
import { addStars } from '../storage/profile';
import Mascot from '../ui/Mascot';
import StarRow from '../ui/StarRow';
import { formatDuration, headlineFor } from './format';
import './Result.css';

export default function Result() {
  const { profile, update, lastResult, setLastResult } = useProfile();

  if (!lastResult) {
    return (
      <main className="page">
        <div className="page-inner">
          <div className="card">
            <h1 className="display">还没有成绩哦</h1>
            <p>先去读书岛打一段吧！</p>
            <button type="button" className="btn btn-primary" onClick={() => navigate({ name: 'books' })}>
              去读书岛
            </button>
          </div>
        </div>
      </main>
    );
  }

  const r = lastResult;
  const book = getBook(r.bookId);
  const segment = getSegment(r.bookId, r.segmentId);
  const nextId = book ? segmentAfter(book, r.segmentId) : null;
  const quiz = segment?.quiz;

  const picked = r.quizPick ?? null;
  const pick = (i: number) => {
    if (picked !== null || !quiz) return;
    setLastResult({ ...r, quizPick: i });
    if (i === quiz.answer) update((p) => addStars(p, 1));
  };

  return (
    <main className="page">
      <div className="page-inner">
        <section className="card result-hero">
          <Mascot size={180} mood="cheer" label="键宝在欢呼" />
          <div className="result-hero-text">
            <b>
              {book ? `《${book.title}》` : ''}
              {segment?.title ?? ''} · 完成
            </b>
            <h1 className="display">{headlineFor(r.stars, profile.nickname)}</h1>
            <StarRow count={r.stars} size={64} />
          </div>
          <div className="result-actions">
            {nextId ? (
              <button
                type="button"
                className="btn btn-dark"
                onClick={() => navigate({ name: 'practice', bookId: r.bookId, segmentId: nextId })}
              >
                下一段 →
              </button>
            ) : (
              <button type="button" className="btn btn-dark" onClick={() => navigate({ name: 'books' })}>
                这本读完啦，回读书岛
              </button>
            )}
            <button
              type="button"
              className="btn"
              onClick={() => navigate({ name: 'practice', bookId: r.bookId, segmentId: r.segmentId })}
            >
              再练一次
            </button>
            <button type="button" className="btn" onClick={() => navigate({ name: 'books' })}>
              回读书岛
            </button>
          </div>
        </section>

        <section className="stat-grid" aria-label="本次成绩">
          <div className="card stat" data-testid="stat-speed">
            <div className="stat-label">速度</div>
            <div className="stat-value">
              {r.speed} <small>字/分</small>
            </div>
          </div>
          <div className="card stat" data-testid="stat-acc">
            <div className="stat-label">正确率</div>
            <div className="stat-value">{r.accuracy}%</div>
          </div>
          <div className="card stat" data-testid="stat-time">
            <div className="stat-label">用时</div>
            <div className="stat-value">{formatDuration(r.activeMs)}</div>
          </div>
          <div className="card stat" data-testid="stat-chars">
            <div className="stat-label">打了</div>
            <div className="stat-value">
              {r.hanzi} <small>个字</small>
            </div>
          </div>
        </section>

        <div className="result-lower">
          {quiz && (
            <section className="card quiz-card">
              <h2 className="display">读书小考考</h2>
              <p className="quiz-q">{quiz.q}</p>
              {quiz.options.map((opt, i) => {
                const isRight = picked !== null && i === quiz.answer;
                const isWrong = picked === i && i !== quiz.answer;
                const cls = isRight ? 'btn quiz-option is-right' : isWrong ? 'btn quiz-option is-wrong' : 'btn quiz-option';
                return (
                  <button key={opt} type="button" className={cls} aria-pressed={picked === i} onClick={() => pick(i)}>
                    {isRight && <span aria-hidden="true">✓</span>}
                    {isWrong && <span aria-hidden="true">✗</span>}
                    {opt}
                  </button>
                );
              })}
              <p className="quiz-feedback" aria-live="polite">
                {picked === null
                  ? '选一个答案吧～答对多得 1 颗星。'
                  : picked === quiz.answer
                    ? '答对啦！星星 +1'
                    : `再想想～正确答案是「${quiz.options[quiz.answer]}」`}
              </p>
            </section>
          )}
          <section className="card errors-card">
            <h2 className="display">这些键要多练</h2>
            {r.topErrors.length === 0 ? (
              <p>一个键都没按错，厉害！</p>
            ) : (
              <div className="row">
                {r.topErrors.map((e) => (
                  <span key={e.key} className="err-key">
                    {e.key.toUpperCase()}
                    <small>错 {e.count} 次</small>
                  </span>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
