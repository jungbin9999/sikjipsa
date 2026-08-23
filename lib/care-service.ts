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
  /** 시연용 날씨 시나리오로 계산한 결과는 저장하지 않고 화면에만 반영한다 */
  persist = true,
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
      if (!persist) return { ...plant, next_watering_date: nextWateringDate };

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

/**
 * 오늘 처리 대상 — 예정일이 오늘이거나 지난 미완료 항목 + 오늘 완료한 항목.
 * 완료해도 목록에서 지우지 않고 완료 상태로 남겨 되돌릴 수 있게 한다.
 * 체크하지 않고 하루가 지나면 예정일이 과거가 되므로 다음 날에도 계속 남는다.
 */
export async function loadTodayCareItems(
  plants: Plant[],
): Promise<TodayCareItem[]> {
  if (plants.length === 0) return [];

  const today = toDateString(new Date());
  const { data } = await supabase
    .from("care_logs")
    .select("*")
    .or(
      `and(is_completed.eq.false,scheduled_date.lte.${today}),and(is_completed.eq.true,completed_at.eq.${today})`,
    )
    .order("scheduled_date", { ascending: true });

  const plantById = new Map(plants.map((plant) => [plant.plant_id, plant]));
  return ((data ?? []) as CareLog[])
    .filter((log) => plantById.has(log.plant_id))
    .map((log) => ({ log, plant: plantById.get(log.plant_id)! }));
}

/** 다가오는 일정으로 보여줄 기간 상한 — 분갈이처럼 몇 년 뒤 일정까지 끌어오지 않는다 */
const UPCOMING_WINDOW_DAYS = 30;

/** 다가오는 일정 — 예정일이 오늘 이후 30일 이내인 미완료 항목 */
export async function loadUpcomingCareItems(
  plants: Plant[],
  limit = 3,
): Promise<TodayCareItem[]> {
  if (plants.length === 0) return [];

  const until = new Date();
  until.setDate(until.getDate() + UPCOMING_WINDOW_DAYS);

  const { data } = await supabase
    .from("care_logs")
    .select("*")
    .eq("is_completed", false)
    .gt("scheduled_date", toDateString(new Date()))
    .lte("scheduled_date", toDateString(until))
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

/**
 * 케어 완료 되돌리기 — 실수로 체크한 경우를 위한 취소.
 *
 * 물주기는 완료 시 `last_watered_at`을 오늘로 덮어쓰고 다음 회차 이력을 만들기 때문에
 * 되돌릴 때 그 둘을 함께 정리한다. 이전 물준 날은 직전 완료 이력에서 복원하고,
 * 첫 완료라 직전 이력이 없으면 되돌리는 이력의 예정일에서 간격을 빼 역산한다.
 */
export async function undoCareItem(
  item: TodayCareItem,
  weatherAlert: WeatherAlert,
): Promise<void> {
  await supabase
    .from("care_logs")
    .update({ is_completed: false, completed_at: null })
    .eq("care_log_id", item.log.care_log_id);

  const species = findSpecies(item.plant.species);
  if (!species) return;

  // 완료 시 만들어둔 다음 회차 예정 이력을 지운다
  await supabase
    .from("care_logs")
    .delete()
    .eq("plant_id", item.plant.plant_id)
    .eq("care_type", item.log.care_type)
    .eq("is_completed", false)
    .gt("scheduled_date", toDateString(new Date()));

  if (item.log.care_type === "분갈이") {
    await supabase
      .from("plants")
      .update({ next_repotting_date: item.log.scheduled_date })
      .eq("plant_id", item.plant.plant_id);
    return;
  }

  const { data: previous } = await supabase
    .from("care_logs")
    .select("completed_at")
    .eq("plant_id", item.plant.plant_id)
    .eq("care_type", "물주기")
    .eq("is_completed", true)
    .neq("care_log_id", item.log.care_log_id)
    .order("completed_at", { ascending: false })
    .limit(1);

  const previousWateredAt =
    previous?.[0]?.completed_at ??
    toDateString(
      new Date(
        new Date(`${item.log.scheduled_date}T00:00:00`).getTime() -
          species.base_watering_interval_days * 86400000,
      ),
    );

  await supabase
    .from("plants")
    .update({
      last_watered_at: previousWateredAt,
      next_watering_date: calcNextWateringDate({
        lastWateredAt: previousWateredAt,
        baseWateringIntervalDays: species.base_watering_interval_days,
        weatherAlert,
      }),
    })
    .eq("plant_id", item.plant.plant_id);
}
