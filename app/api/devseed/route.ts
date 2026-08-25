// 데모 계정 데이터 시드 — **개발 환경 전용**(배포본에서는 404).
//
// 시드 값이 전부 오늘 기준 상대 날짜라 시간이 지나면 상태가 밀린다.
// ("오늘 예정"이 내일이면 "1일 지남"이 되고, 오늘 완료분은 목록에서 빠진다)
// 포트폴리오를 보여주기 전에 로컬에서 다시 돌릴 것 —
//   npm run dev
//   curl -X POST "http://localhost:3000/api/devseed?alert=$(현재 날씨 경보값)"
//
// 계산식을 다시 구현하지 않고 lib/care-calc의 실제 함수를 그대로 쓴다.
// SC-03 진입 시 recalcWateringSchedule이 last_watered_at 기준으로 예정일을
// 다시 계산해 덮어쓰므로, 원하는 상태(오늘 완료·오늘 예정·지연)를 만들려면
// scheduled_date를 직접 박는 게 아니라 last_watered_at을 역산해야 한다.

import { createClient } from "@supabase/supabase-js";
import {
  calcNextRepottingDate,
  calcNextWateringDate,
  toDateString,
  type WeatherAlert,
} from "@/lib/care-calc";
import { DEMO_ACCOUNT } from "@/lib/demo";
import { PLANT_SPECIES } from "@/lib/plants";

/** findSpecies는 한글 이름으로 찾으므로, 로스터는 id로 조회한다 */
const byId = (id: string) => PLANT_SPECIES.find((s) => s.id === id);

const DAY = 86400000;
const shift = (base: Date, days: number) =>
  toDateString(new Date(base.getTime() + days * DAY));

/** 실제 계산 함수로 오늘 기준 물주기 간격을 역산한다(공식 중복 구현 방지) */
function intervalDays(base: number, alert: WeatherAlert, today: Date) {
  const next = calcNextWateringDate({
    lastWateredAt: toDateString(today),
    baseWateringIntervalDays: base,
    weatherAlert: alert,
    today,
  });
  return Math.round(
    (new Date(`${next}T00:00:00`).getTime() -
      new Date(`${toDateString(today)}T00:00:00`).getTime()) /
      DAY,
  );
}

/**
 * dueIn: 물주기 예정일이 오늘로부터 며칠 뒤인가(음수면 지연, 0이면 오늘)
 * done:  오늘 이미 물을 준 상태로 둘지
 */
const ROSTER = [
  { species: "monstera", nickname: "몬이", pot: "중", dueIn: 0, done: true, adopted: -420 },
  { species: "pothos", nickname: "스키", pot: "소", dueIn: 0, done: true, adopted: -260 },
  { species: "spathiphyllum", nickname: "스파", pot: "중", dueIn: 0, done: false, adopted: -300 },
  { species: "schefflera", nickname: "유자", pot: "중", dueIn: 0, done: false, adopted: -510 },
  { species: "orange_jasmine", nickname: "오자", pot: "소", dueIn: -4, done: false, adopted: -880 },
  { species: "calathea", nickname: "칼라", pot: "소", dueIn: -7, done: false, adopted: -200 },
  { species: "areca_palm", nickname: "아레카", pot: "대", dueIn: -2, done: false, adopted: -640 },
  { species: "zz_plant", nickname: "금전", pot: "중", dueIn: 6, done: false, adopted: -150 },
  { species: "cactus", nickname: "선인", pot: "소", dueIn: 12, done: false, adopted: -95 },
] as const;

