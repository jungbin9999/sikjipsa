"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import CareRing from "@/components/CareRing";
import CareStatCard from "@/components/CareStatCard";
import PlantSelector from "@/components/PlantSelector";
import TabBar from "@/components/TabBar";
import type { WeatherAlert } from "@/lib/care-calc";
import {
  completeCareItem,
  loadTodayCareItems,
  loadUpcomingCareItems,
  recalcWateringSchedule,
  type TodayCareItem,
} from "@/lib/care-service";
import { findSpecies } from "@/lib/plants";
import { supabase } from "@/lib/supabase";
import { cardTone } from "@/lib/tone";
import {
  buildScenarioWeather,
  fetchWeather,
  isWeatherScenario,
  type WeatherSnapshot,
} from "@/lib/weather";
import { selectWeatherTip } from "@/lib/weather-tips";
import type { Plant } from "@/types";

/** 알림 권한 재요청 배너는 세션당 1회만(정책정의서 "권한 재요청 빈도") */
const NOTIFICATION_BANNER_KEY = "sikjipsa:notification-banner-shown";

const ALERT_MESSAGE: Record<NonNullable<WeatherAlert>, string> = {
  폭염: "폭염이라 물이 빨리 말라요. 일정을 하루 앞당겼어요.",
  한파: "한파에는 생장이 느려져요. 일정을 이틀 미뤘어요.",
  장마: "장마라 습도가 충분해요. 일정을 이틀 미뤘어요.",
};

const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];

function todayLabel(): string {
  const now = new Date();
  return `${now.getMonth() + 1}월 ${now.getDate()}일 ${WEEKDAY[now.getDay()]}요일`;
}

function daysUntil(target: string): number {
  return Math.round(
    (new Date(`${target}T00:00:00`).getTime() -
      new Date(new Date().toDateString()).getTime()) /
      86400000,
  );
}

/** 90일이 넘으면 D-day가 세 자리라 읽히지 않아 연·월로 바꾼다 */
const FAR_FUTURE_DAYS = 90;

function dday(target: string): string {
  const diff = daysUntil(target);
  if (diff === 0) return "오늘";
  if (diff < 0) return `${-diff}일 지남`;
  if (diff > FAR_FUTURE_DAYS) {
    const [year, month] = target.split("-");
    return `${year}년 ${Number(month)}월`;
  }
  return `D-${diff}`;
}

