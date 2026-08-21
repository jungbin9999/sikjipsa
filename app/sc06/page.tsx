"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import TabBar from "@/components/TabBar";
import { findSpecies } from "@/lib/plants";
import { supabase } from "@/lib/supabase";
import type { Plant } from "@/types";

export default function PlantListScreen() {
  const router = useRouter();
  const [plants, setPlants] = useState<Plant[] | null>(null);
  const [keyword, setKeyword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.replace("/sc01");
        return;
      }

      const { data, error: selectError } = await supabase
        .from("plants")
        .select("*")
        .eq("status", "활성")
        .order("created_at", { ascending: false });

      if (selectError) {
        setError("식물 목록을 불러오지 못했어요.");
        setPlants([]);
        return;
      }
      setPlants(data as Plant[]);
    };
    load();
  }, [router]);

  // 검색 — 식물명(종류)과 애칭 둘 다 대상
  const visiblePlants = useMemo(() => {
    if (!plants) return [];
    const trimmed = keyword.trim();
    if (!trimmed) return plants;
    return plants.filter(
      (plant) =>
        plant.nickname.includes(trimmed) || plant.species.includes(trimmed),
    );
  }, [plants, keyword]);

  return (
    <>
      <main className="flex flex-1 flex-col px-5 pt-6 pb-4">
        <header className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-extrabold">내 식물</h1>
          <button
            type="button"
            onClick={() => router.push("/sc08")}
            className="rounded-full bg-accent px-4 py-2 text-sm font-bold text-ink"
          >
            + 등록
          </button>
        </header>

        <input
          type="search"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="식물명 · 애칭으로 검색"
          className="mb-4 rounded-field bg-paper px-4 py-3 text-sm ring-1 ring-ink/10 outline-none placeholder:text-ink/30 focus:ring-2 focus:ring-ink"
        />

        {plants === null && (
          <p className="py-10 text-center text-sm text-ink/40">불러오는 중…</p>
        )}

        {error && (
          <p role="alert" className="py-10 text-center text-sm text-danger">
            {error}
          </p>
        )}

        {plants !== null && plants.length === 0 && !error && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <p className="text-sm text-ink/50">아직 등록한 식물이 없어요.</p>
            <button
              type="button"
              onClick={() => router.push("/sc08")}
              className="rounded-full bg-ink px-6 py-3 text-sm font-bold text-paper"
            >
              첫 식물 등록하기
            </button>
          </div>
        )}

        {plants !== null && plants.length > 0 && visiblePlants.length === 0 && (
          <p className="py-10 text-center text-sm text-ink/40">
            검색 결과가 없어요.
          </p>
        )}

        <ul className="flex flex-col gap-3">
          {visiblePlants.map((plant) => {
            const species = findSpecies(plant.species);
            return (
              <li key={plant.plant_id}>
                <button
                  type="button"
                  onClick={() => router.push(`/sc07?plant=${plant.plant_id}`)}
                  className="flex w-full items-center gap-3 rounded-card bg-paper p-3 text-left transition active:scale-[0.99]"
                >
                  {species && (
                    <Image
                      src={species.image_url}
                      alt=""
                      width={64}
                      height={64}
                      className="size-16 shrink-0 rounded-2xl object-cover"
                    />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">
                      {plant.nickname}
                    </span>
                    <span className="block text-xs text-ink/50">
                      {plant.species}
                    </span>
                    <span className="mt-1 block truncate text-xs text-ink/40">
                      {species?.care_tip}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </main>
      <TabBar />
    </>
  );
}
