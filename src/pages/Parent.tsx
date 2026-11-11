import { type ChangeEvent, type FormEvent, useState } from 'react';
import { ARTICLE_MAX_CHARS, buildCustomBook, loadPinyinFn } from '../content/importArticle';
import { navigate } from '../router';
import { SPEED_LEVELS } from '../rewards/config';
import { finishedBookIds } from '../rewards/rewards';
import { useProfile } from '../storage/ProfileContext';
import { addCustomBook, exportStore, parseBackup, removeCustomBook, switchProfile, today } from '../storage/profile';
import Avatar from '../ui/Avatar';
import { lastDays, topErrorKeys } from './parentStats';
import './Parent.css';

const LIMITS = [0, 10, 15, 20, 30, 45, 60];

function question(rng: () => number) {
  return { a: 10 + Math.floor(rng() * 40), b: 10 + Math.floor(rng() * 40) };
}

function readText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('读不出这个文件'));
    reader.readAsText(file);
  });
}

export default function Parent({ rng = Math.random }: { rng?: () => number }) {
  const [unlocked, setUnlocked] = useState(false);
  return unlocked ? <ParentCenter /> : <ParentGate rng={rng} onPass={() => setUnlocked(true)} />;
}

function ParentGate({ rng, onPass }: { rng: () => number; onPass: () => void }) {
  const [q, setQ] = useState(() => question(rng));
  const [answer, setAnswer] = useState('');
  const [wrong, setWrong] = useState(false);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (Number(answer.trim()) === q.a + q.b) {
      onPass();
      return;
    }
    setWrong(true);
    setAnswer('');
    setQ(question(rng));
  };
  return (
    <main className="page">
      <div className="page-inner">
        <button type="button" className="btn" onClick={() => navigate({ name: 'home' })}>
          ← 回大厅
        </button>
        <form className="card gate" onSubmit={submit}>
          <h1 className="display">请家长来回答</h1>
          <div className="gate-q">
            {q.a} + {q.b} = ?
          </div>
          <input aria-label="答案" inputMode="numeric" autoComplete="off" value={answer} onChange={(e) => setAnswer(e.target.value)} />
          {wrong && <p className="msg-bad">不对哦，换一道题再试试</p>}
          <button type="submit" className="btn btn-primary">
            进入
          </button>
        </form>
      </div>
    </main>
  );
}

