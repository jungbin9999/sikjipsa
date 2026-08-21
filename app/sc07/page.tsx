"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { updateLightCondition, updatePotSize } from "@/lib/care-service";
import { findSpecies } from "@/lib/plants";
import { supabase } from "@/lib/supabase";
import { cardTone } from "@/lib/tone";
import type {
  CareLog,
  LightCondition,
  Plant,
  PlantStatus,
  PotSize,
} from "@/types";

const SECTIONS = ["물주기", "분갈이", "배치 위치"] as const;
type Section = (typeof SECTIONS)[number];

const LIGHT_CONDITIONS: LightCondition[] = ["직사광", "간접광", "그늘"];
const POT_SIZES: PotSize[] = ["소", "중", "대"];

/** 삭제는 곧바로 지우지 않고 보관 처리가 기본(정책정의서 "식물 삭제 처리") */
const CONFIRM_TEXT: Record<"보관" | "삭제", { title: string; body: string }> = {
  보관: {
    title: "보관함으로 옮길까요?",
    body: "보관하면 오늘의 케어와 리스트에서 사라져요. 나중에 다시 꺼낼 수 있어요.",
  },
  삭제: {
    title: "이 식물을 삭제할까요?",
    body: "삭제해도 30일 동안은 보관되고, 그 뒤에 완전히 사라져요.",
  },
};

function dday(target: string): string {
  const diff = Math.round(
    (new Date(`${target}T00:00:00`).getTime() -
      new Date(new Date().toDateString()).getTime()) /
      86400000,
  );
  if (diff === 0) return "오늘";
  return diff > 0 ? `D-${diff}` : `${-diff}일 지남`;
}

