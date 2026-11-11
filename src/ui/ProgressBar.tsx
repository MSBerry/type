type Props = { value: number; label: string; color?: string; height?: number };

export default function ProgressBar({ value, label, color = 'var(--mint)', height = 16 }: Props) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={v}
      className="progress"
      style={{ height }}
    >
      <div className="progress-fill" style={{ width: `${v}%`, background: color }} />
    </div>
  );
}
