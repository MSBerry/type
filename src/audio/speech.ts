import { useEffect, useState } from 'react';

function synth(): SpeechSynthesis | null {
  return typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
}

/** 找一个中文语音，普通话优先；没有就返回 null（这时隐藏「听一听」） */
export function findChineseVoice(): SpeechSynthesisVoice | null {
  const s = synth();
  if (!s) return null;
  const voices = s.getVoices();
  return voices.find((v) => /^zh[-_]CN/i.test(v.lang)) ?? voices.find((v) => /^zh/i.test(v.lang)) ?? null;
}

/** 语音列表有的浏览器要过一会儿才加载好，这里跟着更新 */
export function useChineseVoice(): SpeechSynthesisVoice | null {
  const [voice, setVoice] = useState(findChineseVoice);
  useEffect(() => {
    const s = synth();
    if (!s) return;
    const onChange = () => setVoice(findChineseVoice());
    s.addEventListener?.('voiceschanged', onChange);
    onChange();
    return () => s.removeEventListener?.('voiceschanged', onChange);
  }, []);
  return voice;
}

export function speak(text: string, voice: SpeechSynthesisVoice) {
  const s = synth();
  if (!s) return;
  s.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.voice = voice;
  u.lang = voice.lang;
  u.rate = 0.85;
  s.speak(u);
}

export function stopSpeaking() {
  synth()?.cancel();
}
