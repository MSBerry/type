import { afterEach, describe, expect, it, vi } from 'vitest';
import { findChineseVoice, speak } from './speech';

function installSpeech(voices: { lang: string; name: string }[]) {
  const synth = { getVoices: () => voices, speak: vi.fn(), cancel: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() };
  vi.stubGlobal('speechSynthesis', synth);
  vi.stubGlobal(
    'SpeechSynthesisUtterance',
    class {
      text: string;
      voice: unknown = null;
      lang = '';
      rate = 1;
      constructor(text: string) {
        this.text = text;
      }
    },
  );
  return synth;
}

describe('speech', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('优先选普通话语音', () => {
    installSpeech([
      { lang: 'en-US', name: 'Alex' },
      { lang: 'zh-HK', name: 'Sinji' },
      { lang: 'zh-CN', name: 'Tingting' },
    ]);
    expect(findChineseVoice()?.name).toBe('Tingting');
  });

  it('没有中文语音就返回 null', () => {
    installSpeech([{ lang: 'en-US', name: 'Alex' }]);
    expect(findChineseVoice()).toBeNull();
  });

  it('浏览器不支持语音也返回 null', () => {
    expect(findChineseVoice()).toBeNull();
  });

  it('朗读前先停掉上一次', () => {
    const synth = installSpeech([{ lang: 'zh-CN', name: 'Tingting' }]);
    speak('花果山', findChineseVoice()!);
    expect(synth.cancel).toHaveBeenCalled();
    expect(synth.speak).toHaveBeenCalledWith(expect.objectContaining({ text: '花果山', lang: 'zh-CN' }));
  });
});
