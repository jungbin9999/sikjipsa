"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TabBar from "@/components/TabBar";
import { toDateString } from "@/lib/care-calc";
import {
  buildCalendarDays,
  formatRangeLabel,
  isSameDay,
  shiftAnchor,
  WEEKDAY_LABELS,
  type CalendarView,
} from "@/lib/calendar";
import { completeCareItem } from "@/lib/care-service";
import { supabase } from "@/lib/supabase";
import { fetchWeather, weatherEmoji } from "@/lib/weather";
import type { CareLog, Plant } from "@/types";

/** 케어 유형별 배지 색 — 화면설계서 "날짜별 식물 배지(색상 구분)" */
const BADGE_TONE: Record<string, string> = {
  물주기: "bg-accent",
  분갈이: "bg-lilac",
};

export default function CalendarScreen() {
  const router = useRouter();
  const today = useMemo(() => new Date(), []);

  const [view, setView] = useState<CalendarView>("월간");
  const [anchor, setAnchor] = useState<Date>(today);
  const [selectedDate, setSelectedDate] = useState<string>(toDateString(today));
  const [plants, setPlants] = useState<Plant[] | null>(null);
  const [logs, setLogs] = useState<CareLog[]>([]);
  /** 예정일이 지났는데 아직 안 한 항목 — 보이는 범위 밖에 있어도 오늘 칸으로 끌어온다 */
  const [overdueLogs, setOverdueLogs] = useState<CareLog[]>([]);
  const [todayEmoji, setTodayEmoji] = useState<string | null>(null);

  const days = useMemo(() => buildCalendarDays(anchor, view), [anchor, view]);

  const load = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      router.replace("/sc01");
      return;
    }

    const { data: plantRows } = await supabase
      .from("plants")
      .select("*")
      .eq("status", "활성");
    setPlants((plantRows ?? []) as Plant[]);

    const from = toDateString(days[0]);
    const to = toDateString(days[days.length - 1]);
    const { data: logRows } = await supabase
      .from("care_logs")
      .select("*")
      .gte("scheduled_date", from)
      .lte("scheduled_date", to);
    setLogs((logRows ?? []) as CareLog[]);

    // 오늘 방금 처리한 것까지 함께 가져와야 완료 직후에도 오늘 칸에서 사라지지 않는다
    const todayKey = toDateString(today);
    const { data: overdueRows } = await supabase
      .from("care_logs")
      .select("*")
      .lt("scheduled_date", todayKey)
      .or(`is_completed.eq.false,completed_at.eq.${todayKey}`)
      .order("scheduled_date", { ascending: true });
    setOverdueLogs((overdueRows ?? []) as CareLog[]);
  }, [days, router, today]);

  useEffect(() => {
    load();
  }, [load]);

  // 뷰·범위를 옮겨 선택 날짜가 화면 밖으로 나가면 범위 안으로 되돌린다
  useEffect(() => {
    const visible = days.map((day) => toDateString(day));
    if (visible.includes(selectedDate)) return;
    const todayKey = toDateString(today);
    setSelectedDate(visible.includes(todayKey) ? todayKey : visible[0]);
  }, [days, selectedDate, today]);

  // 날씨 아이콘은 오늘 칸에만 — 무료 티어에는 과거·미래 일별 날씨가 없다
  useEffect(() => {
    const loadWeather = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("location")
        .eq("user_id", userId)
        .single();
      const snapshot = await fetchWeather(profile?.location ?? null);
      if (snapshot) setTodayEmoji(weatherEmoji(snapshot.description));
    };
    loadWeather();
  }, []);

  const plantById = useMemo(
    () => new Map((plants ?? []).map((plant) => [plant.plant_id, plant])),
    [plants],
  );

  const overdue = useMemo(
    () => overdueLogs.filter((log) => plantById.has(log.plant_id)),
    [overdueLogs, plantById],
  );

  const logsByDate = useMemo(() => {
    const map = new Map<string, CareLog[]>();
    for (const log of logs) {
      if (!plantById.has(log.plant_id)) continue;
      const list = map.get(log.scheduled_date) ?? [];
      list.push(log);
      map.set(log.scheduled_date, list);
    }
    // 밀린 항목은 원래 날짜가 아니라 오늘 해야 할 일이므로 오늘 칸에도 함께 표시
    const todayKey = toDateString(today);
    if (overdue.length > 0) {
      map.set(todayKey, [...overdue, ...(map.get(todayKey) ?? [])]);
    }
    return map;
  }, [logs, plantById, overdue, today]);

  const isTodaySelected = selectedDate === toDateString(today);
  const selectedLogs = logsByDate.get(selectedDate) ?? [];
  const overdueIds = new Set(overdue.map((log) => log.care_log_id));

  const handleComplete = async (log: CareLog) => {
    const plant = plantById.get(log.plant_id);
    if (!plant) return;
    const done = (each: CareLog) =>
      each.care_log_id === log.care_log_id
        ? { ...each, is_completed: true, completed_at: toDateString(new Date()) }
        : each;
    setLogs((previous) => previous.map(done));
    // 밀린 항목은 logs가 아니라 overdueLogs에서 오므로 여기도 같이 눌러준다
    setOverdueLogs((previous) => previous.map(done));
    await completeCareItem({ log, plant }, null);
    load();
  };

  return (
    <>
      <main className="flex flex-1 flex-col gap-3 px-5 pb-4">
        <div className="sticky top-0 z-10 -mx-5 flex items-center justify-between bg-cloud px-5 pt-6 pb-3 shadow-[0_10px_12px_-10px_rgba(8,8,10,0.25)]">
          <h1 className="text-2xl font-extrabold">달력</h1>
          <div className="flex gap-1 rounded-full bg-ink/5 p-1 text-xs font-semibold">
            {(["월간", "주간"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setView(value)}
                className={`rounded-full px-3 py-1.5 transition ${
                  view === value ? "bg-ink text-paper" : "text-ink/60"
                }`}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-card bg-ink px-4 py-3 text-paper">
          <button
            type="button"
            onClick={() => setAnchor(shiftAnchor(anchor, view, -1))}
            aria-label="이전"
            className="px-2 text-lg leading-none text-paper/60"
          >
            ‹
          </button>
          <p className="text-sm font-bold">{formatRangeLabel(anchor, view)}</p>
          <button
            type="button"
            onClick={() => setAnchor(shiftAnchor(anchor, view, 1))}
            aria-label="다음"
            className="px-2 text-lg leading-none text-paper/60"
          >
            ›
          </button>
        </div>

        {plants !== null && plants.length === 0 && (
          <p className="rounded-card bg-paper px-4 py-6 text-center text-sm text-ink/60">
            등록한 식물이 없어 표시할 일정이 없어요.
          </p>
        )}

        <div className="rounded-card bg-paper p-3">
          <div className="mb-1 grid grid-cols-7">
            {WEEKDAY_LABELS.map((label) => (
              <span
                key={label}
                className="py-1 text-center text-[11px] font-semibold text-ink/60"
              >
                {label}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-1">
            {days.map((day) => {
              const key = toDateString(day);
              const dayLogs = logsByDate.get(key) ?? [];
              const isCurrentMonth =
                view === "주간" || day.getMonth() === anchor.getMonth();
              const isSelected = key === selectedDate;
              const isToday = isSameDay(day, today);

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDate(key)}
                  className={`flex h-12 flex-col items-center justify-center gap-0.5 rounded-xl transition ${
                    isSelected
                      ? "bg-ink text-paper"
                      : isToday
                        ? "ring-2 ring-accent ring-inset"
                        : ""
                  }`}
                >
                  {/* 날씨 아이콘은 날짜를 가리지 않도록 위에 작게 병기 */}
                  {isToday && todayEmoji && (
                    <span className="text-[9px] leading-none">{todayEmoji}</span>
                  )}
                  <span
                    className={`text-xs leading-none font-semibold ${
                      isSelected
                        ? "text-paper"
                        : isCurrentMonth
                          ? "text-ink"
                          : "text-ink/60"
                    }`}
                  >
                    {day.getDate()}
                  </span>
                  <span className="flex h-1.5 items-center gap-0.5">
                    {dayLogs.slice(0, 3).map((log) => (
                      <span
                        key={log.care_log_id}
                        className={`size-1.5 rounded-full ${
                          log.is_completed
                            ? // 선택된 칸은 배경이 블랙이라 회색 점이 묻힌다
                              isSelected
                              ? "bg-paper/40"
                              : "bg-ink/20"
                            : BADGE_TONE[log.care_type]
                        }`}
                      />
                    ))}
                    {dayLogs.length > 3 && (
                      <span className="text-[9px] leading-none font-bold text-ink/60">
                        +{dayLogs.length - 3}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex justify-center gap-3 text-[11px] text-ink/60">
          <span className="flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-accent" /> 물주기
          </span>
          <span className="flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-lilac" /> 분갈이
          </span>
          <span className="flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-ink/20" /> 완료
          </span>
        </div>

        <section className="flex min-h-0 flex-1 flex-col gap-2">
          <h2 className="pl-1 text-sm font-bold">{selectedDate}</h2>
          {selectedLogs.length === 0 ? (
            <p className="rounded-card bg-paper px-4 py-6 text-center text-sm text-ink/60">
              {isTodaySelected
                ? "오늘 할 일이 없어요. 푹 쉬어도 좋아요."
                : "이 날은 예정된 케어가 없어요."}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {selectedLogs.map((log) => {
                const plant = plantById.get(log.plant_id);
                return (
                  <li
                    key={log.care_log_id}
                    className="flex items-center gap-3 rounded-card bg-paper p-3"
                  >
                    <span
                      className={`size-2.5 shrink-0 rounded-full ${
                        log.is_completed
                          ? "bg-ink/20"
                          : BADGE_TONE[log.care_type]
                      }`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-bold">
                          {plant?.nickname}
                        </span>
                        {!log.is_completed && overdueIds.has(log.care_log_id) && (
                          <span className="shrink-0 rounded-full bg-lilac/30 px-1.5 py-0.5 text-[10px] font-bold text-ink">
                            밀림
                          </span>
                        )}
                      </span>
                      <span className="block text-xs text-ink/60">
                        {log.care_type}
                        {log.is_completed
                          ? ` · ${log.completed_at} 완료`
                          : /* 오늘 칸으로 끌어온 항목만 원래 예정일을 병기 */
                            overdueIds.has(log.care_log_id) &&
                              log.scheduled_date !== selectedDate
                            ? ` · 예정 ${log.scheduled_date}`
                            : ""}
                      </span>
                    </span>
                    {!log.is_completed && (
                      <button
                        type="button"
                        onClick={() => handleComplete(log)}
                        aria-label={`${plant?.nickname} ${log.care_type} 완료`}
                        className="size-11 shrink-0 rounded-full bg-accent text-base font-bold text-ink"
                      >
                        ✓
                      </button>
                    )}
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
