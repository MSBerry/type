import { useState } from 'react';
import { navigate } from '../router';
import { useProfile } from '../storage/ProfileContext';
import { type Profile, setupChild } from '../storage/profile';
import Avatar, { AVATARS } from '../ui/Avatar';
import Mascot from '../ui/Mascot';
import './Family.css';

const GRADES: { g: Profile['grade']; label: string }[] = [
  { g: 4, label: '四年级' },
  { g: 5, label: '五年级' },
  { g: 6, label: '六年级' },
];

/** 首次启动（mode=first）和加一个小朋友（mode=add）共用：选头像 → 起名字 → 选年级 */
export default function Welcome({ mode }: { mode: 'first' | 'add' }) {
  const { updateStore, setLastResult } = useProfile();
  const [step, setStep] = useState(0);
  const [avatar, setAvatar] = useState('sun');
  const [nickname, setNickname] = useState('');
  const [grade, setGrade] = useState<Profile['grade'] | null>(null);
  const name = nickname.trim();

  const finish = () => {
    if (!name || grade === null) return;
    updateStore((s) => setupChild(s, { nickname: name, grade, avatar }));
    setLastResult(null);
    navigate({ name: 'home' });
  };

  return (
    <main className="page">
      <div className="page-inner family">
        <header className="family-hero">
          <Mascot size={110} mood="cheer" label="键宝" />
          <div>
            <h1 className="display family-title">{mode === 'first' ? '欢迎来到小键盘大冒险！' : '加一个小朋友'}</h1>
            <p>我是键宝，先来认识一下你吧～</p>
          </div>
          {mode === 'add' && (
            <button type="button" className="btn" style={{ marginLeft: 'auto' }} onClick={() => navigate({ name: 'profiles' })}>
              ← 取消
            </button>
          )}
        </header>

        <section className="card">
          {step === 0 && (
            <>
              <h2 className="display family-step">第 1 步：选一个头像</h2>
              <div className="avatar-grid">
                {AVATARS.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    className="avatar-pick"
                    aria-pressed={avatar === a.id}
                    aria-label={`头像：${a.name}`}
                    onClick={() => setAvatar(a.id)}
                  >
                    <Avatar avatar={a.id} name={name || '我'} size={72} />
                    {a.name}
                  </button>
                ))}
              </div>
            </>
          )}
          {step === 1 && (
            <>
              <h2 className="display family-step">第 2 步：你叫什么名字？</h2>
              <input
                className="name-input"
                aria-label="你叫什么名字？"
                placeholder="比如：小明"
                maxLength={8}
                value={nickname}
                autoFocus
                onChange={(e) => setNickname(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && name) setStep(2);
                }}
              />
            </>
          )}
          {step === 2 && (
            <>
              <h2 className="display family-step">第 3 步：你上几年级？</h2>
              <div className="grade-row">
                {GRADES.map(({ g, label }) => (
                  <button key={g} type="button" className="btn" aria-pressed={grade === g} onClick={() => setGrade(g)}>
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="family-nav">
            {step > 0 && (
              <button type="button" className="btn" onClick={() => setStep(step - 1)}>
                上一步
              </button>
            )}
            {step < 2 ? (
              <button type="button" className="btn btn-primary" disabled={step === 1 && !name} onClick={() => setStep(step + 1)}>
                下一步
              </button>
            ) : (
              <button type="button" className="btn btn-primary" disabled={grade === null} onClick={finish}>
                开始冒险！
              </button>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
