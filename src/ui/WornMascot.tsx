import type { ComponentProps } from 'react';
import { useProfile } from '../storage/ProfileContext';
import Mascot from './Mascot';

/** 穿着孩子选好皮肤的键宝 */
export default function WornMascot(props: Omit<ComponentProps<typeof Mascot>, 'skinId'>) {
  const { profile } = useProfile();
  return <Mascot {...props} skinId={profile.skinWorn} />;
}
