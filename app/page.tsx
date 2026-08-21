"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// 진입점 — 세션 유무에 따라 SC-01(로그인) 또는 SC-03(오늘 탭)으로 보낸다
export default function Home() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      router.replace(data.session ? "/sc03" : "/sc01");
    });
  }, [router]);

  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <p className="text-sm text-neutral-500">불러오는 중…</p>
    </main>
  );
}