function PlantDetail() {
  const router = useRouter();
  const plantId = useSearchParams().get("plant");

  const [plant, setPlant] = useState<Plant | null>(null);
  const [wateringLogs, setWateringLogs] = useState<CareLog[]>([]);
  const [repottingLogs, setRepottingLogs] = useState<CareLog[]>([]);
  const [section, setSection] = useState<Section>("물주기");
  const [confirmAction, setConfirmAction] = useState<"보관" | "삭제" | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [isMissing, setIsMissing] = useState(false);

  const load = useCallback(async () => {
    if (!plantId) {
      setIsMissing(true);
      return;
    }

    const { data: plantRow } = await supabase
      .from("plants")
      .select("*")
      .eq("plant_id", plantId)
      .single();

    if (!plantRow) {
      setIsMissing(true);
      return;
    }
    setPlant(plantRow as Plant);

    const { data: logRows } = await supabase
      .from("care_logs")
      .select("*")
      .eq("plant_id", plantId)
      .eq("is_completed", true)
      .order("completed_at", { ascending: false })
      .limit(30);

    const logs = (logRows ?? []) as CareLog[];
    setWateringLogs(logs.filter((log) => log.care_type === "물주기"));
    setRepottingLogs(logs.filter((log) => log.care_type === "분갈이"));
  }, [plantId]);

  useEffect(() => {
    load();
  }, [load]);

  const notify = (message: string) => {
    setSavedNotice(message);
    setTimeout(() => setSavedNotice(null), 2000);
  };

  const handleLightChange = async (condition: LightCondition) => {
    if (!plant) return;
    setPlant({ ...plant, light_condition: condition });
    await updateLightCondition(plant.plant_id, condition);
    notify("배치 위치를 저장했어요");
  };

  const handlePotSizeChange = async (size: PotSize) => {
    if (!plant) return;
    const nextRepottingDate = await updatePotSize(plant, size);
    setPlant({
      ...plant,
      pot_size: size,
      next_repotting_date: nextRepottingDate ?? plant.next_repotting_date,
    });
    notify("화분 크기에 맞춰 분갈이 시기를 다시 계산했어요");
  };

  const applyStatus = async (status: PlantStatus) => {
    if (!plant) return;
    await supabase
      .from("plants")
      .update({ status })
      .eq("plant_id", plant.plant_id);
    router.replace("/sc06");
  };

  if (isMissing) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-5 text-center">
        <p className="text-sm text-ink/50">식물 정보를 찾을 수 없어요.</p>
        <button
          type="button"
          onClick={() => router.replace("/sc06")}
          className="rounded-full bg-ink px-6 py-3 text-sm font-bold text-paper"
        >
          내 식물로 돌아가기
        </button>
      </main>
    );
  }

  if (!plant) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-sm text-ink/40">불러오는 중…</p>
      </main>
    );
  }

  const species = findSpecies(plant.species);
  const isPlacementMatched =
    species?.light_condition_default === plant.light_condition;

  return (
    <main className="flex flex-1 flex-col gap-4 px-5 pt-6 pb-4">
      <header className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="뒤로"
          className="text-2xl leading-none text-ink/40"
        >
          ‹
        </button>
        <h1 className="text-lg font-extrabold">식물 상세</h1>
      </header>

      {/* 프로필 — 블랙 카드로 시선을 먼저 잡는다 */}
      <section className="flex items-center gap-4 rounded-card bg-ink p-4 text-paper">
        {species && (
          <Image
            src={species.image_url}
            alt=""
            width={64}
            height={64}
            className="size-16 shrink-0 rounded-2xl object-cover"
          />
        )}
        <div className="min-w-0">
          <p className="truncate text-lg font-extrabold">{plant.nickname}</p>
          <p className="text-xs text-paper/50">
            {plant.species} · {plant.adopted_at}부터 함께
          </p>
          <span className="mt-1.5 inline-block rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-ink">
            다음 물주기 {dday(plant.next_watering_date)}
          </span>
        </div>
      </section>

      {/* 탭형 하위 섹션 — 화면 이동 없이 데이터만 교체 */}
      <div className="grid grid-cols-3 gap-1 rounded-full bg-ink/5 p-1 text-sm font-semibold">
        {SECTIONS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setSection(value)}
            className={`rounded-full py-2 transition ${
              section === value ? "bg-ink text-paper" : "text-ink/50"
            }`}
          >
            {value}
          </button>
        ))}
      </div>

      {section === "물주기" && (
        <>
          <section className="rounded-card bg-accent p-4 text-ink">
            <p className="text-xs font-semibold text-ink/60">다음 물주기</p>
            <p className="mt-1 text-3xl font-extrabold">
              {dday(plant.next_watering_date)}
            </p>
            <p className="mt-1 text-xs text-ink/60">
              {plant.next_watering_date} · 종별 기본{" "}
              {species?.base_watering_interval_days}일 · 마지막{" "}
              {plant.last_watered_at}
            </p>
          </section>

          <section className="rounded-card bg-paper p-4">
            <h2 className="text-sm font-bold">물주기 이력</h2>
            {wateringLogs.length === 0 ? (
              <p className="py-6 text-center text-xs text-ink/40">
                아직 기록된 물주기가 없어요.
              </p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {wateringLogs.map((log) => (
                  <li
                    key={log.care_log_id}
                    className="flex justify-between text-sm"
                  >
                    <span className="text-ink/60">{log.completed_at}</span>
                    <span className="text-xs font-semibold text-ink/40">
                      완료
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {section === "분갈이" && (
        <>
          <section className="rounded-card bg-ink p-4 text-paper">
            <p className="text-xs font-semibold text-paper/50">
              다음 분갈이 권장
            </p>
            <p className="mt-1 text-3xl font-extrabold">
              {dday(plant.next_repotting_date)}
            </p>
            <p className="mt-1 text-xs text-paper/50">
              {plant.next_repotting_date} · 생장속도 {species?.growth_rate}
              {plant.pot_size ? ` · ${plant.pot_size} 화분` : ""}
            </p>
          </section>

          <section className="rounded-card bg-paper p-4">
            <h2 className="text-sm font-bold">화분 크기</h2>
            <p className="mt-1 text-xs text-ink/50">
              바꾸면 분갈이 시기를 다시 계산해요.
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {POT_SIZES.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => handlePotSizeChange(size)}
                  className={`rounded-full py-3 text-sm font-semibold transition ${
                    plant.pot_size === size
                      ? "bg-ink text-paper"
                      : "bg-cloud text-ink/60"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-card bg-paper p-4">
            <h2 className="text-sm font-bold">분갈이 이력</h2>
            {repottingLogs.length === 0 ? (
              <p className="py-6 text-center text-xs text-ink/40">
                아직 분갈이 기록이 없어요.
              </p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {repottingLogs.map((log) => (
                  <li
                    key={log.care_log_id}
                    className="flex justify-between text-sm"
                  >
                    <span className="text-ink/60">{log.completed_at}</span>
                    <span className="text-xs font-semibold text-ink/40">
                      완료
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {section === "배치 위치" && (
        <>
          <section
            className={`rounded-card p-4 ${
              isPlacementMatched
                ? "bg-accent text-ink"
                : "bg-lilac text-ink"
            }`}
          >
            <p className="text-xs font-semibold text-ink/60">현재 배치</p>
            <p className="mt-1 text-3xl font-extrabold">
              {plant.light_condition}
            </p>
            <p className="mt-1 text-xs text-ink/60">
              {isPlacementMatched
                ? `${plant.species}에게 알맞은 자리예요.`
                : `${plant.species}는 ${species?.light_condition_default}을 더 좋아해요.`}
            </p>
          </section>

          <section className="rounded-card bg-paper p-4">
            <h2 className="text-sm font-bold">위치 바꾸기</h2>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {LIGHT_CONDITIONS.map((condition) => (
                <button
                  key={condition}
                  type="button"
                  onClick={() => handleLightChange(condition)}
                  className={`rounded-full py-3 text-sm font-semibold transition ${
                    plant.light_condition === condition
                      ? "bg-ink text-paper"
                      : "bg-cloud text-ink/60"
                  }`}
                >
                  {condition}
                </button>
              ))}
            </div>
            {species && (
              <p className={`mt-3 rounded-xl p-3 text-xs ${cardTone(2).card}`}>
                {species.care_tip}
              </p>
            )}
          </section>
        </>
      )}

      <div className="mt-auto flex gap-2 pt-2">
        <button
          type="button"
          onClick={() => setConfirmAction("보관")}
          className="flex-1 rounded-full bg-paper py-3.5 text-sm font-bold ring-1 ring-ink/10"
        >
          보관하기
        </button>
        <button
          type="button"
          onClick={() => setConfirmAction("삭제")}
          className="flex-1 rounded-full bg-paper py-3.5 text-sm font-bold text-danger ring-1 ring-ink/10"
        >
          삭제하기
        </button>
      </div>

      {savedNotice && (
        <p className="pointer-events-none absolute inset-x-5 bottom-24 rounded-full bg-ink px-4 py-3 text-center text-xs font-semibold text-paper">
          {savedNotice}
        </p>
      )}

      {confirmAction && (
        <div className="absolute inset-0 z-10 flex items-end bg-ink/50 p-5">
          <div className="w-full rounded-card bg-paper p-5">
            <p className="font-extrabold">{CONFIRM_TEXT[confirmAction].title}</p>
            <p className="mt-2 text-sm text-ink/60">
              {CONFIRM_TEXT[confirmAction].body}
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="flex-1 rounded-full bg-cloud py-3.5 text-sm font-bold"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() =>
                  applyStatus(confirmAction === "보관" ? "보관" : "삭제")
                }
                className="flex-1 rounded-full bg-ink py-3.5 text-sm font-bold text-paper"
              >
                {confirmAction}하기
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function PlantDetailScreen() {
  return (
    <Suspense
      fallback={
        <main className="flex flex-1 items-center justify-center">
          <p className="text-sm text-ink/40">불러오는 중…</p>
        </main>
      }
    >
      <PlantDetail />
    </Suspense>
  );
}
