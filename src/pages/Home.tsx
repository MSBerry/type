import { getBook, nextSegmentId } from '../content/library';
import { navigate } from '../router';
import { useProfile } from '../storage/ProfileContext';
import Mascot from '../ui/Mascot';
import ProgressBar from '../ui/ProgressBar';
import './Home.css';

export default function Home() {
  const { profile } = useProfile();
  const latest = Object.entries(profile.bookProgress)
    .filter(([id]) => getBook(id))
    .sort((a, b) => b[1].updatedAt - a[1].updatedAt)[0];
  const book = latest ? getBook(latest[0]) : null;
  const ids = book ? book.segments.map((s) => s.id) : [];
  const done = latest ? latest[1].done : [];
  const doneCount = ids.filter((id) => done.includes(id)).length;

  const continueReading = () => {
    if (!book) return;
    const seg = nextSegmentId(ids, done);
    if (seg) navigate({ name: 'practice', bookId: book.id, segmentId: seg });
  };

  return (
    <main className="page">
      <div className="page-inner">
        <header className="row spread">
          <div className="row">
            <Mascot size={60} label="小键盘大冒险" />
            <div>
              <div className="display home-logo">小键盘大冒险</div>
              <div className="home-sub">4–6 年级 · 边读课外书，边学打字</div>
            </div>
          </div>
          <div className="row">
            <span className="chip">
              星星 <b className="latin">{profile.stars}</b>
            </span>
            <span className="chip">{profile.nickname}</span>
          </div>
        </header>

        <section className="card home-hero">
          <Mascot size={180} label="键宝在挥手" />
          <div className="home-hero-text">
            <h1 className="display home-hello">你好，{profile.nickname}！</h1>
            <p>我是键宝。{book ? `今天接着读《${book.title}》吧！` : '去读书岛选一本书，我们一起边读边打字！'}</p>
            <div className="home-continue">
              {book ? (
                <>
                  <div className="home-continue-info">
                    <b>继续读：《{book.title}》</b>
                    <ProgressBar value={(doneCount * 100) / ids.length} label={`《${book.title}》阅读进度`} />
                    <span>
                      已打 {doneCount} / {ids.length} 段
                    </span>
                  </div>
                  <button type="button" className="btn btn-dark" onClick={continueReading}>
                    继续打字 →
                  </button>
                </>
              ) : (
                <button type="button" className="btn btn-dark" onClick={() => navigate({ name: 'books' })}>
                  去读书岛 →
                </button>
              )}
            </div>
          </div>
        </section>

        <section>
          <h2 className="display home-h2">今天想去哪里冒险？</h2>
          <div className="mode-grid">
            <button
              type="button"
              className="mode-card"
              style={{ background: 'var(--peach)' }}
              aria-label="读书岛：去选书"
              onClick={() => navigate({ name: 'books' })}
            >
              <span className="tag tag-coral">推荐</span>
              <span className="display mode-title">读书岛</span>
              <span className="mode-desc">4–6 年级「快乐读书吧」书单，边读边打</span>
              <span className="mode-go">去选书 →</span>
            </button>
            <ModeSoon title="指法训练营" desc="从 F 和 J 出发，认识每根手指的「家」" tint="var(--blue-soft)" />
            <ModeSoon title="拼音快打" desc="声母、韵母、整体认读，zh / ch / sh 专项练" tint="var(--mint-soft)" />
            <ModeSoon title="游戏乐园" desc="龙宫泡泡 · 筋斗云赛跑 · 字母雨" tint="var(--lav)" />
          </div>
        </section>

        <footer className="home-footer">Windows / macOS 通用 · 每天建议 20 分钟，记得让眼睛休息</footer>
      </div>
    </main>
  );
}

function ModeSoon({ title, desc, tint }: { title: string; desc: string; tint: string }) {
  return (
    <button type="button" className="mode-card" style={{ background: tint }} aria-label={`${title}：即将开放`} disabled>
      <span className="tag">即将开放</span>
      <span className="display mode-title">{title}</span>
      <span className="mode-desc">{desc}</span>
    </button>
  );
}
