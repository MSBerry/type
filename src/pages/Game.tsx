import { useCallback, useEffect, useRef, useState } from 'react';
import { useSfx } from '../audio/useSfx';
import { GOAL, LANES, TICK_MS, type GameState, gameStars, newGame, targetIds, tick, typeKey } from '../game/bubbles';
import { useTypingInput } from '../hooks/useTypingInput';
import { navigate } from '../router';
import { grantDailyBonus } from '../rewards/dailyTasks';
import { syncRewards } from '../rewards/rewards';
import { useProfile } from '../storage/ProfileContext';
import { recordGameScore, recordPractice, today } from '../storage/profile';
import ProgressBar from '../ui/ProgressBar';
import StarRow from '../ui/StarRow';
import WornMascot from '../ui/WornMascot';
import './Game.css';

export default function Game() {
  const { profile, update } = useProfile();
  const [game, setGame] = useState<GameState | null>(null);
  const [paused, setPaused] = useState(false);
  const [imeWarn, setImeWarn] = useState(false);
  const saved = useRef(false);
  const play = useSfx();
  const last = useRef({ popped: 0, wrong: 0 });
  useEffect(() => {
    if (!game) return;
    const p = last.current;
    if (game.status === 'won' && game.popped > p.popped) play('cheer');
    else if (game.popped > p.popped) play('pop');
    else if (game.wrong > p.wrong) play('wrong');
    last.current = { popped: game.popped, wrong: game.wrong };
  }, [game, play]);
  const playing = game?.status === 'playing';

  useEffect(() => {
    if (!playing || paused) return;
    const t = window.setInterval(() => setGame((g) => (g ? tick(g, TICK_MS) : g)), TICK_MS);
    return () => window.clearInterval(t);
  }, [playing, paused]);

  const onLetter = useCallback((key: string) => {
    setPaused(false);
    setImeWarn(false);
    setGame((g) => (g ? typeKey(g, key) : g));
  }, []);
  const onIme = useCallback(() => setImeWarn(true), []);
  const onPause = useCallback(() => setPaused(true), []);
  useTypingInput(playing, { onLetter, onIme, onPause });

  useEffect(() => {
    if (!game || game.status === 'playing' || saved.current) return;
    saved.current = true;
    const date = today();
    const stars = gameStars(game);
    update((p) => {
      const next = recordGameScore(recordPractice(p, { chars: game.poppedHanzi, stars, activeMs: game.elapsed }, date), game.score);
      return grantDailyBonus(syncRewards(next, undefined, date).profile, date);
    });
  }, [game, update]);

  const start = () => {
    saved.current = false;
    last.current = { popped: 0, wrong: 0 };
    setPaused(false);
    setImeWarn(false);
    setGame(newGame());
  };

  const header = (
    <header className="row spread">
      <div className="row">
        <button type="button" className="btn" onClick={() => navigate({ name: 'home' })}>
          ← 回大厅
        </button>
        <h1 className="display game-title">龙宫泡泡</h1>
      </div>
      <span className="chip">
        最高分 <b className="latin">{profile.gameBest}</b>
      </span>
    </header>
  );

  if (!game) {
    return (
      <main className="page">
        <div className="page-inner">
          {header}
          <section className="card game-start">
            <WornMascot size={150} label="键宝" />
            <p>《西游记》里的词语装在泡泡里，从海底往上升。打出它的拼音（不用打声调）就能戳破它！</p>
            <p>戳破 {GOAL} 个就闯关成功；有 3 个泡泡跑到顶上，游戏就结束。</p>
            <p>开始前，记得把输入法切换成英文。</p>
            <button type="button" className="btn btn-primary" onClick={start}>
              开始游戏
            </button>
          </section>
        </div>
      </main>
    );
  }

  if (game.status !== 'playing') {
    const won = game.status === 'won';
    return (
      <main className="page">
        <div className="page-inner">
          {header}
          <section className="card game-over">
            <WornMascot size={150} mood={won ? 'cheer' : 'happy'} label="键宝" />
            <h2 className="display">{won ? '闯关成功！' : '泡泡跑掉啦'}</h2>
            <StarRow count={gameStars(game)} size={56} />
            <p>
              得分 {game.score} · 戳破 {game.popped} 个泡泡 · 打了 {game.poppedHanzi} 个字
            </p>
            <button type="button" className="btn btn-primary" onClick={start}>
              再玩一次
            </button>
            <button type="button" className="btn" onClick={() => navigate({ name: 'home' })}>
              回大厅
            </button>
          </section>
        </div>
      </main>
    );
  }

  const targets = targetIds(game);
  return (
    <main className="page">
      <div className="page-inner">
        {header}
        {imeWarn && (
          <div role="alert" className="banner">
            好像开着中文输入法～按一下 Shift 切换成英文，再接着打。
          </div>
        )}
        {paused && (
          <div role="status" className="banner banner-soft">
            暂停了～按任意字母继续。
          </div>
        )}
        <div className="game-main">
          <section className="game-stage" aria-label="游戏画面">
            <div className="game-hint">打出拼音，戳破泡泡！</div>
            {game.bubbles.map((b) => (
              <div
                key={b.id}
                className={targets.has(b.id) ? 'bubble is-target' : 'bubble'}
                style={{ left: `calc(${b.lane / (LANES - 1)} * (100% - 130px))`, bottom: `calc(${b.y} * (100% - 130px))` }}
              >
                <b>{b.word.text}</b>
                <span className="bubble-py">{b.word.tone}</span>
              </div>
            ))}
            <div className="game-typed" aria-live="polite">
              {game.typed || '　'}
            </div>
          </section>
          <aside className="game-side">
            <div className="card">
              <b>
                得分 <span className="latin" data-testid="game-score">{game.score}</span>
              </b>
              <span>连击 ×{game.combo}</span>
              <span className="game-hearts" role="img" aria-label={`还剩 ${game.lives} 条命`}>
                {'♥'.repeat(game.lives)}
                {'♡'.repeat(Math.max(0, 3 - game.lives))}
              </span>
            </div>
            <div className="card">
              <b>
                目标：戳破 {GOAL} 个（{game.popped} / {GOAL}）
              </b>
              <ProgressBar value={(game.popped * 100) / GOAL} label="戳破的泡泡" />
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