function ParentCenter() {
  const { profile, store, update, updateStore, setLastResult } = useProfile();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const rows = lastDays(profile.daily, today());
  const maxMin = Math.max(1, ...rows.map((r) => r.minutes));
  const errors = topErrorKeys(profile.keyErrors);
  const level = SPEED_LEVELS.find((l) => l.level === profile.bestSpeedLevel);

  const setLimit = (n: number) => update((p) => ({ ...p, settings: { ...p.settings, dailyLimitMin: n } }));
  const toggleSound = () => update((p) => ({ ...p, settings: { ...p.settings, sound: !p.settings.sound } }));

  const exportBackup = () => {
    const blob = new Blob([exportStore(store)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `小键盘大冒险-备份-${today()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const importBackup = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const next = parseBackup(await readText(file));
      updateStore(() => next);
      setLastResult(null);
      setMsg({ ok: true, text: `已恢复 ${next.profiles.length} 个小朋友的进度` });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : '导入失败' });
    }
  };

  return (
    <main className="page">
      <div className="page-inner parent">
        <header className="row spread">
          <div className="row">
            <button type="button" className="btn" onClick={() => navigate({ name: 'home' })}>
              ← 回大厅
            </button>
            <h1 className="display parent-title">家长中心</h1>
          </div>
          <span className="chip">
            <Avatar avatar={profile.avatar} name={profile.nickname} size={32} /> 正在看：{profile.nickname}
          </span>
        </header>

        <div className="parent-grid">
          <section className="card">
            <h2 className="display">近 7 天</h2>
            <table className="day-table">
              <thead>
                <tr>
                  <th>日期</th>
                  <th>分钟</th>
                  <th>字数</th>
                  <th>字/分</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.date}>
                    <td>{r.label}</td>
                    <td>
                      <div className="row" style={{ gap: 8 }}>
                        <span className="latin">{r.minutes}</span>
                        <div className="day-bar" style={{ width: `${(r.minutes * 80) / maxMin}px` }} />
                      </div>
                    </td>
                    <td className="latin">{r.chars}</td>
                    <td className="latin">{r.speed || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="parent-note">字/分是当天打的字数除以练习分钟数，指法训练营只算时间不算字数。</p>
          </section>

          <section className="card">
            <h2 className="display">学习概况</h2>
            <dl className="stat-list">
              <div>
                <dt>累计打字</dt>
                <dd>{profile.totalChars}</dd>
              </div>
              <div>
                <dt>速度等级</dt>
                <dd>{level ? level.name : '蜗牛'}</dd>
              </div>
              <div>
                <dt>读完的书</dt>
                <dd>{finishedBookIds(profile).length}</dd>
              </div>
              <div>
                <dt>指法关卡</dt>
                <dd>{profile.fingerLevel} / 12</dd>
              </div>
            </dl>
            <b>最容易按错的键</b>
            {errors.length === 0 ? (
              <p className="parent-note">还没有记录。</p>
            ) : (
              <div className="row">
                {errors.map(([k, n]) => (
                  <span key={k} className="tag">
                    {k.toUpperCase()} × {n}
                  </span>
                ))}
              </div>
            )}
          </section>

          <section className="card">
            <h2 className="display">设置</h2>
            <label className="row">
              每天练习时长
              <select value={profile.settings.dailyLimitMin} onChange={(e) => setLimit(Number(e.target.value))}>
                {LIMITS.map((n) => (
                  <option key={n} value={n}>
                    {n === 0 ? '不提醒' : `${n} 分钟`}
                  </option>
                ))}
              </select>
            </label>
            <p className="parent-note">到时间后键宝会提醒孩子休息，不会强制退出。</p>
            <button type="button" className="btn" aria-pressed={profile.settings.sound} onClick={toggleSound}>
              声音：{profile.settings.sound ? '开' : '关'}
            </button>
          </section>

          <section className="card">
            <h2 className="display">小朋友</h2>
            {store.profiles.map((p) => (
              <div key={p.id} className="kid-row">
                <Avatar avatar={p.avatar} name={p.nickname} size={40} />
                <span>
                  {p.nickname} · {p.grade} 年级
                </span>
                {p.id === store.activeId ? (
                  <span className="tag">正在看</span>
                ) : (
                  <button
                    type="button"
                    className="btn"
                    aria-label={`看${p.nickname}的`}
                    onClick={() => {
                      updateStore((s) => switchProfile(s, p.id));
                      setLastResult(null);
                    }}
                  >
                    看{p.nickname}的
                  </button>
                )}
              </div>
            ))}
            <button type="button" className="btn" onClick={() => navigate({ name: 'welcome' })}>
              ＋ 加一个小朋友
            </button>
          </section>

          <ArticleImport />

          <section className="card">
            <h2 className="display">备份和恢复</h2>
            <p className="parent-note">进度只存在这台电脑的浏览器里。换电脑或清理浏览器前，先导出一份备份。</p>
            <div className="row">
              <button type="button" className="btn btn-primary" onClick={exportBackup}>
                导出备份
              </button>
              <label className="btn file-btn">
                导入备份
                <input type="file" accept="application/json,.json" aria-label="导入备份" onChange={importBackup} />
              </label>
            </div>
            {msg && <p className={msg.ok ? 'msg-ok' : 'msg-bad'}>{msg.text}</p>}
            <p className="parent-note">导入会替换这台电脑上所有小朋友的进度。</p>
          </section>
        </div>
      </div>
    </main>
  );
}

function ArticleImport() {
  const { store, updateStore } = useProfile();
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const create = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const fn = await loadPinyinFn();
      const { book, unknown } = buildCustomBook(title, text, fn);
      updateStore((s) => addCustomBook(s, book));
      setTitle('');
      setText('');
      const skipped = unknown.length > 0 ? ` 这些字标不出拼音，练习时会自动跳过：${unknown.join(' ')}` : '';
      setMsg({ ok: true, text: `已生成《${book.title}》，共 ${book.segments.length} 段，在读书岛的「我的文章」里。${skipped}` });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : '生成失败' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card">
      <h2 className="display">导入文章</h2>
      <p className="parent-note">粘贴一篇文章（最多 {ARTICLE_MAX_CHARS} 字），自动标上拼音，切成一段一段放进读书岛。多音字由程序自动判断，可能有个别读音不准。</p>
      <input className="text-input" aria-label="文章标题" placeholder="标题，比如：小猫钓鱼" maxLength={20} value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea aria-label="文章内容" rows={6} maxLength={ARTICLE_MAX_CHARS} value={text} onChange={(e) => setText(e.target.value)} />
      <div className="row spread">
        <span className="parent-note">
          {text.length} / {ARTICLE_MAX_CHARS} 字
        </span>
        <button type="button" className="btn btn-primary" disabled={busy || !text.trim()} onClick={create}>
          {busy ? '正在生成…' : '生成练习'}
        </button>
      </div>
      {msg && <p className={msg.ok ? 'msg-ok' : 'msg-bad'}>{msg.text}</p>}
      {store.customBooks.map((b) => (
        <div key={b.id} className="kid-row">
          <span>
            《{b.title}》 · {b.segments.length} 段
          </span>
          {confirmId === b.id ? (
            <button
              type="button"
              className="btn"
              aria-label={`确定删除《${b.title}》`}
              onClick={() => {
                updateStore((s) => removeCustomBook(s, b.id));
                setConfirmId(null);
              }}
            >
              确定删除
            </button>
          ) : (
            <button type="button" className="btn" aria-label={`删除《${b.title}》`} onClick={() => setConfirmId(b.id)}>
              删除
            </button>
          )}
        </div>
      ))}
    </section>
  );
}
