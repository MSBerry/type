const STAR = 'M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z';

export default function StarRow({ count, size = 28 }: { count: number; size?: number }) {
  return (
    <span role="img" aria-label={`${count} 颗星`} className="star-row">
      {[1, 2, 3].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
          <path d={STAR} fill={i <= count ? '#FFC93C' : '#FFFFFF'} stroke="#1F2A44" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      ))}
    </span>
  );
}
