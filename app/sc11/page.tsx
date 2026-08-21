"use client";

import { useRouter } from "next/navigation";
import TabBar from "@/components/TabBar";
import { supabase } from "@/lib/supabase";

// TODO: 구현 착수 순서 9번에서 SC-11 마이페이지 홈으로 대체
// 로그아웃은 원래 SC-12(계정 관리) 소관 — 그때까지 임시 배치
export default function MyPageScreen() {
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/sc01");
  };

  return (
    <>
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-5 text-center">
        <h1 className="text-xl font-extrabold">SC-11 마이페이지</h1>
        <p className="text-xs text-ink/40">구현 착수 순서 9번에서 만듭니다.</p>
        <button
          type="button"
          onClick={handleSignOut}
          className="rounded-full bg-ink px-6 py-3 text-sm font-bold text-paper"
        >
          로그아웃
        </button>
      </main>
      <TabBar />
    </>
  );
}
