/** 케어현황 링 — 완료 비율을 원형 게이지로 표시 */
export default function CareRing({
  label,
  done,
  total,
}: {
  label: string;
  done: number;
  total: number;
}) {
  const ratio = total === 0 ? 1 : done / total;
  const radius = 26;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="flex flex-1 flex-col items-center gap-1.5">
      <div className="relative size-16">
        <svg viewBox="0 0 64 64" className="size-16 -rotate-90">
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            strokeWidth="6"
            className="stroke-ink/10"
          />
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - ratio)}
            className="stroke-accent transition-[stroke-dashoffset] duration-500"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
          {total === 0 ? "—" : `${done}/${total}`}
        </span>
      </div>
      <span className="text-[11px] font-medium text-ink/60">{label}</span>
    </div>
  );
}
