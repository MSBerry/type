import { useEffect } from 'react';
import Bookshelf from './pages/Bookshelf';
import { FingerCamp, FingerLevelPage } from './pages/FingerCamp';
import Game from './pages/Game';
import Home from './pages/Home';
import { PinyinHome, PinyinSetPage } from './pages/PinyinDrill';
import Practice from './pages/Practice';
import Profiles from './pages/Profiles';
import Result from './pages/Result';
import Wardrobe from './pages/Wardrobe';
import Welcome from './pages/Welcome';
import { syncRewards } from './rewards/rewards';
import { toHash, useRoute } from './router';
import { ProfileProvider, useProfile } from './storage/ProfileContext';

function Screens() {
  const route = useRoute();
  const { persistent, update, store } = useProfile();
  useEffect(() => {
    update((p) => syncRewards(p).profile);
  }, [update]);
  const hash = toHash(route);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [hash]);
  const banner = !persistent && (
    <div role="alert" className="banner storage-banner">
      这台电脑的浏览器不允许保存，关掉页面后这次的进度就没了。
    </div>
  );
  if (!store.setupDone) {
    return (
      <>
        {banner}
        <Welcome mode="first" />
      </>
    );
  }
  return (
    <>
      {banner}
      {route.name === 'home' && <Home />}
      {route.name === 'books' && <Bookshelf />}
      {route.name === 'practice' && <Practice bookId={route.bookId} segmentId={route.segmentId} />}
      {route.name === 'result' && <Result />}
      {route.name === 'wardrobe' && <Wardrobe />}
      {route.name === 'finger' && <FingerCamp />}
      {route.name === 'fingerLevel' && <FingerLevelPage key={route.level} level={route.level} />}
      {route.name === 'pinyin' && <PinyinHome />}
      {route.name === 'pinyinSet' && <PinyinSetPage key={route.setId} setId={route.setId} />}
      {route.name === 'game' && <Game />}
      {route.name === 'welcome' && <Welcome mode="add" />}
      {route.name === 'profiles' && <Profiles />}
    </>
  );
}

export default function App() {
  return (
    <ProfileProvider>
      <Screens />
    </ProfileProvider>
  );
}