function TodayCare() {
  const router = useRouter();
  // 시연·QA용: ?weather=장마 처럼 붙이면 실제 조회 대신 해당 시나리오를 쓴다
  const scenario = useSearchParams().get("weather");
  const [plants, setPlants] = useState<Plant[] | null>(null);
  const [items, setItems] = useState<TodayCareItem[]>([]);
  const [upcoming, setUpcoming] = useState<TodayCareItem[]>([]);
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [isWeatherFailed, setIsWeatherFailed] = useState(false);
  const [showNotificationBanner, setShowNotificationBanner] = useState(false);
  const [completedToday, setCompletedToday] = useState(0);
  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) {
      router.replace("/sc01");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("location, notification_permission")
      .eq("user_id", userId)
      .single();

    // 알림 권한 거부 상태면 재요청 배너를 세션당 1회 노출
    if (profile && !profile.notification_permission) {
      if (!sessionStorage.getItem(NOTIFICATION_BANNER_KEY)) {
        sessionStorage.setItem(NOTIFICATION_BANNER_KEY, "1");
        setShowNotificationBanner(true);
      }
    }

    // 날씨와 식물 조회를 동시에 시작한다(순차로 기다리면 진입이 그만큼 느려짐)
    // 날씨 조회 실패는 물주기 로직을 막지 않는다(상태 분기 "에러")
    const location = profile?.location ?? null;
    const [snapshot, plantResult] = await Promise.all([
      isWeatherScenario(scenario)
        ? Promise.resolve(buildScenarioWeather(scenario, location))
        : fetchWeather(location),
      supabase
        .from("plants")
        .select("*")
        .eq("status", "활성")
        .order("created_at", { ascending: false }),
    ]);
    setWeather(snapshot);
    setIsWeatherFailed(snapshot === null);
    const alert = snapshot?.weather_alert_flag ?? null;

    const activePlants = (plantResult.data ?? []) as Plant[];
    if (activePlants.length === 0) {
      // 빈 상태는 SC-04로 대체
      router.replace("/sc04");
      return;
    }

    // 화면 진입 시 on-demand 재계산
    // 시연 시나리오일 때는 계산 결과를 저장하지 않는다(실제 기록 오염 방지)
    const recalculated = await recalcWateringSchedule(
      activePlants,
      alert,
      !isWeatherScenario(scenario),
    );
    setPlants(recalculated);
    setItems(await loadTodayCareItems(recalculated));
    setUpcoming(await loadUpcomingCareItems(recalculated));
  }, [router, scenario]);

  useEffect(() => {
    load();
  }, [load]);

  const handleComplete = async (item: TodayCareItem) => {
    setItems((previous) =>
      previous.filter((each) => each.log.care_log_id !== item.log.care_log_id),
    );
    setCompletedToday((count) => count + 1);
    await completeCareItem(item, weather?.weather_alert_flag ?? null);
    load();
  };

  const duePlantIds = useMemo(
    () => new Set(items.map((item) => item.plant.plant_id)),
    [items],
  );

  if (plants === null) {
    return (
      <>
        <main className="flex flex-1 items-center justify-center">
          <p className="text-sm text-ink/60">불러오는 중…</p>
        </main>
        <TabBar />
      </>
    );
  }

  const wateringTotal =
    items.filter((item) => item.log.care_type === "물주기").length +
    completedToday;
  const repottingTotal = items.filter(
    (item) => item.log.care_type === "분갈이",
  ).length;
  // 화분위치는 종별 권장 광량과 실제 배치가 일치하는 식물 수로 본다
  const placementDone = plants.filter(
    (plant) =>
      findSpecies(plant.species)?.light_condition_default ===
      plant.light_condition,
  ).length;

  const selectedPlant =
    plants.find((plant) => plant.plant_id === selectedPlantId) ?? null;
  const tip = weather ? selectWeatherTip(weather) : null;

  return (
    <>
      <main className="flex flex-1 flex-col gap-4 px-5 pt-6 pb-4">
        <header>
          <p className="text-xs font-semibold text-ink/60">{todayLabel()}</p>
          <h1 className="mt-0.5 text-2xl font-extrabold">오늘의 케어</h1>
        </header>

        {/* 날씨 카드 — 실패해도 같은 다크 카드로 유지해 레이아웃이 흔들리지 않게 한다 */}
        {isWeatherFailed || !weather ? (
          <section className="rounded-card bg-ink p-4 text-paper">
            <p className="text-xs text-paper/60">날씨</p>
            <p className="mt-1 text-lg font-extrabold">
              날씨 정보를 불러오지 못했어요
            </p>
            <p className="mt-2 rounded-xl bg-paper/10 px-3 py-2.5 text-xs text-paper/60">
              물주기 일정은 종별 기준과 계절에 맞춰 정상적으로 계산되고 있어요.
            </p>
          </section>
        ) : (
          <section className="rounded-card bg-ink p-4 text-paper">
            <div className="flex items-start justify-between">
              <div>
                <p className="flex items-center gap-1.5 text-xs text-paper/60">
                  {weather.region}
                  {weather.is_scenario && (
                    <span className="rounded-full bg-lilac px-1.5 py-0.5 text-[10px] font-bold text-ink">
                      시연
                    </span>
                  )}
                </p>
                <p className="mt-1 text-4xl leading-none font-extrabold">
                  {weather.temperature}°
                </p>
                <p className="mt-1.5 text-xs text-paper/60">
                  {weather.description}
                </p>
              </div>
              <dl className="flex gap-2">
                <div className="rounded-xl bg-paper/10 px-3 py-2 text-center">
                  <dt className="text-[10px] text-paper/60">습도</dt>
                  <dd className="mt-0.5 text-sm font-bold">
                    {weather.humidity}%
                  </dd>
                </div>
                <div className="rounded-xl bg-paper/10 px-3 py-2 text-center">
                  <dt className="text-[10px] text-paper/60">강수</dt>
                  <dd className="mt-0.5 text-sm font-bold">
                    {weather.precipitation.toFixed(1)}
                  </dd>
                </div>
              </dl>
            </div>

            {tip && (
              <div className="mt-3 rounded-xl bg-paper/10 px-3 py-2.5">
                <p className="text-xs font-bold">{tip.title}</p>
                <p className="mt-0.5 text-[11px] text-paper/60">{tip.body}</p>
              </div>
            )}

            {weather.weather_alert_flag && (
              <p className="mt-2 rounded-xl bg-accent px-3 py-2 text-xs font-semibold text-ink">
                {ALERT_MESSAGE[weather.weather_alert_flag]}
              </p>
            )}
          </section>
        )}

        {showNotificationBanner && (
          <button
            type="button"
            onClick={() => router.push("/sc11")}
            className="rounded-card bg-lilac px-4 py-3 text-left text-xs font-semibold text-ink"
          >
            알림이 꺼져 있어요. 물 줄 때를 놓치지 않으려면 켜주세요 ›
          </button>
        )}

        {/* 케어현황 링 */}
        <div className="flex rounded-card bg-paper px-2 py-4">
          <CareRing label="물주기" done={completedToday} total={wateringTotal} />
          <CareRing label="분갈이" done={0} total={repottingTotal} />
          <CareRing
            label="화분위치"
            done={placementDone}
            total={plants.length}
          />
        </div>

        {/* 식물 선택 — 식물마다 설정이 달라 골라서 볼 수 있게 한다 */}
        <PlantSelector
          plants={plants}
          selectedId={selectedPlantId}
          onSelect={setSelectedPlantId}
          duePlantIds={duePlantIds}
        />

        {selectedPlant ? (
          <PlantCareView
            plant={selectedPlant}
            items={items.filter(
              (item) => item.plant.plant_id === selectedPlant.plant_id,
            )}
            onComplete={handleComplete}
            onOpenDetail={() =>
              router.push(`/sc07?plant=${selectedPlant.plant_id}`)
            }
          />
        ) : (
          <AllPlantsView
            items={items}
            upcoming={upcoming}
            onComplete={handleComplete}
            onOpenPlant={(plantId) => router.push(`/sc07?plant=${plantId}`)}
          />
        )}
      </main>
      <TabBar />
    </>
  );
}

