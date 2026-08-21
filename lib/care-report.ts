import { toDateString } from "@/lib/care-calc";
import { supabase } from "@/lib/supabase";
import type { CareLog } from "@/types";

export interface CareReport {
  /** 최근 7일 예정 항목 중 완료 비율(%) */
  weeklyCompletionRate: number;
  weeklyDone: number;
  weeklyTotal: number;
  /** 완료 기록이 하루도 끊기지 않고 이어진 일수 */
  streakDays: number;
}

const DAY_MS = 86400000;

/**
 * 케어 리포트 — 별도 저장 엔티티가 아니라 케어 이력을 집계한 계산값
 * (데이터정의서 "(파생) 케어 리포트", 표시 시점에 산출)
 */
export async function loadCareReport(plantIds: string[]): Promise<CareReport> {
  const empty: CareReport = {
    weeklyCompletionRate: 0,
    weeklyDone: 0,
    weeklyTotal: 0,
    streakDays: 0,
  };
  if (plantIds.length === 0) return empty;

  const today = new Date(new Date().toDateString());
  const weekAgo = new Date(today.getTime() - 6 * DAY_MS);

  const { data } = await supabase
    .from("care_logs")
    .select("*")
    .in("plant_id", plantIds);
  const logs = (data ?? []) as CareLog[];

  const weekly = logs.filter(
    (log) =>
      log.scheduled_date >= toDateString(weekAgo) &&
      log.scheduled_date <= toDateString(today),
  );
  const weeklyDone = weekly.filter((log) => log.is_completed).length;

  // 완료한 날짜만 모아 오늘(또는 어제)부터 거꾸로 이어지는 일수를 센다
  const completedDates = new Set(
    logs
      .filter((log) => log.is_completed && log.completed_at)
      .map((log) => log.completed_at as string),
  );

  let streakDays = 0;
  const cursor = new Date(today);
  if (!completedDates.has(toDateString(cursor))) {
    cursor.setDate(cursor.getDate() - 1); // 오늘 아직 안 했어도 어제까지 이어졌으면 유지
  }
  while (completedDates.has(toDateString(cursor))) {
    streakDays += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return {
    weeklyDone,
    weeklyTotal: weekly.length,
    weeklyCompletionRate:
      weekly.length === 0 ? 0 : Math.round((weeklyDone / weekly.length) * 100),
    streakDays,
  };
}
