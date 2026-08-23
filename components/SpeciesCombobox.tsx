"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { searchSpecies } from "@/lib/plants";
import type { PlantSpecies } from "@/types";

/**
 * 식물 종류 선택 — plants.json 29종을 클라이언트에서 타이핑에 맞춰 필터링한다.
 * 종류 수가 적어 서버 검색 API를 두지 않는다(MVP 구현 범위).
 */
export default function SpeciesCombobox({
  onSelect,
}: {
  onSelect: (species: PlantSpecies) => void;
}) {
  const [keyword, setKeyword] = useState("");
  const results = useMemo(() => searchSpecies(keyword), [keyword]);

  return (
    <div className="flex flex-1 flex-col gap-4">
      <input
        type="search"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        placeholder="식물 종류를 검색하세요"
        autoFocus
        className="rounded-field bg-paper px-4 py-3.5 text-base ring-1 ring-ink/10 outline-none placeholder:text-ink/50 focus:ring-2 focus:ring-ink"
      />

      {results.length === 0 ? (
        <p className="py-10 text-center text-sm text-ink/60">
          검색 결과가 없어요. 다른 이름으로 찾아보세요.
        </p>
      ) : (
        <ul className="flex flex-col gap-2 pb-4">
          {results.map((species) => (
            <li key={species.id}>
              <button
                type="button"
                onClick={() => onSelect(species)}
                className="flex w-full items-center gap-3 rounded-field bg-paper p-3 text-left transition active:scale-[0.99]"
              >
                <Image
                  src={species.image_url}
                  alt=""
                  width={48}
                  height={48}
                  className="size-12 shrink-0 rounded-xl object-cover"
                />
                <span className="min-w-0">
                  <span className="block font-bold">{species.name}</span>
                  <span className="block truncate text-xs text-ink/60">
                    물주기 {species.base_watering_interval_days}일 ·{" "}
                    {species.light_condition_default}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
