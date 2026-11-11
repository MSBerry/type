import { useEffect, useState } from 'react';

export type Route =
  | { name: 'home' }
  | { name: 'books' }
  | { name: 'practice'; bookId: string; segmentId: string }
  | { name: 'result' }
  | { name: 'wardrobe' };

export function parseHash(hash: string): Route {
  let parts: string[];
  try {
    parts = hash
      .replace(/^#\/?/, '')
      .split('/')
      .filter(Boolean)
      .map((p) => decodeURIComponent(p));
  } catch {
    return { name: 'home' };
  }
  if (parts[0] === 'books') return { name: 'books' };
  if (parts[0] === 'practice' && parts.length === 3) return { name: 'practice', bookId: parts[1], segmentId: parts[2] };
  if (parts[0] === 'result') return { name: 'result' };
  if (parts[0] === 'wardrobe') return { name: 'wardrobe' };
  return { name: 'home' };
}

export function toHash(route: Route): string {
  switch (route.name) {
    case 'home':
      return '#/';
    case 'books':
      return '#/books';
    case 'practice':
      return `#/practice/${encodeURIComponent(route.bookId)}/${encodeURIComponent(route.segmentId)}`;
    case 'result':
      return '#/result';
    case 'wardrobe':
      return '#/wardrobe';
  }
}

export function navigate(route: Route): void {
  window.location.hash = toHash(route);
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
