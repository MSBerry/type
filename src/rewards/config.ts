/** 累计打字量每满这么多字，解锁下一个小皮肤 */
export const SMALL_SKIN_STEP = 500;

export const SPEED_LEVELS = [
  { level: 1, name: '小兔', minSpeed: 20, skinId: 'bunny' },
  { level: 2, name: '骏马', minSpeed: 30, skinId: 'horse' },
  { level: 3, name: '猎豹', minSpeed: 40, skinId: 'cheetah' },
  { level: 4, name: '火箭', minSpeed: 50, skinId: 'rocket' },
] as const;

/** 一段至少这么多字，才能认定速度等级 */
export const SPEED_MIN_HANZI = 30;
export const SPEED_MIN_ACCURACY = 90;

export const DAILY_CHAR_GOAL = 100;
export const DAILY_TASK_BONUS = 3;

export const FINGER_LEVEL_COUNT = 12;
export const FINGER_PASS_ACCURACY = 90;
