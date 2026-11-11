import { getBook, nextSegmentId } from '../content/library';
import { navigate } from '../router';
import { BADGES } from '../rewards/badges';
import { SPEED_LEVELS } from '../rewards/config';
import { dailyTasks, streakDays } from '../rewards/dailyTasks';
import { nextSmallSkin, nextSpeedLevel } from '../rewards/rewards';
import { skinById } from '../rewards/skins';
import { useProfile } from '../storage/ProfileContext';
import { today } from '../storage/profile';
import Mascot from '../ui/Mascot';
import ProgressBar from '../ui/ProgressBar';
import WornMascot from '../ui/WornMascot';
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

  const date = today();
  const tasks = dailyTasks(profile, date);
  const streak = streakDays(profile.daily, date);
  const nextSmall = nextSmallSkin(profile.totalChars);
  const nextSpeed = nextSpeedLevel(profile.bestSpeedLevel);
  const hasNewSkin = profile.skinsNew.length > 0;

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
            <span className="chip">
              连续 <b className="latin">{streak}</b> 天
            </span>
            <button
              type="button"
              className="btn"
              aria-label={hasNewSkin ? '我的衣橱：有新皮肤' : '我的衣橱'}
              onClick={() => navigate({ name: 'wardrobe' })}
            >
              我的衣橱
              {hasNewSkin && <span className="tag tag-coral">NEW</span>}
            </button>
            <span className="chip">{profile.nickname}</span>
          </div>
        </header>

        <section className="card home-hero">
          <WornMascot size={180} label="键宝在挥手" />
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
                    {doneCount === ids.length ? '再读一遍 →' : '继续打字 →'}
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

        <section className="home-panels">
          <div className="card home-panel">
            <h2 className="display">今日任务</h2>
            {tasks.map((t, i) => (
              <div key={t.id} className="task-row">
                <span className={t.done ? 'task-mark is-done' : 'task-mark'} aria-hidden="true">
                  {t.done ? '✓' : i + 1}
                </span>
                <span className="task-title">{t.title}</span>
                <span className="latin">{t.done ? '完成' : t.progress}</span>
              </div>
            ))}
            <div className="panel-note">全部完成多得 3 颗星</div>
            {nextSmall && (
              <div className="panel-note">
                再打 {nextSmall.remaining} 字，解锁「{skinById(nextSmall.skinId).name}」
              </div>
            )}
          </div>

          <div className="card home-panel">
            <h2 className="display">速度等级</h2>
            <div className="level-row">
              <span className={profile.bestSpeedLevel === 0 ? 'level-chip is-on' : 'level-chip'}>蜗牛</span>
              {SPEED_LEVELS.map((l) => (
                <span key={l.level} className={profile.bestSpeedLevel === l.level ? 'level-chip is-on' : 'level-chip'}>
                  {l.name}
                </span>
              ))}
            </div>
            <div className="panel-note">
              {nextSpeed ? `打到 ${nextSpeed.minSpeed} 字/分，升级「${nextSpeed.name}」，送大皮肤` : '已经是最高等级啦！'}
            </div>
          </div>

          <div className="card home-panel">
            <h2 className="display">我的徽章</h2>
            <div className="panel-note">
              已收集 {profile.badges.length} / {BADGES.length}
            </div>
            <div className="badge-row">
              {BADGES.map((b) => {
                const earned = profile.badges.includes(b.id);
                return (
                  <span key={b.id} className={earned ? 'badge is-earned' : 'badge'} title={b.desc}>
                    {earned ? '★' : '?'} {b.name}
                  </span>
                );
              })}
            </div>
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
