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

/**
 * 삭제는 곧바로 지우지 않고 보관 처리가 기본(정책정의서 "식물 삭제 처리").
 * 전에는 보관·삭제 버튼을 따로 뒀는데, 정책이 원래 하나이고 보관함 화면도 없어서
 * "나중에 다시 꺼낼 수 있다"는 지킬 수 없는 약속이 됐다. 삭제 하나로 합친다.
 */
const CONFIRM_TEXT = {
  title: "이 식물을 삭제할까요?",
  body: "케어 일정과 이력이 함께 사라져요. 30일 동안 보관된 뒤 완전히 삭제됩니다.",
};

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

function PlantDetail() {
  const router = useRouter();
  const plantId = useSearchParams().get("plant");

  const [plant, setPlant] = useState<Plant | null>(null);
  const [wateringLogs, setWateringLogs] = useState<CareLog[]>([]);
  const [repottingLogs, setRepottingLogs] = useState<CareLog[]>([]);
  const [section, setSection] = useState<Section>("물주기");
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState("");
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

  /** 애칭 변경 — 예정일 계산과 무관해서 care-service를 거치지 않는다 */
  const saveNickname = async () => {
    if (!plant) return;
    const next = nicknameDraft.trim();
    setEditingNickname(false);
    if (!next || next === plant.nickname) return;

    setPlant({ ...plant, nickname: next });
    await supabase
      .from("plants")
      .update({ nickname: next })
      .eq("plant_id", plant.plant_id);
    notify("애칭을 바꿨어요");
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
        <p className="text-sm text-ink/60">식물 정보를 찾을 수 없어요.</p>
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
        <p className="text-sm text-ink/60">불러오는 중…</p>
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
          className="-ml-2 flex size-11 items-center justify-center text-2xl leading-none text-ink/60"
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
        <div className="min-w-0 flex-1">
          {editingNickname ? (
            <input
              type="text"
              value={nicknameDraft}
              onChange={(e) => setNicknameDraft(e.target.value)}
              onBlur={saveNickname}
              onKeyDown={(e) => e.key === "Enter" && saveNickname()}
              autoFocus
              maxLength={20}
              placeholder="애칭"
              className="w-full rounded-lg bg-paper/10 px-2 py-1 text-lg font-extrabold text-paper outline-none placeholder:text-paper/50"
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setNicknameDraft(plant.nickname);
                setEditingNickname(true);
              }}
              className="flex min-h-11 w-full items-center text-left text-lg font-extrabold"
            >
              <span className="truncate">{plant.nickname}</span>
              <span className="ml-1.5 shrink-0 text-xs text-paper/60">수정</span>
            </button>
          )}
          <p className="truncate text-xs text-paper/60">
            {plant.species} · {plant.adopted_at}부터 함께
          </p>
          <span className="mt-1.5 inline-block rounded-full bg-paper/10 px-2 py-0.5 text-[11px] font-semibold text-paper/70">
            종별 기본 {species?.base_watering_interval_days}일 주기
          </span>
        </div>
      </section>

      <p className="-mt-1 px-1 text-[11px] text-ink/60">
        화분 크기는 분갈이 탭에서, 놓아둔 자리는 배치 위치 탭에서 바꿀 수 있어요.
      </p>

      {/* 탭형 하위 섹션 — 화면 이동 없이 데이터만 교체 */}
      <div className="grid grid-cols-3 gap-1 rounded-full bg-ink/5 p-1 text-sm font-semibold">
        {SECTIONS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setSection(value)}
            className={`rounded-full py-2 transition ${
              section === value ? "bg-ink text-paper" : "text-ink/60"
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
              <p className="py-6 text-center text-xs text-ink/60">
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
                    <span className="text-xs font-semibold text-ink/60">
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
            <p className="text-xs font-semibold text-paper/60">
              다음 분갈이 권장
            </p>
            <p className="mt-1 text-3xl font-extrabold">
              {dday(plant.next_repotting_date)}
            </p>
            <p className="mt-1 text-xs text-paper/60">
              {plant.next_repotting_date} · 생장속도 {species?.growth_rate}
              {plant.pot_size ? ` · ${plant.pot_size} 화분` : ""}
            </p>
          </section>

          {daysUntil(plant.next_repotting_date) <= 30 && (
            <button
              type="button"
              onClick={() => router.push("/sc09")}
              className="rounded-card bg-lilac px-4 py-3 text-left text-xs font-bold text-ink"
            >
              분갈이 시기가 다가와요. 화분·흙 보러 가기 ›
            </button>
          )}

          <section className="rounded-card bg-paper p-4">
            <h2 className="text-sm font-bold">화분 크기</h2>
            <p className="mt-1 text-xs text-ink/60">
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
              <p className="py-6 text-center text-xs text-ink/60">
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
                    <span className="text-xs font-semibold text-ink/60">
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

      <div className="mt-auto flex justify-center pt-2">
        <button
          type="button"
          onClick={() => setIsConfirmingDelete(true)}
          className="rounded-full px-6 py-3.5 text-sm font-bold text-danger"
        >
          삭제하기
        </button>
      </div>

      {savedNotice && (
        <p className="pointer-events-none absolute inset-x-5 bottom-24 rounded-full bg-ink px-4 py-3 text-center text-xs font-semibold text-paper">
          {savedNotice}
        </p>
      )}

      {isConfirmingDelete && (
        <div className="absolute inset-0 z-10 flex items-end bg-ink/50 p-5">
          <div className="w-full rounded-card bg-paper p-5">
            <p className="font-extrabold">{CONFIRM_TEXT.title}</p>
            <p className="mt-2 text-sm text-ink/60">{CONFIRM_TEXT.body}</p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(false)}
                className="flex-1 rounded-full bg-cloud py-3.5 text-sm font-bold"
              >
                취소
              </button>
              <button
                type="button"
                /* 정책상 삭제의 기본 동작이 보관함 이동 — '삭제' 상태는 30일 뒤 완전삭제용 */
                onClick={() => applyStatus("보관")}
                className="flex-1 rounded-full bg-ink py-3.5 text-sm font-bold text-paper"
              >
                삭제하기
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
          <p className="text-sm text-ink/60">불러오는 중…</p>
        </main>
      }
    >
      <PlantDetail />
    </Suspense>
  );
}
