import type { Session } from '../engine/types';

export function coachMessage(s: Session): string {
  if (s.done) return '整段完成！你真棒！';
  if (s.lastWrongKey) return `哎呀，按到 ${s.lastWrongKey.toUpperCase()} 啦。看看发光的那个键！`;
  if (s.streak > 0 && s.streak % 10 === 0) return `连对 ${s.streak} 个字母，你是打字小能手！`;
  if (s.right > 0) return '对啦！继续加油～';
  return '跟着发光的键走，一个字一个字来！';
}
