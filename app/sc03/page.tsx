"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// TODO: 구현 착수 순서 6번에서 SC-03 오늘의 케어 요약으로 대체
// 로그아웃 버튼도 SC-12(계정 관리) 구현 전까지 쓰는 임시 배치
export default function TodayCareScreen() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("/sc01");
      else setEmail(data.session.user.email ?? null);
    });
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/sc01");
  };

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-6 py-10">
      <div className="rounded-card bg-paper p-6">
        <h1 className="text-xl font-extrabold">SC-03 오늘의 케어 요약</h1>
        <p className="mt-2 text-sm text-ink/60">
          {email ? `${email} 로 로그인됨` : "세션 확인 중…"}
        </p>
        <p className="mt-1 text-xs text-ink/40">
          이 화면은 구현 착수 순서 6번에서 만듭니다.
        </p>
      </div>
      <button
        type="button"
        onClick={handleSignOut}
        className="self-start rounded-full bg-ink px-6 py-3 text-sm font-bold text-paper"
      >
        로그아웃
      </button>
    </main>
  );
}
