export type Badge = { id: string; name: string; desc: string };

export const BADGES: Badge[] = [
  { id: 'first', name: '初次上手', desc: '打完第一段' },
  { id: 'perfect', name: '一个不错', desc: '30 字以上的一段全对' },
  { id: 'streak-50', name: '连对 50', desc: '一段里连续按对 50 个键' },
  { id: 'chars-1000', name: '千字小将', desc: '累计打 1000 字' },
  { id: 'chars-5000', name: '五千字达人', desc: '累计打 5000 字' },
  { id: 'chars-10000', name: '万字大师', desc: '累计打 10000 字' },
  { id: 'days-3', name: '坚持 3 天', desc: '连续 3 天练习' },
  { id: 'days-7', name: '坚持 7 天', desc: '连续 7 天练习' },
  { id: 'book-1', name: '读完 1 本', desc: '读完一整本书' },
  { id: 'book-3', name: '读完 3 本', desc: '读完三本书' },
  { id: 'speed-1', name: '小兔速度', desc: '速度到 20 字/分' },
  { id: 'speed-2', name: '骏马速度', desc: '速度到 30 字/分' },
  { id: 'speed-3', name: '猎豹速度', desc: '速度到 40 字/分' },
  { id: 'speed-4', name: '火箭速度', desc: '速度到 50 字/分' },
  { id: 'huaguoshan', name: '花果山', desc: '打完《西游记》第一回' },
  { id: 'finger-grad', name: '指法毕业', desc: '通过指法训练营全部 12 关' },
];
