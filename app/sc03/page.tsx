"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import CareRing from "@/components/CareRing";
import TabBar from "@/components/TabBar";
import type { WeatherAlert } from "@/lib/care-calc";
import {
  completeCareItem,
  loadTodayCareItems,
  recalcWateringSchedule,
  type TodayCareItem,
} from "@/lib/care-service";
import { findSpecies } from "@/lib/plants";
import { supabase } from "@/lib/supabase";
import { fetchWeather, type WeatherSnapshot } from "@/lib/weather";
import type { Plant } from "@/types";

/** 알림 권한 재요청 배너는 세션당 1회만(정책정의서 "권한 재요청 빈도") */
const NOTIFICATION_BANNER_KEY = "sikjipsa:notification-banner-shown";

const ALERT_MESSAGE: Record<NonNullable<WeatherAlert>, string> = {
  폭염: "폭염이라 물이 빨리 말라요. 일정을 하루 앞당겼어요.",
  한파: "한파에는 생장이 느려져요. 일정을 이틀 미뤘어요.",
  장마: "장마라 습도가 충분해요. 일정을 이틀 미뤘어요.",
};

export default function TodayCareScreen() {
  const router = useRouter();
  const [plants, setPlants] = useState<Plant[] | null>(null);
  const [items, setItems] = useState<TodayCareItem[]>([]);
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [isWeatherFailed, setIsWeatherFailed] = useState(false);
  const [showNotificationBanner, setShowNotificationBanner] = useState(false);
  const [completedToday, setCompletedToday] = useState(0);

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
    const [snapshot, plantResult] = await Promise.all([
      fetchWeather(profile?.location ?? null),
      supabase
        .from("plants")
        .select("*")
        .eq("status", "활성")
        .order("created_at", { ascending: false }),
    ]);
    setWeather(snapshot);
    setIsWeatherFailed(snapshot === null);
    const alert = snapshot?.weather_alert_flag ?? null;
    const plantRows = plantResult.data;

    const activePlants = (plantRows ?? []) as Plant[];
    if (activePlants.length === 0) {
      // 빈 상태는 SC-04로 대체
      router.replace("/sc04");
      return;
    }

    // 화면 진입 시 on-demand 재계산
    const recalculated = await recalcWateringSchedule(activePlants, alert);
    setPlants(recalculated);
    setItems(await loadTodayCareItems(recalculated));
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const handleComplete = async (item: TodayCareItem) => {
    setItems((previous) =>
      previous.filter((each) => each.log.care_log_id !== item.log.care_log_id),
    );
    setCompletedToday((count) => count + 1);
    await completeCareItem(item, weather?.weather_alert_flag ?? null);
  };

  if (plants === null) {
    return (
      <>
        <main className="flex flex-1 items-center justify-center">
          <p className="text-sm text-ink/40">불러오는 중…</p>
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

  return (
    <>
      <main className="flex flex-1 flex-col gap-4 px-5 pt-6 pb-4">
        <h1 className="text-2xl font-extrabold">오늘의 케어</h1>

        {/* 날씨 배너 */}
        {isWeatherFailed ? (
          <div className="rounded-card bg-ink p-4 text-paper">
            <p className="text-sm font-semibold">날씨 정보를 불러오지 못했어요</p>
            <p className="mt-1 text-xs text-paper/50">
              물주기 일정은 정상적으로 계산되고 있어요.
            </p>
          </div>
        ) : (
          weather && (
            <div className="rounded-card bg-ink p-4 text-paper">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs text-paper/50">{weather.region}</p>
                  <p className="text-3xl font-extrabold">
                    {weather.temperature}°
                  </p>
                </div>
                <p className="text-xs text-paper/60">
                  {weather.description} · 습도 {weather.humidity}% · 강수{" "}
                  {weather.precipitation.toFixed(1)}mm
                </p>
              </div>
              {weather.weather_alert_flag && (
                <p className="mt-3 rounded-xl bg-accent px-3 py-2 text-xs font-semibold text-ink">
                  {ALERT_MESSAGE[weather.weather_alert_flag]}
                </p>
              )}
            </div>
          )
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

        {/* 오늘의 할일 */}
        <section className="flex flex-col gap-2">
          <h2 className="pl-1 text-sm font-bold">오늘의 할일</h2>

          {items.length === 0 ? (
            <p className="rounded-card bg-paper px-4 py-8 text-center text-sm text-ink/50">
              오늘 할 일을 다 끝냈어요. 잘하셨어요!
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {items.map((item) => {
                const species = findSpecies(item.plant.species);
                return (
                  <li
                    key={item.log.care_log_id}
                    className="flex items-center gap-3 rounded-card bg-paper p-3"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        router.push(`/sc07?plant=${item.plant.plant_id}`)
                      }
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
                        <span className="block text-xs text-ink/50">
                          {item.log.care_type} · {item.log.scheduled_date}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleComplete(item)}
                      aria-label={`${item.plant.nickname} ${item.log.care_type} 완료`}
                      className="size-10 shrink-0 rounded-full bg-accent text-lg font-bold text-ink"
                    >
                      ✓
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
      <TabBar />
    </>
  );
}
