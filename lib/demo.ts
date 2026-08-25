import { supabase } from "@/lib/supabase";

/**
 * 포트폴리오 열람자용 데모 계정.
 *
 * 열람자가 가입 없이 바로 화면을 볼 수 있게 두는 공개 계정이라, 자격증명이 코드에
 * 그대로 있는 것이 의도된 설계다(감춰야 할 비밀이 아니다).
 * 실제 사용자 계정이 아니며, RLS 때문에 이 계정으로는 데모 데이터만 보인다.
 *
 * 데이터를 다시 채우려면 `docs/dev-log.md`의 데모 시드 항목 참조.
 */
export const DEMO_ACCOUNT = {
  email: "demo@sikjipsa.app",
  password: "sikjipsa-demo-2026",
} as const;

/** 데모 계정으로 로그인 — 성공하면 호출한 쪽에서 SC-03으로 보낸다 */
export async function signInAsDemo() {
  return supabase.auth.signInWithPassword({
    email: DEMO_ACCOUNT.email,
    password: DEMO_ACCOUNT.password,
  });
}
