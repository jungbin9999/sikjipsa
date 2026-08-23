import type { ReactNode } from "react";

/** 라벨 / 큰 값 / 보조 설명 3단 카드 — 오늘 탭 식물별 뷰의 상태 카드 */
export default function CareStatCard({
  label,
  value,
  hint,
  tone = "paper",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "paper" | "ink" | "accent" | "lilac";
}) {
  const toneClass = {
    paper: "bg-paper text-ink",
    ink: "bg-ink text-paper",
    accent: "bg-accent text-ink",
    lilac: "bg-lilac text-ink",
  }[tone];
  const subClass = tone === "ink" ? "text-paper/60" : "text-ink/60";

  return (
    <div className={`flex-1 rounded-card px-3 py-3.5 ${toneClass}`}>
      <p className={`text-[11px] font-semibold ${subClass}`}>{label}</p>
      <p className="mt-1.5 text-lg leading-none font-extrabold">{value}</p>
      {hint && <p className={`mt-1.5 text-[11px] ${subClass}`}>{hint}</p>}
    </div>
  );
}
