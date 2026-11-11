import { useCallback, useMemo, useState } from 'react';
import { FINGER_LEVELS, fingerTokens } from '../drills/fingerLevels';
import { navigate } from '../router';
import { FINGER_PASS_ACCURACY } from '../rewards/config';
import { grantDailyBonus } from '../rewards/dailyTasks';
import { syncRewards } from '../rewards/rewards';
import { useProfile } from '../storage/ProfileContext';
import { passFingerLevel, recordPractice, today } from '../storage/profile';
import Drill, { type DrillResult } from './Drill';
import './Modes.css';

export function FingerCamp() {
  const { profile } = useProfile();
  return (
    <main className="page">
      <div className="page-inner">
        <header className="row spread">
          <div className="row">
            <button type="button" className="btn" onClick={() => navigate({ name: 'home' })}>
              ← 回大厅
            </button>
            <h1 className="display modes-title">指法训练营</h1>
          </div>
          <span className="chip">
            已通过 {profile.fingerLevel} / {FINGER_LEVELS.length} 关
          </span>
        </header>
        <p className="modes-intro">从 F 和 J 出发，一关一关认识每根手指的「家」。正确率到 {FINGER_PASS_ACCURACY}% 就能过关，解锁下一关。</p>
        <div className="level-grid">
          {FINGER_LEVELS.map((l) => {
            const passed = l.id <= profile.fingerLevel;
            const open = l.id <= profile.fingerLevel + 1;
            const cls = ['level-card', passed ? 'is-passed' : '', open && !passed ? 'is-current' : ''].filter(Boolean).join(' ');
            return (
              <button
                key={l.id}
                type="button"
                className={cls}
                disabled={!open}
                aria-label={`第 ${l.id} 关：${l.name}`}
                onClick={() => navigate({ name: 'fingerLevel', level: l.id })}
              >
                <span className="level-no">第 {l.id} 关</span>
                <span className="level-name">{l.name}</span>
                <span className="level-tip">{l.tip}</span>
                <span className="tag">{passed ? '已通过' : open ? '开始' : '未解锁'}</span>
              </button>
            );
          })}
        </div>
      </div>
    </main>
  );
}

export function FingerLevelPage({ level: id }: { level: number }) {
  const { profile, update } = useProfile();
  const level = FINGER_LEVELS.find((l) => l.id === id);
  const [round, setRound] = useState(0);
  const [note, setNote] = useState('');
  const [passed, setPassed] = useState(false);
  const tokens = useMemo(() => (level ? fingerTokens(level.keys) : []), [level, round]);

  const onFinish = useCallback(
    (r: DrillResult) => {
      if (!level) return;
      const date = today();
      const ok = r.accuracy >= FINGER_PASS_ACCURACY;
      update((p) => {
        let next = recordPractice(p, { chars: 0, stars: r.stars, activeMs: r.activeMs }, date);
        if (ok) next = passFingerLevel(next, level.id);
        return grantDailyBonus(syncRewards(next, undefined, date).profile, date);
      });
      setPassed(ok);
      setNote(
        ok
          ? level.id < FINGER_LEVELS.length
            ? `过关啦！第 ${level.id + 1} 关解锁了`
            : '全部 12 关通过，指法毕业！'
          : `正确率要到 ${FINGER_PASS_ACCURACY}% 才能过关，再试一次吧`,
      );
    },
    [level, update],
  );

  if (!level || id > profile.fingerLevel + 1) {
    return (
      <main className="page">
        <div className="page-inner">
          <div className="card">
            <h1 className="display">这一关还没解锁</h1>
            <p>先把前面的关卡过了吧！</p>
            <button type="button" className="btn btn-primary" onClick={() => navigate({ name: 'finger' })}>
              回训练营
            </button>
          </div>
        </div>
      </main>
    );
  }

  const hasNext = passed && level.id < FINGER_LEVELS.length;
  return (
    <Drill
      key={`${level.id}-${round}`}
      title={`第 ${level.id} 关 · ${level.name}`}
      tokens={tokens}
      unit="键"
      back={{ label: '← 训练营', route: { name: 'finger' } }}
      onFinish={onFinish}
      onRestart={() => {
        setNote('');
        setPassed(false);
        setRound((n) => n + 1);
      }}
      onNext={
        hasNext
          ? () => {
              setNote('');
              setPassed(false);
              navigate({ name: 'fingerLevel', level: level.id + 1 });
            }
          : undefined
      }
      note={note}
    />
  );
}