export async function POST(request: Request) {
  // 배포본에 열려 있으면 누구나 데모 데이터를 갈아엎을 수 있다
  if (process.env.NODE_ENV === "production") {
    return new Response("Not Found", { status: 404 });
  }

  const url = new URL(request.url);
  const alert = (url.searchParams.get("alert") || null) as WeatherAlert;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data: auth, error: authError } =
    await supabase.auth.signInWithPassword(DEMO_ACCOUNT);
  if (authError || !auth.user) {
    return Response.json(
      { ok: false, step: "signin", error: authError?.message ?? "no user" },
      { status: 400 },
    );
  }
  const userId = auth.user.id;
  const today = new Date();
  const todayStr = toDateString(today);

  // 다시 돌려도 같은 결과가 되도록 기존 데모 데이터를 먼저 비운다
  const { data: old } = await supabase
    .from("plants")
    .select("plant_id")
    .eq("user_id", userId);
  const oldIds = (old ?? []).map((p) => p.plant_id);
  if (oldIds.length > 0) {
    await supabase.from("care_logs").delete().in("plant_id", oldIds);
    await supabase.from("plants").delete().in("plant_id", oldIds);
  }

  await supabase
    .from("profiles")
    .update({
      nickname: "데모",
      location: "서울",
      notification_permission: true,
    })
    .eq("user_id", userId);

  const summary: Record<string, unknown>[] = [];

  for (const item of ROSTER) {
    const species = byId(item.species);
    if (!species) continue;

    const gap = intervalDays(species.base_watering_interval_days, alert, today);
    // 예정일이 오늘+dueIn 이 되도록 마지막 물준 날을 역산
    const lastWateredAt = item.done ? todayStr : shift(today, item.dueIn - gap);
    const adoptedAt = shift(today, item.adopted);

    const nextWateringDate = calcNextWateringDate({
      lastWateredAt,
      baseWateringIntervalDays: species.base_watering_interval_days,
      weatherAlert: alert,
      today,
    });
    const nextRepottingDate = calcNextRepottingDate({
      adoptedAt,
      growthRate: species.growth_rate,
      potSize: item.pot,
    });

    const { data: plant, error: plantError } = await supabase
      .from("plants")
      .insert({
        user_id: userId,
        species: species.name,
        nickname: item.nickname,
        adopted_at: adoptedAt,
        last_watered_at: lastWateredAt,
        pot_size: item.pot,
        light_condition: species.light_condition_default,
        next_watering_date: nextWateringDate,
        next_repotting_date: nextRepottingDate,
        status: "활성",
      })
      .select()
      .single();
    if (plantError || !plant) {
      return Response.json(
        { ok: false, step: "plant", nickname: item.nickname, error: plantError?.message },
        { status: 500 },
      );
    }

    const logs: Record<string, unknown>[] = [];

    // 지난 물주기 이력 — 캘린더(SC-05)와 케어 리포트(SC-11)를 채우기 위해
    for (let n = 1; n <= 3; n += 1) {
      const day = shift(today, item.dueIn - gap * n);
      logs.push({
        plant_id: plant.plant_id,
        care_type: "물주기",
        scheduled_date: day,
        completed_at: day,
        is_completed: true,
      });
    }

    if (item.done) {
      // 오늘 완료 — 완료 이력 1건 + 다음 회차 예정 1건
      logs.push({
        plant_id: plant.plant_id,
        care_type: "물주기",
        scheduled_date: todayStr,
        completed_at: todayStr,
        is_completed: true,
      });
    }
    // 미완료 물주기 예정은 식물당 정확히 1건이어야 한다
    // (recalc이 미완료 물주기 이력을 전부 같은 날짜로 맞추기 때문)
    logs.push({
      plant_id: plant.plant_id,
      care_type: "물주기",
      scheduled_date: nextWateringDate,
      completed_at: null,
      is_completed: false,
    });
    logs.push({
      plant_id: plant.plant_id,
      care_type: "분갈이",
      scheduled_date: nextRepottingDate,
      completed_at: null,
      is_completed: false,
    });

    const { error: logError } = await supabase.from("care_logs").insert(logs);
    if (logError) {
      return Response.json(
        { ok: false, step: "logs", nickname: item.nickname, error: logError.message },
        { status: 500 },
      );
    }

    summary.push({
      nickname: item.nickname,
      species: species.name,
      last_watered_at: lastWateredAt,
      next_watering_date: nextWateringDate,
      상태: item.done ? "오늘 완료" : item.dueIn < 0 ? `${-item.dueIn}일 지연` : item.dueIn === 0 ? "오늘 예정" : `D-${item.dueIn}`,
      next_repotting_date: nextRepottingDate,
      logs: logs.length,
    });
  }

  return Response.json({ ok: true, today: todayStr, alert, count: summary.length, summary });
}
