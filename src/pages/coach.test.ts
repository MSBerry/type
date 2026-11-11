import { describe, expect, it } from 'vitest';
import { createSession } from '../engine/session';
import { coachMessage } from './coach';

const s = createSession([{ kind: 'hanzi', char: '海', key: 'hai', tone: 'hǎi' }]);

describe('coachMessage', () => {
  it('还没开始', () => expect(coachMessage(s)).toBe('跟着发光的键走，一个字一个字来！'));
  it('按错了，说出按到哪个键', () => expect(coachMessage({ ...s, lastWrongKey: 'x', wrong: 1 })).toBe('哎呀，按到 X 啦。看看发光的那个键！'));
  it('每连对 10 个夸一次', () => expect(coachMessage({ ...s, right: 10, streak: 10 })).toBe('连对 10 个字母，你是打字小能手！'));
  it('普通按对', () => expect(coachMessage({ ...s, right: 3, streak: 3 })).toBe('对啦！继续加油～'));
  it('完成', () => expect(coachMessage({ ...s, done: true })).toBe('整段完成！你真棒！'));
});
