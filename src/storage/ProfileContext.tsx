import { type ReactNode, createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { SegmentResult } from '../engine/stats';
import { type Profile, type Store, activeProfile, getStorage, loadStore, replaceProfile, saveStore } from './profile';

type ProfileCtx = {
  profile: Profile;
  /** 整份存档：所有小朋友、导入的文章 */
  store: Store;
  updateStore: (fn: (s: Store) => Store) => void;
  /** false 表示这次的进度不会保存 */
  persistent: boolean;
  update: (fn: (p: Profile) => Profile) => void;
  lastResult: SegmentResult | null;
  setLastResult: (r: SegmentResult | null) => void;
};

const Ctx = createContext<ProfileCtx | null>(null);

type Props = {
  children: ReactNode;
  /** 不传就自动用浏览器的 localStorage；传 null 表示不能存储 */
  storage?: Storage | null;
  /** 用于测试和预览：直接带一份成绩进入结算页 */
  initialResult?: SegmentResult;
};

export function ProfileProvider({ children, storage, initialResult }: Props) {
  const [state, setState] = useState(() => {
    const st = storage === undefined ? getStorage() : storage;
    const { store, persistent } = loadStore(st);
    return { st, store, persistent };
  });
  const [lastResult, setLastResult] = useState<SegmentResult | null>(initialResult ?? null);

  const updateStore = useCallback((fn: (s: Store) => Store) => {
    setState((prev) => {
      const store = fn(prev.store);
      if (store === prev.store) return prev;
      const ok = prev.persistent && prev.st !== null && saveStore(prev.st, store);
      return { ...prev, store, persistent: prev.persistent && ok };
    });
  }, []);

  const update = useCallback(
    (fn: (p: Profile) => Profile) =>
      updateStore((s) => {
        const current = activeProfile(s);
        const next = fn(current);
        return next === current ? s : replaceProfile(s, next);
      }),
    [updateStore],
  );

  const value = useMemo<ProfileCtx>(
    () => ({ profile: activeProfile(state.store), store: state.store, updateStore, persistent: state.persistent, update, lastResult, setLastResult }),
    [state, update, updateStore, lastResult],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProfile(): ProfileCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useProfile 必须放在 <ProfileProvider> 里面使用');
  return v;
}
