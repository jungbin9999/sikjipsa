// 물주기·분갈이 예정일 계산
// 데이터정의서(2단계 ③) "핵심 계산 로직" 섹션의 공식을 그대로 구현한다.
// 규칙 기반 계산이며, 임의로 다른 계산식을 만들지 말 것.

import type { GrowthRate, PotSize } from "@/types";

/** 특이기상 플래그 — 정책정의서 "날씨 임계값 기준" 3건 */
export type WeatherAlert = "폭염" | "한파" | "장마" | null;

const SEASON_MULTIPLIER: Record<number, number> = {
  3: 1.0, 4: 1.0, 5: 1.0, // 봄
  6: 0.8, 7: 0.8, 8: 0.8, // 여름
  9: 1.0, 10: 1.0, 11: 1.0, // 가을
  12: 1.6, 1: 1.6, 2: 1.6, // 겨울
};

/** 폭염 -1일(증발 빠름) · 한파 +2일(생장 둔화) · 장마 +2일(습도 충분) */
const WEATHER_ADJUSTMENT_DAYS: Record<NonNullable<WeatherAlert>, number> = {
  폭염: -1,
  한파: 2,
  장마: 2,
};

const BASE_REPOTTING_INTERVAL_MONTHS: Record<GrowthRate, number> = {
  빠름: 12,
  보통: 24,
  느림: 36,
};

/** 뿌리 공간 여유가 적을수록 앞당김 */
const POT_SIZE_ADJUSTMENT_MONTHS: Record<PotSize, number> = {
  대: 6,
  중: 0,
  소: -6,
};

/** 분갈이 생장기 — 이 밖의 날짜는 다음 3월로 미룬다 */
const GROWING_SEASON_MONTHS = [3, 4, 5, 6];

const toDate = (value: string | Date) =>
  value instanceof Date ? new Date(value) : new Date(`${value}T00:00:00`);

/** Date → "YYYY-MM-DD" (DB date 컬럼 형식) */
export function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const addMonths = (date: Date, months: number) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
};

/**
 * 물주기 예정일
 *   seasonal_interval_days = round(기본 간격 × 계절 배율(현재월))
 *   next_watering_date     = 마지막 물준날 + seasonal_interval_days + 날씨 보정
 * 최종 간격은 seasonal_interval_days의 ±30%, 최소 3일로 제한한다.
 */
export function calcNextWateringDate({
  lastWateredAt,
  baseWateringIntervalDays,
  weatherAlert = null,
  today = new Date(),
}: {
  lastWateredAt: string | Date;
  baseWateringIntervalDays: number;
  weatherAlert?: WeatherAlert;
  today?: Date;
}): string {
  const multiplier = SEASON_MULTIPLIER[today.getMonth() + 1];
  const seasonalIntervalDays = Math.round(
    baseWateringIntervalDays * multiplier,
  );

  const adjustment = weatherAlert ? WEATHER_ADJUSTMENT_DAYS[weatherAlert] : 0;

  // 특이기상 보정이 계절 기조를 과도하게 뒤집지 않도록 ±30%로 가둔다
  const min = Math.max(3, Math.round(seasonalIntervalDays * 0.7));
  const max = Math.round(seasonalIntervalDays * 1.3);
  const intervalDays = Math.min(
    max,
    Math.max(min, seasonalIntervalDays + adjustment),
  );

  return toDateString(addDays(toDate(lastWateredAt), intervalDays));
}

/**
 * 분갈이 권장 시기
 *   next_repotting_date = 입양일 + 생장속도별 기본 개월 + 화분 크기 보정
 * 계산된 날짜가 생장기(3~6월) 밖이면 가장 가까운 다음 3월로 이동한다.
 */
export function calcNextRepottingDate({
  adoptedAt,
  growthRate,
  potSize,
}: {
  adoptedAt: string | Date;
  growthRate: GrowthRate;
  potSize: PotSize | null;
}): string {
  const months =
    BASE_REPOTTING_INTERVAL_MONTHS[growthRate] +
    (potSize ? POT_SIZE_ADJUSTMENT_MONTHS[potSize] : 0);

  const candidate = addMonths(toDate(adoptedAt), months);
  if (GROWING_SEASON_MONTHS.includes(candidate.getMonth() + 1)) {
    return toDateString(candidate);
  }

  // 휴면기 분갈이는 부담이므로 다음 생장기 시작월(3월 1일)로 미룬다
  const year =
    candidate.getMonth() + 1 > 6
      ? candidate.getFullYear() + 1
      : candidate.getFullYear();
  return toDateString(new Date(year, 2, 1));
}
