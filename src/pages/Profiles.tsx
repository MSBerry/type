import { navigate } from '../router';
import { useProfile } from '../storage/ProfileContext';
import { switchProfile } from '../storage/profile';
import Avatar from '../ui/Avatar';
import './Family.css';

export default function Profiles() {
  const { store, updateStore, setLastResult } = useProfile();
  const pick = (id: string) => {
    if (id !== store.activeId) {
      updateStore((s) => switchProfile(s, id));
      setLastResult(null);
    }
    navigate({ name: 'home' });
  };

  return (
    <main className="page">
      <div className="page-inner family">
        <header className="row spread">
          <button type="button" className="btn" onClick={() => navigate({ name: 'home' })}>
            ← 回大厅
          </button>
          <h1 className="display family-title">谁在练习？</h1>
          <span />
        </header>
        <div className="who-list">
          {store.profiles.map((p) => {
            const current = p.id === store.activeId;
            return (
              <button
                key={p.id}
                type="button"
                className={current ? 'who-card is-current' : 'who-card'}
                aria-label={`${p.nickname}，${p.grade} 年级${current ? '（正在用）' : ''}`}
                onClick={() => pick(p.id)}
              >
                <Avatar avatar={p.avatar} name={p.nickname} size={88} />
                <span className="who-name">{p.nickname}</span>
                <span>
                  {p.grade} 年级 · 星星 <b className="latin">{p.stars}</b>
                </span>
                {current && <span className="tag">正在用</span>}
              </button>
            );
          })}
        </div>
        <button type="button" className="btn btn-primary" onClick={() => navigate({ name: 'welcome' })}>
          ＋ 加一个小朋友
        </button>
      </div>
    </main>
  );
}
