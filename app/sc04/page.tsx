"use client";

import { useRouter } from "next/navigation";
import TabBar from "@/components/TabBar";

/** SC-04 빈 상태 — 등록 식물 0개일 때 오늘 탭을 대체한다 */
export default function EmptyStateScreen() {
  const router = useRouter();

  return (
    <>
      <main className="flex flex-1 flex-col justify-center gap-4 px-5">
        <section className="rounded-card bg-accent px-6 py-10 text-center text-ink">
          <p className="text-5xl">🌱</p>
          <h1 className="mt-4 text-2xl leading-snug font-extrabold">
            아직 돌볼
            <br />
            식물이 없어요
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-ink/60">
            첫 식물을 등록하면 날씨에 맞춘
            <br />
            물주기 일정을 바로 만들어 드릴게요.
          </p>
        </section>
        <button
          type="button"
          onClick={() => router.push("/sc08")}
          className="rounded-full bg-ink py-4 text-base font-bold text-paper"
        >
          첫 식물 등록하기
        </button>
      </main>
      <TabBar />
    </>
  );
}
