import { useState } from 'react';
import { type ShelfBook, listShelf, nextSegmentId } from '../content/library';
import { navigate } from '../router';
import { useProfile } from '../storage/ProfileContext';
import Mascot from '../ui/Mascot';
import ProgressBar from '../ui/ProgressBar';
import './Bookshelf.css';

const GRADES = [
  { g: 4, label: '四年级' },
  { g: 5, label: '五年级' },
  { g: 6, label: '六年级' },
] as const;

export default function Bookshelf() {
  const { profile } = useProfile();
  const [grade, setGrade] = useState<4 | 5 | 6>(profile.grade);
  const groups = listShelf(grade);
  const poems = listShelf(0).flatMap((g) => g.books);
  const doneOf = (id: string) => profile.bookProgress[id]?.done ?? [];

  const books = groups.flatMap((g) => g.books);
  const isFinished = (b: ShelfBook) => b.ready && b.segmentIds.every((s) => doneOf(b.id).includes(s));
  const finished = books.filter(isFinished).length;
  const reading = books.filter((b) => b.ready && doneOf(b.id).length > 0 && !isFinished(b)).length;

  return (
    <main className="page">
      <div className="page-inner">
        <header className="row spread">
          <button type="button" className="btn" onClick={() => navigate({ name: 'home' })}>
            ← 回大厅
          </button>
          <span className="chip">
            星星 <b className="latin">{profile.stars}</b>
          </span>
        </header>

        <section className="card shelf-hero">
          <Mascot size={130} label="键宝" />
          <div className="shelf-hero-text">
            <h1 className="display shelf-title">读书岛</h1>
            <p>跟着语文课本「快乐读书吧」选书，一段一段边读边打。读完一整本，就能领一套大皮肤！</p>
          </div>
          <div className="row">
            <Stat n={finished} label="本已读完" />
            <Stat n={reading} label="本正在读" />
            <Stat n={books.length} label="本书" />
          </div>
        </section>

        <div role="tablist" aria-label="选择年级" className="row">
          {GRADES.map(({ g, label }) => (
            <button
              key={g}
              type="button"
              role="tab"
              aria-selected={grade === g}
              className={grade === g ? 'btn grade-tab is-on' : 'btn grade-tab'}
              onClick={() => setGrade(g)}
            >
              {label}
            </button>
          ))}
        </div>

        {groups.map((group) => (
          <Shelf key={group.term} term={group.term} title={group.theme} note="快乐读书吧推荐" books={group.books} doneOf={doneOf} />
        ))}
        <Shelf term="通用" title="古诗词小站" note="短小好打，适合热身" books={poems} doneOf={doneOf} />
      </div>
    </main>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="shelf-stat">
      <b className="latin">{n}</b>
      <span>{label}</span>
    </div>
  );
}

type ShelfProps = { term: string; title: string; note: string; books: ShelfBook[]; doneOf: (id: string) => string[] };

function Shelf({ term, title, note, books, doneOf }: ShelfProps) {
  return (
    <section className="shelf" aria-label={title}>
      <div className="row">
        <span className="tag tag-dark">{term}</span>
        <h2 className="display shelf-name">{title}</h2>
        <span className="shelf-count">
          {note} · {books.length} 本
        </span>
      </div>
      <div className="shelf-grid">
        {books.map((b) => (
          <BookCard key={b.id} book={b} done={doneOf(b.id)} />
        ))}
      </div>
      <div className="shelf-plank" />
    </section>
  );
}

function BookCard({ book, done }: { book: ShelfBook; done: string[] }) {
  const total = book.segmentIds.length;
  const doneCount = book.segmentIds.filter((s) => done.includes(s)).length;
  const finished = book.ready && total > 0 && doneCount === total;
  const started = doneCount > 0 && !finished;
  const status = !book.ready
    ? '即将上线'
    : finished
      ? `已读完 · 全部 ${total} 段`
      : started
        ? `已打 ${doneCount} / ${total} 段`
        : `共 ${total} 段，还没开始`;
  const label = finished ? '再读一遍' : started ? '继续打字' : '开始打字';
  const open = () => {
    const seg = nextSegmentId(book.segmentIds, done);
    if (seg) navigate({ name: 'practice', bookId: book.id, segmentId: seg });
  };

  return (
    <article className="book-card">
      <div className="book-cover" style={{ background: book.cover }}>
        <span className="book-spine" />
        <span className="display book-cover-title">{book.title}</span>
        <span className="display book-mark" aria-hidden="true">
          {book.mark}
        </span>
      </div>
      <div className="book-author">{book.author}</div>
      <ProgressBar value={total ? (doneCount * 100) / total : 0} label={`《${book.title}》阅读进度`} height={14} />
      <div className="book-status">{status}</div>
      <div className="book-reward">{finished ? `已获得大皮肤「${book.skinName}」` : `读完送大皮肤「${book.skinName}」`}</div>
      {book.ready ? (
        <button type="button" className={started ? 'btn btn-primary' : 'btn'} onClick={open} aria-label={`${label}：《${book.title}》`}>
          {label}
        </button>
      ) : (
        <button type="button" className="btn" disabled>
          即将上线
        </button>
      )}
    </article>
  );
}
