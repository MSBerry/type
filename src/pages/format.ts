export function formatDuration(ms: number): string {
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function headlineFor(stars: number, name: string): string {
  if (stars >= 3) return `太棒了，${name}！`;
  if (stars === 2) return `真不错，${name}！`;
  return `完成啦，${name}！再练练会更好`;
}
