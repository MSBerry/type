import { useCallback, useMemo, useState } from 'react';
import { PINYIN_SETS, pinyinTokens } from '../drills/pinyinSets';
import { navigate } from '../router';
import { grantDailyBonus } from '../rewards/dailyTasks';
import { syncRewards } from '../rewards/rewards';
import { useProfile } from '../storage/ProfileContext';
import { recordPractice, today } from '../storage/profile';
import Drill, { type DrillResult } from './Drill';
import './Modes.css';

export function PinyinHome() {
  return (
    <main className="page">
      <div className="page-inner">
        <header className="row">
          <button type="button" className="btn" onClick={() => navigate({ name: 'home' })}>
            ← 回大厅
          </button>
          <h1 className="display modes-title">拼音快打</h1>
        </header>
        <p className="modes-intro">看字打拼音，不用打声调，ü 用 V 键。打出的每个字都算进打字量。</p>
        <div className="level-grid">
          {PINYIN_SETS.map((s) => (
            <button
              key={s.id}
              type="button"
              className="level-card is-current"
              aria-label={`${s.name}：开始练`}
              onClick={() => navigate({ name: 'pinyinSet', setId: s.id })}
            >
              <span className="level-name">{s.name}</span>
              <span className="level-tip">{s.desc}</span>
              <span className="tag">{s.items.length} 个字</span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}

export function PinyinSetPage({ setId }: { setId: string }) {
  const { update } = useProfile();
  const set = PINYIN_SETS.find((s) => s.id === setId);
  const [round, setRound] = useState(0);
  const [note, setNote] = useState('');
  const tokens = useMemo(() => (set ? pinyinTokens(set) : []), [set, round]);

  const onFinish = useCallback(
    (r: DrillResult) => {
      const date = today();
      update((p) => grantDailyBonus(syncRewards(recordPractice(p, { chars: r.count, stars: r.stars, activeMs: r.activeMs }, date), undefined, date).profile, date));
      setNote(`打了 ${r.count} 个字，都算进打字量了`);
    },
    [update],
  );

  if (!set) {
    return (
      <main className="page">
        <div className="page-inner">
          <div className="card">
            <h1 className="display">找不到这一组</h1>
            <button type="button" className="btn btn-primary" onClick={() => navigate({ name: 'pinyin' })}>
              回拼音快打
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <Drill
      key={round}
      title={`拼音快打 · ${set.name}`}
      tokens={tokens}
      unit="字"
      back={{ label: '← 拼音快打', route: { name: 'pinyin' } }}
      onFinish={onFinish}
      onRestart={() => {
        setNote('');
        setRound((n) => n + 1);
      }}
      note={note}
    />
  );
}
