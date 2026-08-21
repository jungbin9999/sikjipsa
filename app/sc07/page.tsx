"use client";

import { useRouter } from "next/navigation";

// TODO: 구현 착수 순서 6번에서 SC-07 식물 상세로 대체
export default function PlantDetailScreen() {
  const router = useRouter();

  return (
    <main className="mx-auto flex w-full flex-1 flex-col justify-center gap-4 px-5 py-10">
      <div className="rounded-card bg-paper p-6">
        <h1 className="text-xl font-extrabold">SC-07 식물 상세</h1>
        <p className="mt-1 text-xs text-ink/40">
          이 화면은 구현 착수 순서 6번에서 만듭니다.
        </p>
      </div>
      <button
        type="button"
        onClick={() => router.back()}
        className="self-start rounded-full bg-ink px-6 py-3 text-sm font-bold text-paper"
      >
        뒤로
      </button>
    </main>
  );
}
