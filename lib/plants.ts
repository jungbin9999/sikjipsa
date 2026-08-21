import plantsData from "@/data/plants.json";
import type { PlantSpecies } from "@/types";

/** 식물 종류 29종 — DB가 아니라 코드 내 정적 데이터(클라이언트에서 그대로 필터링) */
export const PLANT_SPECIES = plantsData as PlantSpecies[];

export function findSpecies(name: string): PlantSpecies | undefined {
  return PLANT_SPECIES.find((species) => species.name === name);
}

/** 종류명으로 검색 — 서버 API 없이 클라이언트에서 부분 일치 필터 */
export function searchSpecies(keyword: string): PlantSpecies[] {
  const trimmed = keyword.trim();
  if (!trimmed) return PLANT_SPECIES;
  return PLANT_SPECIES.filter((species) => species.name.includes(trimmed));
}
