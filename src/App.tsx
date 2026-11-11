import Bookshelf from './pages/Bookshelf';
import Home from './pages/Home';
import Practice from './pages/Practice';
import Result from './pages/Result';
import { useRoute } from './router';
import { ProfileProvider, useProfile } from './storage/ProfileContext';

function Screens() {
  const route = useRoute();
  const { persistent } = useProfile();
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
