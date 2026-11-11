import { skinById } from '../rewards/skins';
import { BEHIND_LAYERS, FRONT_LAYERS, HEADWEAR } from './mascotLayers';

type Props = {
  size?: number;
  mood?: 'happy' | 'oops' | 'cheer';
  label?: string;
  skinId?: string;
};

const INK = '#1F2A44';

export default function Mascot({ size = 120, mood = 'happy', label = '键宝', skinId = 'classic' }: Props) {
  const skin = skinById(skinId);
  const up = mood === 'cheer';
  const hasHeadwear = skin.layers.some((l) => HEADWEAR.includes(l));
  return (
    <svg width={size} height={size} viewBox="-12 -26 144 146" role="img" aria-label={label} data-mood={mood}>
      <ellipse cx="60" cy="113" rx="34" ry="5" fill={INK} opacity="0.18" />
      {skin.layers.map((l) => (
        <g key={l}>{BEHIND_LAYERS[l]}</g>
      ))}
      <path d={up ? 'M16 60 Q4 50 10 36' : 'M16 72 Q4 66 7 54'} fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" />
      <path d={up ? 'M104 60 Q116 50 110 36' : 'M104 64 Q118 56 112 40'} fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" />
      <rect x="36" y="99" width="16" height="10" rx="5" fill={INK} />
      <rect x="68" y="99" width="16" height="10" rx="5" fill={INK} />
      {!hasHeadwear && (
        <g data-part="antenna">
          <path d="M60 22 V11" stroke={INK} strokeWidth="4" strokeLinecap="round" />
          <circle cx="60" cy="9" r="6" fill="#FF7A45" stroke={INK} strokeWidth="3.5" />
        </g>
      )}
      <rect data-part="body" x="14" y="22" width="92" height="84" rx="24" fill={skin.body} stroke={INK} strokeWidth="4" />
      <rect x="24" y="28" width="72" height="60" rx="18" fill={skin.face} />
      {up ? (
        <>
          <path d="M38 52 Q46 44 54 52" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" />
          <path d="M66 52 Q74 44 82 52" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="46" cy="52" r="7" fill={INK} />
          <circle cx="74" cy="52" r="7" fill={INK} />
          <circle cx="48.5" cy="49.5" r="2.4" fill="#FFFFFF" />
          <circle cx="76.5" cy="49.5" r="2.4" fill="#FFFFFF" />
        </>
      )}
      <ellipse cx="35" cy="65" rx="6" ry="3.5" fill="#FF9A76" />
      <ellipse cx="85" cy="65" rx="6" ry="3.5" fill="#FF9A76" />
      {mood === 'oops' ? (
        <path d="M52 70 Q60 63 68 70" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      ) : (
        <path d="M52 64 Q60 72 68 64" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      )}
      {skin.layers.map((l) => (
        <g key={l}>{FRONT_LAYERS[l]}</g>
      ))}
    </svg>
  );
}
