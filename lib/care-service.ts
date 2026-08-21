import {
  calcNextRepottingDate,
  calcNextWateringDate,
  toDateString,
  type WeatherAlert,
} from "@/lib/care-calc";
import { findSpecies } from "@/lib/plants";
import { supabase } from "@/lib/supabase";
import type { CareLog, Plant } from "@/types";

export interface TodayCareItem {
  log: CareLog;
  plant: Plant;
}

/**
 * 화면 진입 시 물주기 예정일을 다시 계산한다(서버 스케줄러 없이 on-demand).
 * 날씨가 바뀌면 예정일도 따라 바뀌므로 값이 달라진 식물만 갱신한다.
 */
export async function recalcWateringSchedule(
  plants: Plant[],
  weatherAlert: WeatherAlert,
): Promise<Plant[]> {
  const updated = await Promise.all(
    plants.map(async (plant) => {
      const species = findSpecies(plant.species);
      if (!species) return plant;

      const nextWateringDate = calcNextWateringDate({
        lastWateredAt: plant.last_watered_at,
        baseWateringIntervalDays: species.base_watering_interval_days,
        weatherAlert,
      });
      if (nextWateringDate === plant.next_watering_date) return plant;

      await supabase
        .from("plants")
        .update({ next_watering_date: nextWateringDate })
        .eq("plant_id", plant.plant_id);

      // 아직 완료하지 않은 물주기 예정 이력도 같은 날짜로 맞춘다
      await supabase
        .from("care_logs")
        .update({ scheduled_date: nextWateringDate })
        .eq("plant_id", plant.plant_id)
        .eq("care_type", "물주기")
        .eq("is_completed", false);

      return { ...plant, next_watering_date: nextWateringDate };
    }),
  );
  return updated;
}

/** 오늘 처리 대상 — 예정일이 오늘이거나 지난 미완료 항목 */
export async function loadTodayCareItems(
  plants: Plant[],
): Promise<TodayCareItem[]> {
  if (plants.length === 0) return [];

  const { data } = await supabase
    .from("care_logs")
    .select("*")
    .eq("is_completed", false)
    .lte("scheduled_date", toDateString(new Date()))
    .order("scheduled_date", { ascending: true });

  const plantById = new Map(plants.map((plant) => [plant.plant_id, plant]));
  return ((data ?? []) as CareLog[])
    .filter((log) => plantById.has(log.plant_id))
    .map((log) => ({ log, plant: plantById.get(log.plant_id)! }));
}

/** 다가오는 일정 — 예정일이 오늘 이후인 미완료 항목 */
export async function loadUpcomingCareItems(
  plants: Plant[],
  limit = 3,
): Promise<TodayCareItem[]> {
  if (plants.length === 0) return [];

  const { data } = await supabase
    .from("care_logs")
    .select("*")
    .eq("is_completed", false)
    .gt("scheduled_date", toDateString(new Date()))
    .order("scheduled_date", { ascending: true });

  const plantById = new Map(plants.map((plant) => [plant.plant_id, plant]));
  return ((data ?? []) as CareLog[])
    .filter((log) => plantById.has(log.plant_id))
    .map((log) => ({ log, plant: plantById.get(log.plant_id)! }))
    .slice(0, limit);
}

/**
 * 케어 완료 처리 — 이력을 완료로 바꾸고, 물주기면 마지막 물준날·다음 예정일을
 * 갱신한 뒤 다음 회차 이력을 만든다.
 */
export async function completeCareItem(
  item: TodayCareItem,
  weatherAlert: WeatherAlert,
): Promise<void> {
  const today = toDateString(new Date());

  await supabase
    .from("care_logs")
    .update({ is_completed: true, completed_at: today })
    .eq("care_log_id", item.log.care_log_id);

  const species = findSpecies(item.plant.species);
  if (!species) return;

  if (item.log.care_type === "분갈이") {
    // 다음 분갈이는 입양일이 아니라 이번 분갈이 날짜를 기준으로 다시 잡는다
    const nextRepottingDate = calcNextRepottingDate({
      adoptedAt: today,
      growthRate: species.growth_rate,
      potSize: item.plant.pot_size,
    });
    await supabase
      .from("plants")
      .update({ next_repotting_date: nextRepottingDate })
      .eq("plant_id", item.plant.plant_id);
    await supabase.from("care_logs").insert({
      plant_id: item.plant.plant_id,
      care_type: "분갈이",
      scheduled_date: nextRepottingDate,
    });
    return;
  }

  const nextWateringDate = calcNextWateringDate({
    lastWateredAt: today,
    baseWateringIntervalDays: species.base_watering_interval_days,
    weatherAlert,
  });

  await supabase
    .from("plants")
    .update({ last_watered_at: today, next_watering_date: nextWateringDate })
    .eq("plant_id", item.plant.plant_id);

  await supabase.from("care_logs").insert({
    plant_id: item.plant.plant_id,
    care_type: "물주기",
    scheduled_date: nextWateringDate,
  });
}

/**
 * 배치 위치 변경 — 인라인 수정 후 저장(SC-07)
 */
export async function updateLightCondition(
  plantId: string,
  lightCondition: string,
): Promise<void> {
  await supabase
    .from("plants")
    .update({ light_condition: lightCondition })
    .eq("plant_id", plantId);
}

/**
 * 화분 크기 변경 — 분갈이 주기 보정값이 바뀌므로 예정일도 다시 계산한다.
 */
export async function updatePotSize(
  plant: Plant,
  potSize: Plant["pot_size"],
): Promise<string | null> {
  const species = findSpecies(plant.species);
  if (!species) return null;

  const nextRepottingDate = calcNextRepottingDate({
    adoptedAt: plant.adopted_at,
    growthRate: species.growth_rate,
    potSize,
  });

  await supabase
    .from("plants")
    .update({ pot_size: potSize, next_repotting_date: nextRepottingDate })
    .eq("plant_id", plant.plant_id);

  await supabase
    .from("care_logs")
    .update({ scheduled_date: nextRepottingDate })
    .eq("plant_id", plant.plant_id)
    .eq("care_type", "분갈이")
    .eq("is_completed", false);

  return nextRepottingDate;
}
