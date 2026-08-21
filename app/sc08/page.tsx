"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import SpeciesCombobox from "@/components/SpeciesCombobox";
import { calcNextRepottingDate, calcNextWateringDate, toDateString } from "@/lib/care-calc";
import { supabase } from "@/lib/supabase";
import type { LightCondition, PlantSpecies, PotSize } from "@/types";

const LIGHT_CONDITIONS: LightCondition[] = ["직사광", "간접광", "그늘"];
const POT_SIZES: PotSize[] = ["소", "중", "대"];

export default function PlantRegisterScreen() {
  const router = useRouter();
  const today = toDateString(new Date());

  // 종류를 고르면 같은 화면에서 다음 입력 단계로 전환(화면 이동 없음)
  const [species, setSpecies] = useState<PlantSpecies | null>(null);
  const [nickname, setNickname] = useState("");
  const [adoptedAt, setAdoptedAt] = useState(today);
  const [lastWateredAt, setLastWateredAt] = useState(today);
  const [potSize, setPotSize] = useState<PotSize | null>(null);
  const [lightCondition, setLightCondition] = useState<LightCondition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelectSpecies = (selected: PlantSpecies) => {
    setSpecies(selected);
    setLightCondition(selected.light_condition_default);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!species || isSubmitting) return;

    // 상태 분기: 필수 입력 누락 시 인라인 경고, 화면 전환 없음
    if (!nickname.trim()) {
      setError("이름·애칭을 입력해 주세요.");
      return;
    }
    if (!lightCondition) {
      setError("배치 위치를 선택해 주세요.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) {
      router.replace("/sc01");
      return;
    }

    const nextWateringDate = calcNextWateringDate({
      lastWateredAt,
      baseWateringIntervalDays: species.base_watering_interval_days,
    });
    const nextRepottingDate = calcNextRepottingDate({
      adoptedAt,
      growthRate: species.growth_rate,
      potSize,
    });

    const { data: plant, error: insertError } = await supabase
      .from("plants")
      .insert({
        user_id: userId,
        species: species.name,
        nickname: nickname.trim(),
        adopted_at: adoptedAt,
        last_watered_at: lastWateredAt,
        pot_size: potSize,
        light_condition: lightCondition,
        next_watering_date: nextWateringDate,
        next_repotting_date: nextRepottingDate,
      })
      .select("plant_id")
      .single();

    if (insertError || !plant) {
      setError("등록에 실패했어요. 잠시 후 다시 시도해 주세요.");
      setIsSubmitting(false);
      return;
    }

    // 케어 캘린더 자동 생성 — 계산된 예정일로 물주기·분갈이 이력 1건씩
    await supabase.from("care_logs").insert([
      { plant_id: plant.plant_id, care_type: "물주기", scheduled_date: nextWateringDate },
      { plant_id: plant.plant_id, care_type: "분갈이", scheduled_date: nextRepottingDate },
    ]);

    router.replace("/sc06");
  };

  if (!species) {
    return (
      <main className="flex flex-1 flex-col gap-5 px-5 pt-6 pb-4">
        <header className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="뒤로"
            className="text-2xl leading-none text-ink/40"
          >
            ‹
          </button>
          <h1 className="text-xl font-extrabold">어떤 식물인가요?</h1>
        </header>
        <SpeciesCombobox onSelect={handleSelectSpecies} />
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col px-5 pt-6 pb-4">
      <header className="mb-5 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setSpecies(null)}
          aria-label="종류 다시 선택"
          className="text-2xl leading-none text-ink/40"
        >
          ‹
        </button>
        <h1 className="text-xl font-extrabold">식물 정보</h1>
      </header>

      <div className="mb-5 flex items-center gap-3 rounded-card bg-paper p-4">
        <Image
          src={species.image_url}
          alt=""
          width={56}
          height={56}
          className="size-14 rounded-2xl object-cover"
        />
        <div className="min-w-0">
          <p className="font-bold">{species.name}</p>
          <p className="truncate text-xs text-ink/50">{species.care_tip}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="pl-1 text-xs font-medium text-ink/50">이름·애칭</span>
          <input
            type="text"
            value={nickname}
            onChange={(e) => {
              setNickname(e.target.value);
              setError(null);
            }}
            placeholder="몬스테라 1호"
            className="rounded-field bg-paper px-4 py-3.5 text-base ring-1 ring-ink/10 outline-none placeholder:text-ink/30 focus:ring-2 focus:ring-ink"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-2">
            <span className="pl-1 text-xs font-medium text-ink/50">입양일</span>
            <input
              type="date"
              value={adoptedAt}
              max={today}
              onChange={(e) => setAdoptedAt(e.target.value)}
              className="rounded-field bg-paper px-4 py-3.5 text-sm ring-1 ring-ink/10 outline-none focus:ring-2 focus:ring-ink"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="pl-1 text-xs font-medium text-ink/50">마지막 물준날</span>
            <input
              type="date"
              value={lastWateredAt}
              max={today}
              onChange={(e) => setLastWateredAt(e.target.value)}
              className="rounded-field bg-paper px-4 py-3.5 text-sm ring-1 ring-ink/10 outline-none focus:ring-2 focus:ring-ink"
            />
          </label>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="pl-1 pb-2 text-xs font-medium text-ink/50">
            화분 크기 <span className="text-ink/30">(선택)</span>
          </legend>
          <div className="grid grid-cols-3 gap-2">
            {POT_SIZES.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setPotSize(potSize === size ? null : size)}
                className={`rounded-full py-3 text-sm font-semibold transition ${
                  potSize === size ? "bg-ink text-paper" : "bg-paper text-ink/60"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="pl-1 pb-2 text-xs font-medium text-ink/50">
            배치 위치
          </legend>
          <div className="grid grid-cols-3 gap-2">
            {LIGHT_CONDITIONS.map((condition) => (
              <button
                key={condition}
                type="button"
                onClick={() => {
                  setLightCondition(condition);
                  setError(null);
                }}
                className={`rounded-full py-3 text-sm font-semibold transition ${
                  lightCondition === condition
                    ? "bg-ink text-paper"
                    : "bg-paper text-ink/60"
                }`}
              >
                {condition}
              </button>
            ))}
          </div>
        </fieldset>

        {error && (
          <p role="alert" className="pl-1 text-sm text-danger">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-auto rounded-full bg-accent py-4 text-base font-bold text-ink transition disabled:opacity-50"
        >
          {isSubmitting ? "등록 중…" : "등록 완료"}
        </button>
      </form>
    </main>
  );
}