/** 전체 보기 — 오늘의 할일 + 다가오는 일정 */
function AllPlantsView({
  items,
  upcoming,
  onComplete,
  onOpenPlant,
}: {
  items: TodayCareItem[];
  upcoming: TodayCareItem[];
  onComplete: (item: TodayCareItem) => void;
  onOpenPlant: (plantId: string) => void;
}) {
  return (
    <>
      <section className="flex flex-col gap-2">
        <h2 className="pl-1 text-sm font-bold">오늘의 할일</h2>

        {items.length === 0 ? (
          <div className="rounded-card bg-accent px-4 py-7 text-center text-ink">
            <p className="text-2xl">🌿</p>
            <p className="mt-2 font-extrabold">오늘 할 일을 다 끝냈어요</p>
            <p className="mt-1 text-xs text-ink/60">
              다음 일정은 아래에서 확인할 수 있어요.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map((item, index) => {
              const species = findSpecies(item.plant.species);
              const tone = cardTone(index);
              return (
                <li
                  key={item.log.care_log_id}
                  className={`flex items-center gap-3 rounded-card p-3 ${tone.card}`}
                >
                  <button
                    type="button"
                    onClick={() => onOpenPlant(item.plant.plant_id)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    {species && (
                      <Image
                        src={species.image_url}
                        alt=""
                        width={48}
                        height={48}
                        className="size-12 shrink-0 rounded-xl object-cover"
                      />
                    )}
                    <span className="min-w-0">
                      <span className="block truncate font-bold">
                        {item.plant.nickname}
                      </span>
                      <span className={`block text-xs ${tone.sub}`}>
                        {item.log.care_type} · {item.log.scheduled_date}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onComplete(item)}
                    aria-label={`${item.plant.nickname} ${item.log.care_type} 완료`}
                    className={`size-11 shrink-0 rounded-full text-lg font-bold ${tone.chip}`}
                  >
                    ✓
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {upcoming.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="pl-1 text-sm font-bold">다가오는 일정</h2>
          <ul className="rounded-card bg-paper px-4 py-1">
            {upcoming.map((item) => (
              <li
                key={item.log.care_log_id}
                className="flex items-center justify-between border-b border-ink/5 py-3 last:border-0"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold">
                    {item.plant.nickname}
                  </span>
                  <span className="block text-xs text-ink/60">
                    {item.log.care_type}
                  </span>
                </span>
                <span className="shrink-0 rounded-full bg-cloud px-2.5 py-1 text-xs font-bold text-ink/60">
                  {dday(item.log.scheduled_date)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

/** 식물별 보기 — 그 식물의 물주기·분갈이·배치 상태 */
function PlantCareView({
  plant,
  items,
  onComplete,
  onOpenDetail,
}: {
  plant: Plant;
  items: TodayCareItem[];
  onComplete: (item: TodayCareItem) => void;
  onOpenDetail: () => void;
}) {
  const species = findSpecies(plant.species);
  const isPlacementMatched =
    species?.light_condition_default === plant.light_condition;
  const isWateringDue = daysUntil(plant.next_watering_date) <= 0;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        {species && (
          <Image
            src={species.image_url}
            alt=""
            width={48}
            height={48}
            className="size-12 shrink-0 rounded-xl object-cover"
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-extrabold">{plant.nickname}</p>
          <p className="text-xs text-ink/60">
            {plant.species} · 기본 {species?.base_watering_interval_days}일 주기
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenDetail}
          className="min-h-11 shrink-0 rounded-full bg-paper px-4 text-xs font-bold text-ink/60"
        >
          상세 ›
        </button>
      </div>

      <div className="flex gap-2">
        <CareStatCard
          label="다음 물주기"
          value={dday(plant.next_watering_date)}
          hint={plant.next_watering_date}
          tone={isWateringDue ? "accent" : "ink"}
        />
        <CareStatCard
          label="다음 분갈이"
          value={dday(plant.next_repotting_date)}
          hint={plant.next_repotting_date}
        />
      </div>

      <CareStatCard
        label="배치 위치"
        value={plant.light_condition}
        hint={
          isPlacementMatched
            ? `${plant.species}에게 알맞은 자리예요`
            : `${species?.light_condition_default}을 더 좋아해요`
        }
        tone={isPlacementMatched ? "paper" : "lilac"}
      />

      {items.length > 0 && (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li
              key={item.log.care_log_id}
              className="flex items-center justify-between rounded-card bg-ink p-3 text-paper"
            >
              <span>
                <span className="block text-sm font-bold">
                  오늘 {item.log.care_type} 할 차례예요
                </span>
                <span className="block text-xs text-paper/60">
                  예정일 {item.log.scheduled_date}
                </span>
              </span>
              <button
                type="button"
                onClick={() => onComplete(item)}
                aria-label={`${plant.nickname} ${item.log.care_type} 완료`}
                className="size-11 shrink-0 rounded-full bg-accent text-lg font-bold text-ink"
              >
                ✓
              </button>
            </li>
          ))}
        </ul>
      )}

      {species && (
        <p className="rounded-card bg-paper p-4 text-xs leading-relaxed text-ink/60">
          {species.care_tip}
        </p>
      )}
    </section>
  );
}

export default function TodayCareScreen() {
  return (
    <Suspense
      fallback={
        <main className="flex flex-1 items-center justify-center">
          <p className="text-sm text-ink/60">불러오는 중…</p>
        </main>
      }
    >
      <TodayCare />
    </Suspense>
  );
}
