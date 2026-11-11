import { useState } from 'react';
import { navigate } from '../router';
import { nextSmallSkin, nextSpeedLevel } from '../rewards/rewards';
import { type Skin, type SkinKind, SKINS, skinById } from '../rewards/skins';
import { useProfile } from '../storage/ProfileContext';
import { markSkinSeen, wearSkin } from '../storage/profile';
import Mascot from '../ui/Mascot';
import ProgressBar from '../ui/ProgressBar';
import './Wardrobe.css';

const SECTIONS: { kind: SkinKind; title: string }[] = [
  { kind: 'small', title: '小皮肤' },
  { kind: 'book', title: '大皮肤 · 读书奖励' },
  { kind: 'speed', title: '大皮肤 · 速度奖励' },
];

export default function Wardrobe() {
  const { profile, update } = useProfile();
  const [selected, setSelected] = useState(profile.skinWorn);
  const skin = skinById(selected);
  const owned = profile.skinsOwned.includes(skin.id);
  const worn = profile.skinWorn === skin.id;
  const nextSmall = nextSmallSkin(profile.totalChars);
  const nextSpeed = nextSpeedLevel(profile.bestSpeedLevel);

  const pick = (id: string) => {
    setSelected(id);
    update((p) => markSkinSeen(p, id));
  };

  return (
    <main className="page">
      <div className="page-inner">
        <header className="row spread">
          <div className="row">
            <button type="button" className="btn" onClick={() => navigate({ name: 'home' })}>
              ← 回大厅
            </button>
            <h1 className="display wardrobe-title">我的衣橱</h1>
          </div>
          <span className="chip">
            已拥有 {profile.skinsOwned.length} / {SKINS.length} 套
          </span>
        </header>

        <section className="wardrobe-rules" aria-label="怎样得到皮肤">
          <div className="card rule-card">
            <div className="rule-title">小皮肤：每累计打 500 字送 1 个</div>
            {nextSmall ? (
              <>
                <div>
                  再打 {nextSmall.remaining} 字得「{skinById(nextSmall.skinId).name}」
                </div>
                <ProgressBar value={nextSmall.percent} label="离下一个小皮肤的进度" color="var(--purple)" />
              </>
            ) : (
              <div>小皮肤全部集齐啦！</div>
            )}
          </div>
          <div className="card rule-card">
            <div className="rule-title">大皮肤：读完一整本书</div>
            <div>去读书岛，每本书都对应一套装扮</div>
          </div>
          <div className="card rule-card">
            <div className="rule-title">大皮肤：速度升到新等级</div>
            <div>{nextSpeed ? `打到 ${nextSpeed.minSpeed} 字/分，升级「${nextSpeed.name}」` : '已经是最高等级啦！'}</div>
          </div>
        </section>

        <div className="wardrobe-main">
          <section className="card wardrobe-preview" aria-label="皮肤预览">
            <div className="wardrobe-stage">
              <Mascot size={230} skinId={skin.id} label={skin.name} />
            </div>
            <div className="display wardrobe-name">{skin.name}</div>
            {worn && <div className="wardrobe-worn">键宝正穿着它</div>}
            {owned && !worn && (
              <button type="button" className="btn btn-primary" onClick={() => update((p) => wearSkin(p, skin.id))}>
                穿上它
              </button>
            )}
            {!owned && <div className="wardrobe-locked">解锁条件：{skin.cond}</div>}
          </section>

          <div className="wardrobe-lists">
            {SECTIONS.map((sec) => (
              <section key={sec.kind} className="skin-section" aria-label={sec.title}>
                <h2 className="display">{sec.title}</h2>
                <div className="skin-grid">
                  {SKINS.filter((s) => s.kind === sec.kind).map((s) => (
                    <SkinCard
                      key={s.id}
                      skin={s}
                      owned={profile.skinsOwned.includes(s.id)}
                      isNew={profile.skinsNew.includes(s.id)}
                      selected={s.id === selected}
                      onPick={() => pick(s.id)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

type CardProps = { skin: Skin; owned: boolean; isNew: boolean; selected: boolean; onPick: () => void };

function SkinCard({ skin, owned, isNew, selected, onPick }: CardProps) {
  const cls = ['skin-card', selected ? 'is-selected' : '', owned ? '' : 'is-locked'].filter(Boolean).join(' ');
  return (
    <button type="button" className={cls} aria-pressed={selected} aria-label={`${skin.name}：${owned ? '已拥有' : skin.cond}`} onClick={onPick}>
      {isNew && <span className="skin-new">NEW</span>}
      {!owned && (
        <span className="skin-lock" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1F2A44" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
        </span>
      )}
      <Mascot size={110} skinId={skin.id} label={skin.name} />
      <span className="skin-name">{skin.name}</span>
    </button>
  );
}
