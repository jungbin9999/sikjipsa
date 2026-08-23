"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AccountScreen() {
  const router = useRouter();
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/sc01");
  };

  /**
   * 회원탈퇴 — 등록 식물을 삭제 상태로 바꾸고 로그아웃한다.
   * 계정(auth.users) 자체 삭제는 service_role 키가 필요해 MVP 범위 밖(문서 기록).
   * 정책상 하위 데이터는 30일 유예 후 완전 파기.
   */
  const handleWithdraw = async () => {
    setIsBusy(true);
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (userId) {
      await supabase
        .from("plants")
        .update({ status: "삭제" })
        .eq("user_id", userId);
    }
    await supabase.auth.signOut();
    router.replace("/sc01");
  };

  return (
    <main className="flex flex-1 flex-col gap-3 px-5 pt-6 pb-4">
      <header className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="뒤로"
          className="-ml-2 flex size-11 items-center justify-center text-2xl leading-none text-ink/60"
        >
          ‹
        </button>
        <h1 className="text-lg font-extrabold">계정 관리</h1>
      </header>

      <button
        type="button"
        onClick={handleSignOut}
        className="flex items-center justify-between rounded-card bg-paper p-4 text-left"
      >
        <span className="text-sm font-bold">로그아웃</span>
        <span className="text-ink/30">›</span>
      </button>

      <button
        type="button"
        onClick={() => setConfirmWithdraw(true)}
        className="flex items-center justify-between rounded-card bg-paper p-4 text-left"
      >
        <span className="text-sm font-bold text-danger">회원탈퇴</span>
        <span className="text-ink/30">›</span>
      </button>

      <p className="px-1 text-xs leading-relaxed text-ink/60">
        탈퇴하면 등록한 식물과 케어 이력이 30일 뒤 완전히 삭제돼요.
      </p>

      {confirmWithdraw && (
        <div className="absolute inset-0 z-10 flex items-end bg-ink/50 p-5">
          <div className="w-full rounded-card bg-paper p-5">
            <p className="font-extrabold">정말 탈퇴할까요?</p>
            <p className="mt-2 text-sm text-ink/60">
              등록한 식물과 케어 이력이 사라져요. 30일 안에는 되돌릴 수 있어요.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmWithdraw(false)}
                className="flex-1 rounded-full bg-cloud py-3.5 text-sm font-bold"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleWithdraw}
                disabled={isBusy}
                className="flex-1 rounded-full bg-danger py-3.5 text-sm font-bold text-paper disabled:opacity-50"
              >
                {isBusy ? "처리 중…" : "탈퇴하기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
