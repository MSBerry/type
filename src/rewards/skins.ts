import { SMALL_SKIN_STEP } from './config';

export type SkinKind = 'small' | 'book' | 'speed';
export type Layer =
  | 'scarf' | 'glasses' | 'hat' | 'bow' | 'monkey' | 'beret' | 'leaf'
  | 'guan' | 'fan' | 'headband' | 'scroll' | 'bunny' | 'knight' | 'spots' | 'astro';

export type Skin = { id: string; name: string; kind: SkinKind; cond: string; body: string; face: string; layers: Layer[] };

const YELLOW = { body: '#FFC93C', face: '#FFE08A' };

/** 小皮肤按这个顺序解锁，第 n 个需要累计 n × 500 字 */
export const SMALL_SKIN_ORDER = ['scarf', 'mint', 'glasses', 'straw', 'sky', 'bow', 'berry'];

const chars = (id: string) => `累计 ${(SMALL_SKIN_ORDER.indexOf(id) + 1) * SMALL_SKIN_STEP} 字`;

export const SKINS: Skin[] = [
  { id: 'classic', name: '经典键宝', kind: 'small', cond: '一开始就有', ...YELLOW, layers: [] },
  { id: 'scarf', name: '红围巾', kind: 'small', cond: chars('scarf'), ...YELLOW, layers: ['scarf'] },
  { id: 'mint', name: '薄荷键宝', kind: 'small', cond: chars('mint'), body: '#34C38F', face: '#BFF0DA', layers: [] },
  { id: 'glasses', name: '圆圆眼镜', kind: 'small', cond: chars('glasses'), ...YELLOW, layers: ['glasses'] },
  { id: 'straw', name: '小草帽', kind: 'small', cond: chars('straw'), ...YELLOW, layers: ['hat'] },
  { id: 'sky', name: '天空键宝', kind: 'small', cond: chars('sky'), body: '#6FB1FF', face: '#CFE6FF', layers: [] },
  { id: 'bow', name: '蝴蝶结', kind: 'small', cond: chars('bow'), ...YELLOW, layers: ['bow'] },
  { id: 'berry', name: '草莓键宝', kind: 'small', cond: chars('berry'), body: '#FF9FB2', face: '#FFD6DE', layers: [] },
  { id: 'archer', name: '后羿小射手', kind: 'book', cond: '读完《中国古代神话》', ...YELLOW, layers: ['leaf'] },
  { id: 'painter', name: '神笔小画家', kind: 'book', cond: '读完《中国民间故事》', ...YELLOW, layers: ['beret'] },
  { id: 'monkey', name: '美猴王', kind: 'book', cond: '读完《西游记》', body: '#F2A93B', face: '#FFE3B8', layers: ['monkey'] },
  { id: 'strategist', name: '卧龙军师', kind: 'book', cond: '读完《三国演义》', body: '#6FB1FF', face: '#DCEBFF', layers: ['guan', 'fan'] },
  { id: 'hero', name: '梁山好汉', kind: 'book', cond: '读完《水浒传》', body: '#34C38F', face: '#DDF5EA', layers: ['headband'] },
  { id: 'poet', name: '小诗仙', kind: 'book', cond: '读完古诗词小站', body: '#FFF3C4', face: '#FFFFFF', layers: ['guan', 'scroll'] },
  { id: 'bunny', name: '小兔骑士', kind: 'speed', cond: '速度到 20 字/分', body: '#FFFFFF', face: '#FFF3C4', layers: ['bunny'] },
  { id: 'horse', name: '骏马骑士', kind: 'speed', cond: '速度到 30 字/分', ...YELLOW, layers: ['knight'] },
  { id: 'cheetah', name: '猎豹闪电', kind: 'speed', cond: '速度到 40 字/分', body: '#F2A93B', face: '#FFE3B8', layers: ['spots'] },
  { id: 'rocket', name: '火箭飞行员', kind: 'speed', cond: '速度到 50 字/分', body: '#F1F3F8', face: '#FFFFFF', layers: ['astro'] },
];

export function skinById(id: string): Skin {
  return SKINS.find((s) => s.id === id) ?? SKINS[0];
}
