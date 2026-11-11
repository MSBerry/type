import { useEffect } from 'react';
import Bookshelf from './pages/Bookshelf';
import { FingerCamp, FingerLevelPage } from './pages/FingerCamp';
import Home from './pages/Home';
import Practice from './pages/Practice';
import Result from './pages/Result';
import Wardrobe from './pages/Wardrobe';
import { syncRewards } from './rewards/rewards';
import { toHash, useRoute } from './router';
import { ProfileProvider, useProfile } from './storage/ProfileContext';

function Screens() {
  const route = useRoute();
  const { persistent, update } = useProfile();
  useEffect(() => {
    update((p) => syncRewards(p).profile);
  }, [update]);
  const hash = toHash(route);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [hash]);
  return (
    <>
      {!persistent && (
        <div role="alert" className="banner storage-banner">
          这台电脑的浏览器不允许保存，关掉页面后这次的进度就没了。
        </div>
      )}
      {route.name === 'home' && <Home />}
      {route.name === 'books' && <Bookshelf />}
      {route.name === 'practice' && <Practice bookId={route.bookId} segmentId={route.segmentId} />}
      {route.name === 'result' && <Result />}
      {route.name === 'wardrobe' && <Wardrobe />}
      {route.name === 'finger' && <FingerCamp />}
      {route.name === 'fingerLevel' && <FingerLevelPage key={route.level} level={route.level} />}
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
