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
  undoCareItem,
  type TodayCareItem,
} from "@/lib/care-service";
import { findSpecies } from "@/lib/plants";
import { supabase } from "@/lib/supabase";
import {
  buildScenarioWeather,
  fetchWeather,
  isWeatherScenario,
  weatherEmoji,
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

function yearMonth(target: string): string {
  const [year, month] = target.split("-");
  return `${year}년 ${Number(month)}월`;
}

function dday(target: string): string {
  const diff = daysUntil(target);
  if (diff === 0) return "오늘";
  // 밀린 쪽도 세 자리가 되면 마찬가지로 읽히지 않는다
  if (diff < -FAR_FUTURE_DAYS) return `${yearMonth(target)}부터 밀림`;
  if (diff < 0) return `${-diff}일 지남`;
  if (diff > FAR_FUTURE_DAYS) return yearMonth(target);
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

  // 진입 시 1회 데이터 로드. setState는 await 뒤에 일어나고 외부(Supabase) 상태를
  // 화면으로 옮기는 용도라, 이 규칙이 겨냥하는 파생 상태 보정과는 성격이 다르다.
  // 규칙 자체는 켜 둔다 — SC-05의 선택 날짜 보정이 실제로 이 규칙에 잡혔다.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  /** 완료 ↔ 되돌리기 토글 — 잘못 눌렀을 때 바로 취소할 수 있게 한다 */
  const handleToggle = async (item: TodayCareItem) => {
    const alert = weather?.weather_alert_flag ?? null;
    const willComplete = !item.log.is_completed;

    // 응답을 기다리지 않고 먼저 반영해 체크가 즉시 보이게 한다
    setItems((previous) =>
      previous.map((each) =>
        each.log.care_log_id === item.log.care_log_id
          ? { ...each, log: { ...each.log, is_completed: willComplete } }
          : each,
      ),
    );

    if (willComplete) await completeCareItem(item, alert);
    else await undoCareItem(item, alert);
    load();
  };

  const duePlantIds = useMemo(
    () =>
      new Set(
        items
          .filter((item) => !item.log.is_completed)
          .map((item) => item.plant.plant_id),
      ),
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

  // 케어현황 — 셋 다 "전체 식물 중 지금 문제없는 식물 수"로 기준을 통일한다.
  // 오늘 처리 대상만 세면 할 일이 없는 날엔 분모가 0이라 늘 비어 보인다.
  const total = plants.length;
  const wateringOnTime = plants.filter(
    (plant) => daysUntil(plant.next_watering_date) > 0,
  ).length;
  const repottingOnTime = plants.filter(
    (plant) => daysUntil(plant.next_repotting_date) > 0,
  ).length;
  const placementMatched = plants.filter(
    (plant) =>
      findSpecies(plant.species)?.light_condition_default ===
      plant.light_condition,
  ).length;

  const countHint = (ok: number, unit: string) =>
    ok === total ? "모두 좋아요" : `${total - ok}개 ${unit}`;

  const selectedPlant =
    plants.find((plant) => plant.plant_id === selectedPlantId) ?? null;
  const tip = weather ? selectWeatherTip(weather) : null;

  return (
    <>
      <main className="flex flex-1 flex-col gap-4 px-5 pb-4">
        {/* 스크롤해도 어느 화면인지 보이도록 제목만 고정한다 */}
        <header className="sticky top-0 z-10 -mx-5 bg-cloud px-5 pt-6 pb-3 shadow-[0_10px_12px_-10px_rgba(8,8,10,0.25)]">
          <p className="text-xs font-semibold text-ink/60">{todayLabel()}</p>
          <h1 className="mt-0.5 text-2xl font-extrabold">오늘의 케어</h1>
        </header>

        {/* 날씨 — 서비스의 핵심이라 화면에서 가장 큰 블록으로 둔다.
            아래 라임 블록(오늘의 관리)이 "그래서 뭘 하면 되는지"를 받는다. */}
        {isWeatherFailed || !weather ? (
          <section className="overflow-hidden rounded-card bg-ink text-paper">
            <div className="px-5 pt-5 pb-4">
              <p className="text-xs text-paper/60">오늘 날씨</p>
              <p className="mt-2 text-xl font-extrabold">
                날씨 정보를 불러오지 못했어요
              </p>
            </div>
            <div className="bg-paper/10 px-5 py-4">
              <p className="text-sm font-bold">일정은 그대로 계산 중이에요</p>
              <p className="mt-1 text-xs leading-relaxed text-paper/60">
                종별 물주기 기준과 계절 배율로 예정일을 잡고 있어요.
              </p>
            </div>
          </section>
        ) : (
          <section className="overflow-hidden rounded-card bg-ink text-paper">
            <div className="px-5 pt-5 pb-5">
              <div className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-accent" />
                <p className="text-xs text-paper/60">{weather.region} 날씨</p>
                {weather.is_scenario && (
                  <span className="rounded-full bg-lilac px-1.5 py-0.5 text-[10px] font-bold text-ink">
                    시연
                  </span>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="text-5xl leading-none">
                    {weatherEmoji(weather.description)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-5xl leading-none font-extrabold">
                      {weather.temperature}°
                    </p>
                    <p className="mt-1.5 truncate text-sm text-paper/60">
                      {weather.description}
                    </p>
                  </div>
                </div>

                <dl className="flex w-[7.5rem] shrink-0 flex-col gap-2">
                  <div className="flex items-baseline justify-between rounded-xl bg-paper/10 px-3 py-2">
                    <dt className="text-[11px] text-paper/60">습도</dt>
                    <dd className="text-sm font-bold">{weather.humidity}%</dd>
                  </div>
                  <div className="flex items-baseline justify-between rounded-xl bg-paper/10 px-3 py-2">
                    <dt className="text-[11px] text-paper/60">강수</dt>
                    <dd className="text-sm font-bold">
                      {weather.precipitation.toFixed(1)}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* 색으로 영역을 가르지 않고 한 면에 이어 붙인다.
                  라임은 세로 바와 일정 문구에만 써서 강조 역할만 맡긴다 */}
              {tip && (
                <div className="mt-5 border-t border-paper/10 pt-4">
                  <div className="flex gap-3">
                    <span className="mt-0.5 w-1 shrink-0 rounded-full bg-accent" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-accent">
                        오늘의 관리
                      </p>
                      <p className="mt-1 text-base leading-snug font-extrabold">
                        {tip.title}
                      </p>
                      <p className="mt-1.5 text-xs leading-relaxed text-paper/60">
                        {tip.body}
                      </p>
                    </div>
                  </div>

                  {/* 날씨가 일정에 어떻게 반영됐는지는 항상 알려준다 */}
                  <p className="mt-4 flex items-start gap-2 rounded-xl bg-paper/5 px-3 py-2.5 text-xs leading-relaxed font-semibold text-accent">
                    <span aria-hidden>🗓</span>
                    {weather.weather_alert_flag
                      ? ALERT_MESSAGE[weather.weather_alert_flag]
                      : "오늘 날씨로는 물주기 일정을 그대로 둘게요."}
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {showNotificationBanner && (
          <button
            type="button"
            onClick={() => router.push("/sc11")}
            className="rounded-card border-l-4 border-lilac bg-lilac/25 px-4 py-3 text-left text-xs font-semibold text-ink"
          >
            알림이 꺼져 있어요. 물 줄 때를 놓치지 않으려면 켜주세요 ›
          </button>
        )}

        {/* 케어현황 — 전체 식물 중 지금 문제없는 식물 수 */}
        <section className="rounded-card bg-paper px-2 py-4">
          <h2 className="px-3 pb-3 text-sm font-bold">
            케어현황{" "}
            <span className="text-xs font-medium text-ink/60">
              전체 {total}개 기준
            </span>
          </h2>
          <div className="flex">
            <CareRing
              label="물주기"
              done={wateringOnTime}
              total={total}
              hint={countHint(wateringOnTime, "줄 때 됨")}
            />
            <CareRing
              label="분갈이"
              done={repottingOnTime}
              total={total}
              hint={countHint(repottingOnTime, "시기 됨")}
            />
            <CareRing
              label="화분위치"
              done={placementMatched}
              total={total}
              hint={countHint(placementMatched, "자리 확인")}
            />
          </div>
        </section>

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
            onToggle={handleToggle}
            onOpenDetail={() =>
              router.push(`/sc07?plant=${selectedPlant.plant_id}`)
            }
          />
        ) : (
          <AllPlantsView
            items={items}
            upcoming={upcoming}
            onToggle={handleToggle}
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
  onToggle,
  onOpenPlant,
}: {
  items: TodayCareItem[];
  upcoming: TodayCareItem[];
  onToggle: (item: TodayCareItem) => void;
  onOpenPlant: (plantId: string) => void;
}) {
  const doneCount = items.filter((item) => item.log.is_completed).length;
  const isAllDone = items.length > 0 && doneCount === items.length;

  return (
    <>
      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between pl-1">
          <h2 className="text-sm font-bold">오늘의 할일</h2>
          {items.length > 0 && (
            <span className="text-xs font-semibold text-ink/60">
              {doneCount}/{items.length} 완료
            </span>
          )}
        </div>

        {items.length === 0 ? (
          <div className="rounded-card bg-accent px-4 py-7 text-center text-ink">
            <p className="text-2xl">🌿</p>
            <p className="mt-2 font-extrabold">오늘은 쉬어가도 좋아요</p>
            <p className="mt-1 text-xs text-ink/70">
              예정된 케어가 없어요. 다음 일정은 아래에서 확인할 수 있어요.
            </p>
          </div>
        ) : (
          <>
            {isAllDone && (
              <p className="rounded-card bg-accent px-4 py-3 text-center text-sm font-extrabold text-ink">
                🌿 오늘 할 일을 다 끝냈어요
              </p>
            )}
            <ul className="flex flex-col gap-2">
              {items.map((item) => (
                <CareTaskCard
                  key={item.log.care_log_id}
                  item={item}
                  onToggle={onToggle}
                  onOpenPlant={onOpenPlant}
                />
              ))}
            </ul>
          </>
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

/**
 * 오늘의 할일 카드 — 완료해도 사라지지 않고 상태만 바뀐다.
 * 해야 할 일은 블랙 카드 + 연두 빈 원, 끝낸 일은 흐린 흰 카드 + 블랙 체크로
 * 색과 아이콘을 함께 뒤집어 한눈에 구분되게 한다.
 */
function CareTaskCard({
  item,
  onToggle,
  onOpenPlant,
}: {
  item: TodayCareItem;
  onToggle: (item: TodayCareItem) => void;
  onOpenPlant: (plantId: string) => void;
}) {
  const species = findSpecies(item.plant.species);
  const isDone = item.log.is_completed;
  const isOverdue = daysUntil(item.log.scheduled_date) < 0;

  return (
    <li
      className={`flex items-center gap-3 rounded-card p-3 transition ${
        isDone ? "bg-paper text-ink opacity-60" : "bg-ink text-paper"
      }`}
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
          <span
            className={`block text-xs ${isDone ? "text-ink/60" : "text-paper/60"}`}
          >
            {isDone ? (
              `${item.log.care_type} 완료`
            ) : (
              <>
                {item.log.care_type} ·{" "}
                {/* 예정일이 지난 항목은 얼마나 밀렸는지 바로 알린다 */}
                <span className={isOverdue ? "font-bold text-accent" : ""}>
                  {dday(item.log.scheduled_date)}
                </span>
              </>
            )}
          </span>
        </span>
      </button>

      <button
        type="button"
        onClick={() => onToggle(item)}
        aria-pressed={isDone}
        aria-label={`${item.plant.nickname} ${item.log.care_type} ${
          isDone ? "완료 취소" : "완료"
        }`}
        title={isDone ? "다시 누르면 완료를 취소해요" : "누르면 완료 처리돼요"}
        className={`flex size-11 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition ${
          isDone ? "bg-cloud text-ink/70" : "bg-accent text-ink"
        }`}
      >
        {/* 버튼 안은 글자로 통일 — 누르면 무엇이 되는지를 그대로 쓴다 */}
        {isDone ? "취소" : "완료"}
      </button>
    </li>
  );
}

/** 식물별 보기 — 그 식물의 물주기·분갈이·배치 상태 */
function PlantCareView({
  plant,
  items,
  onToggle,
  onOpenDetail,
}: {
  plant: Plant;
  items: TodayCareItem[];
  onToggle: (item: TodayCareItem) => void;
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
            <CareTaskCard
              key={item.log.care_log_id}
              item={item}
              onToggle={onToggle}
              onOpenPlant={() => onOpenDetail()}
            />
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
