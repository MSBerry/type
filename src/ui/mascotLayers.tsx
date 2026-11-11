import type { ReactNode } from 'react';
import type { Layer } from '../rewards/skins';

const INK = '#1F2A44';

/** 画在身体后面的配饰 */
export const BEHIND_LAYERS: Partial<Record<Layer, ReactNode>> = {
  bunny: (
    <g data-layer="bunny">
      <ellipse cx="44" cy="2" rx="10" ry="24" fill="#FFFFFF" stroke={INK} strokeWidth="4" />
      <ellipse cx="44" cy="4" rx="4" ry="15" fill="#FF9FB2" />
      <ellipse cx="76" cy="2" rx="10" ry="24" fill="#FFFFFF" stroke={INK} strokeWidth="4" />
      <ellipse cx="76" cy="4" rx="4" ry="15" fill="#FF9FB2" />
    </g>
  ),
};

/** 画在身体前面的配饰 */
export const FRONT_LAYERS: Partial<Record<Layer, ReactNode>> = {
  spots: (
    <g data-layer="spots" fill="#8A5A1E">
      <ellipse cx="30" cy="97" rx="5" ry="3.5" />
      <ellipse cx="54" cy="99" rx="4" ry="3" />
      <ellipse cx="80" cy="97" rx="5" ry="3.5" />
      <ellipse cx="19" cy="62" rx="3" ry="5" />
      <ellipse cx="101" cy="62" rx="3" ry="5" />
    </g>
  ),
  glasses: (
    <g data-layer="glasses" fill="none" stroke={INK} strokeWidth="3.5">
      <circle cx="46" cy="52" r="12" />
      <circle cx="74" cy="52" r="12" />
      <path d="M58 52 H62" />
    </g>
  ),
  scarf: (
    <g data-layer="scarf" stroke={INK} strokeWidth="4" strokeLinejoin="round" fill="#E8483B">
      <path d="M16 84 H104 V96 H16 Z" />
      <path d="M76 94 L84 114 L94 110 L88 94" />
    </g>
  ),
  hat: (
    <g data-layer="hat" stroke={INK} strokeWidth="4" strokeLinejoin="round">
      <path d="M34 26 Q36 2 60 2 Q84 2 86 26 Z" fill="#F4D27A" />
      <path d="M36 15 H84 V22 H35 Z" fill="#E8483B" strokeWidth="3" />
      <ellipse cx="60" cy="26" rx="54" ry="9" fill="#F4D27A" />
    </g>
  ),
  bow: (
    <g data-layer="bow" fill="#FF5C8A" stroke={INK} strokeWidth="3.5" strokeLinejoin="round">
      <path d="M92 20 L76 8 L76 32 Z" />
      <path d="M92 20 L108 8 L108 32 Z" />
      <circle cx="92" cy="20" r="5" />
    </g>
  ),
  monkey: (
    <g data-layer="monkey">
      <circle cx="10" cy="58" r="11" fill="#F2C4A0" stroke={INK} strokeWidth="4" />
      <circle cx="110" cy="58" r="11" fill="#F2C4A0" stroke={INK} strokeWidth="4" />
      <g fill="none" strokeLinecap="round">
        <path d="M18 38 Q60 26 102 38" stroke={INK} strokeWidth="12" />
        <path d="M18 38 Q60 26 102 38" stroke="#F4B400" strokeWidth="6" />
      </g>
    </g>
  ),
  beret: (
    <g data-layer="beret">
      <ellipse cx="56" cy="22" rx="36" ry="12" fill="#6A4DE8" stroke={INK} strokeWidth="4" transform="rotate(-8 56 22)" />
      <rect x="52" y="4" width="6" height="9" rx="3" fill={INK} />
      <path d="M106 66 L118 38" stroke="#8A5A1E" strokeWidth="5" strokeLinecap="round" />
      <circle cx="119" cy="35" r="4.5" fill="#E8483B" stroke={INK} strokeWidth="2" />
    </g>
  ),
  leaf: (
    <g data-layer="leaf" fill="#34C38F" stroke={INK} strokeWidth="3">
      <path d="M28 28 H92" stroke="#2BA57A" strokeWidth="6" strokeLinecap="round" fill="none" />
      <ellipse cx="44" cy="16" rx="6" ry="12" transform="rotate(-28 44 16)" />
      <ellipse cx="60" cy="12" rx="6" ry="13" />
      <ellipse cx="76" cy="16" rx="6" ry="12" transform="rotate(28 76 16)" />
    </g>
  ),
  guan: (
    <g data-layer="guan" stroke={INK} strokeWidth="4" strokeLinejoin="round">
      <path d="M32 26 V8 Q60 -4 88 8 V26 Z" fill="#2B3F6B" />
      <path d="M32 26 H88" strokeWidth="6" />
      <path d="M30 26 L20 40 M90 26 L100 40" strokeLinecap="round" />
    </g>
  ),
  fan: (
    <g data-layer="fan" stroke={INK} strokeWidth="3" strokeLinejoin="round">
      <path d="M112 42 L100 18 Q112 10 126 16 Z" fill="#FFFFFF" />
      <path d="M112 42 L113 16 M112 42 L120 14" fill="none" />
      <path d="M112 42 L110 58" strokeWidth="5" strokeLinecap="round" />
    </g>
  ),
  headband: (
    <g data-layer="headband" stroke={INK} strokeWidth="4" strokeLinejoin="round" fill="#E8483B">
      <path d="M15 34 Q60 24 105 34 V44 Q60 34 15 44 Z" />
      <path d="M104 38 L120 30 L118 44 Z" />
    </g>
  ),
  scroll: (
    <g data-layer="scroll" stroke={INK} strokeWidth="3" strokeLinejoin="round">
      <rect x="104" y="20" width="20" height="30" fill="#FFF3C4" />
      <path d="M100 20 H128 M100 50 H128" strokeWidth="5" strokeLinecap="round" />
    </g>
  ),
  knight: (
    <g data-layer="knight" stroke={INK} strokeLinejoin="round">
      <path d="M60 12 Q66 -12 88 -16 Q78 0 70 12 Z" fill="#E8483B" strokeWidth="3.5" />
      <path d="M16 40 V36 Q16 12 60 12 Q104 12 104 36 V40 Z" fill="#C9D3E3" strokeWidth="4" />
      <path d="M30 30 H90" strokeWidth="3" fill="none" />
    </g>
  ),
  astro: (
    <g data-layer="astro">
      <circle cx="60" cy="58" r="60" fill="#DCEBFF" fillOpacity="0.35" stroke={INK} strokeWidth="4" />
      <path d="M24 34 Q34 12 56 6" fill="none" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" />
    </g>
  ),
};

/** 戴这些配饰时不显示天线 */
export const HEADWEAR: Layer[] = ['hat', 'beret', 'leaf', 'guan', 'knight', 'astro'];
