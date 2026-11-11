export type HanziToken = { kind: 'hanzi'; char: string; key: string; tone: string };
export type SkipToken = { kind: 'skip'; char: string };
export type Token = HanziToken | SkipToken;

export type Session = {
  tokens: Token[];
  /** tokens 里所有汉字的下标 */
  hanziIdx: number[];
  /** 当前是第几个汉字（hanziIdx 的下标），也等于已完成的汉字数 */
  cursor: number;
  /** 当前汉字已经打到第几个字母 */
  pos: number;
  right: number;
  wrong: number;
  streak: number;
  /** 刚才按错的键，下次按对后清空 */
  lastWrongKey: string | null;
  /** 应该按的键 → 按错次数 */
  errorsByKey: Record<string, number>;
  /** 有效打字时间（毫秒） */
  activeMs: number;
  lastPressAt: number | null;
  done: boolean;
};

export type PressResult = 'right' | 'wrong' | 'ignored';
