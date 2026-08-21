"use client";

import type { Plant } from "@/types";

/**
 * 오늘 탭에서 식물을 골라 그 식물 기준으로 화면을 바꾸는 가로 칩.
 * 식물마다 물주기·분갈이·배치 설정이 달라 한 화면에 다 펼치면 읽기 어려워 선택식으로 둔다.
 */
export default function PlantSelector({
  plants,
  selectedId,
  onSelect,
  duePlantIds,
}: {
  plants: Plant[];
  /** null이면 "전체" */
  selectedId: string | null;
  onSelect: (plantId: string | null) => void;
  /** 오늘 처리할 항목이 있는 식물 — 칩에 점으로 표시 */
  duePlantIds: Set<string>;
}) {
  const chipClass = (isActive: boolean) =>
    `flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition ${
      isActive ? "bg-ink text-paper" : "bg-paper text-ink/50"
    }`;

  return (
    <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={chipClass(selectedId === null)}
      >
        전체
      </button>
      {plants.map((plant) => (
        <button
          key={plant.plant_id}
          type="button"
          onClick={() => onSelect(plant.plant_id)}
          className={chipClass(selectedId === plant.plant_id)}
        >
          <span className="max-w-24 truncate">{plant.nickname}</span>
          {duePlantIds.has(plant.plant_id) && (
            <span className="size-1.5 rounded-full bg-accent" />
          )}
        </button>
      ))}
    </div>
  );
}
