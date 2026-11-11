import { useState } from 'react';
import { useProfile } from '../storage/ProfileContext';
import { today } from '../storage/profile';
import WornMascot from './WornMascot';

/** 今天练够家长设的时长后，键宝提醒休息（不强制退出） */
export default function RestReminder() {
  const { profile } = useProfile();
  const [dismissed, setDismissed] = useState<string | null>(null);
  const date = today();
  const key = `${profile.id}/${date}`;
  const limit = profile.settings.dailyLimitMin;
  const minutes = profile.daily[date]?.minutes ?? 0;
  if (limit <= 0 || minutes < limit || dismissed === key) return null;
  return (
    <div role="alertdialog" aria-labelledby="rest-title" className="card rest-reminder">
      <WornMascot size={90} label="键宝" />
      <div>
        <h2 id="rest-title" className="display">
          休息一下吧！
        </h2>
        <p>今天已经练了 {Math.floor(minutes)} 分钟啦。站起来活动活动，看看远处，让眼睛歇一歇。</p>
      </div>
      <button type="button" className="btn btn-primary" onClick={() => setDismissed(key)}>
        知道啦
      </button>
    </div>
  );
}
