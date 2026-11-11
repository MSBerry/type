const U_UMLAUT = /[üǖǘǚǜ]/g;

/** 把「zhōng」「nǚ」这样的带声调拼音变成要按的字母：zhong、nv */
export function toKey(tonePinyin: string): string {
  return tonePinyin
    .toLowerCase()
    .replace(U_UMLAUT, 'v')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}
