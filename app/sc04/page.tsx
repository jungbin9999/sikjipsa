"use client";

import { useRouter } from "next/navigation";
import TabBar from "@/components/TabBar";

/** SC-04 빈 상태 — 등록 식물 0개일 때 오늘 탭을 대체한다 */
export default function EmptyStateScreen() {
  const router = useRouter();

  return (
    <>
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-8 text-center">
        <div className="flex size-20 items-center justify-center rounded-full bg-accent text-3xl">
          🌱
        </div>
        <div>
          <h1 className="text-xl font-extrabold">아직 돌볼 식물이 없어요</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink/50">
            첫 식물을 등록하면 날씨에 맞춘
            <br />
            물주기 일정을 바로 만들어 드릴게요.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/sc08")}
          className="rounded-full bg-accent px-7 py-3.5 text-sm font-bold text-ink"
        >
          첫 식물 등록하기
        </button>
      </main>
      <TabBar />
    </>
  );
}
