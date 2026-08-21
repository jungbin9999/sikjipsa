"use client";

import { useRouter } from "next/navigation";

// TODO: 구현 착수 순서 5번에서 SC-02 온보딩(위치·알림 권한, 첫 식물 등록 유도)으로 대체
export default function OnboardingScreen() {
  const router = useRouter();

  return (
    <div className="flex flex-1 flex-col bg-ink text-paper">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-2xl font-extrabold">SC-02 온보딩</h1>
        <p className="text-sm text-paper/60">
          회원가입이 완료됐어요. 온보딩 화면은 구현 착수 순서 5번에서 만듭니다.
        </p>
        <button
          type="button"
          onClick={() => router.replace("/sc03")}
          className="mt-2 rounded-full bg-accent px-6 py-3 text-sm font-bold text-ink"
        >
          건너뛰기
        </button>
      </main>
    </div>
  );
}
