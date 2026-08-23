/**
 * 케어현황 링 — "지금 내 식물들이 제대로 관리되고 있는가"를 전체 식물 대비 비율로 보여준다.
 * 무엇의 비율인지 바로 읽히도록 링 아래에 상태 문구를 함께 둔다.
 */
export default function CareRing({
  label,
  done,
  total,
  hint,
}: {
  label: string;
  done: number;
  total: number;
  hint: string;
}) {
  const ratio = total === 0 ? 1 : done / total;
  const isAllGood = done === total;
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
            className={`transition-[stroke-dashoffset] duration-500 ${
              isAllGood ? "stroke-accent" : "stroke-lilac"
            }`}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-extrabold">
          {done}
          <span className="text-[11px] font-semibold text-ink/60">/{total}</span>
        </span>
      </div>
      <span className="text-[11px] font-bold">{label}</span>
      <span className="text-[10px] leading-tight text-ink/60">{hint}</span>
    </div>
  );
}
