"use client";

import { useRouter } from "next/navigation";

// TODO: 구현 착수 순서 5번에서 SC-02 온보딩(위치·알림 권한, 첫 식물 등록 유도)으로 대체
export default function OnboardingScreen() {
  const router = useRouter();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-xl font-bold">SC-02 온보딩</h1>
      <p className="text-sm text-neutral-500">
        회원가입이 완료됐어요. 온보딩 화면은 구현 착수 순서 5번에서 만듭니다.
      </p>
      <button
        type="button"
        onClick={() => router.replace("/sc03")}
        className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white"
      >
        건너뛰기
      </button>
    </main>
  );
}
