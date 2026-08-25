"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signInAsDemo } from "@/lib/demo";
import { supabase } from "@/lib/supabase";

type Mode = "login" | "signup";

// 화면설계서 SC-01에 에러 문구 정의가 없어 임시로 둔 문구 — 확정 후 교체
// 문구가 아니라 Supabase 에러 코드로 매칭(메시지 문자열은 마침표 유무 등이 바뀔 수 있음)
const ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: "이메일 또는 비밀번호가 올바르지 않아요.",
  user_already_exists: "이미 가입된 이메일이에요. 로그인해 주세요.",
  email_exists: "이미 가입된 이메일이에요. 로그인해 주세요.",
  weak_password: "비밀번호는 6자 이상으로 입력해 주세요.",
  email_address_invalid: "이메일 형식을 확인해 주세요.",
  over_request_rate_limit: "요청이 많아요. 잠시 후 다시 시도해 주세요.",
};
const FALLBACK_ERROR = "잠시 후 다시 시도해 주세요.";

export default function AuthScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 이미 로그인된 상태로 진입하면 오늘 탭으로 replace (화면 흐름도 "기존 회원 자동로그인")
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/sc03");
    });
  }, [router]);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
  };

  /** 데모 계정으로 바로 진입 — 가입 없이 화면을 보여주기 위한 경로 */
  const handleDemo = async () => {
    if (isSubmitting) return;
    setError(null);
    setIsSubmitting(true);

    const { error: demoError } = await signInAsDemo();
    if (demoError) {
      setError("데모 계정을 여는 데 실패했어요. 잠시 후 다시 시도해 주세요.");
      setIsSubmitting(false);
      return;
    }
    router.replace("/sc03");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;

    setError(null);
    setIsSubmitting(true);

    const credentials = { email: email.trim(), password };
    const { error: authError } =
      mode === "login"
        ? await supabase.auth.signInWithPassword(credentials)
        : await supabase.auth.signUp(credentials);

    if (authError) {
      setError(
        (authError.code && ERROR_MESSAGES[authError.code]) ?? FALLBACK_ERROR,
      );
      setIsSubmitting(false);
      return;
    }

    // 회원가입 → 온보딩으로 push, 기존 회원 로그인 → 오늘 탭으로 replace
    if (mode === "signup") router.push("/sc02");
    else router.replace("/sc03");
  };

  return (
    // 입구 화면(SC-01·SC-02)만 다크 — 그 외 화면은 라이트가 기본
    <div className="flex flex-1 flex-col bg-ink text-paper">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-12">
        <div className="mb-12">
          {/* 라임 판 위에 올리면 초록 새싹이 배경에 묻혀서, 다크 배경에 그대로 둔다 */}
          <p className="mb-5 text-5xl leading-none" aria-hidden>
            🌱
          </p>
          <h1 className="text-4xl leading-tight font-extrabold tracking-tight">
            식물과 사는 법,
            <br />
            식집사가 알려줄게요
          </h1>
          <p className="mt-3 text-sm text-paper/60">
            날씨까지 계산한 물주기 알림
          </p>
        </div>

        {/* 포트폴리오 열람자가 가입 없이 바로 볼 수 있게, 로그인 폼보다 위에 둔다 */}
        <button
          type="button"
          onClick={handleDemo}
          disabled={isSubmitting}
          className="mb-3 rounded-full bg-accent py-4 text-base font-bold text-ink transition disabled:opacity-50"
        >
          {isSubmitting ? "여는 중…" : "데모 계정으로 바로 보기"}
        </button>
        <p className="mb-7 text-center text-xs text-paper/60">
          가입 없이 식물 9개가 등록된 화면을 둘러볼 수 있어요
        </p>

        <div className="mb-6 grid grid-cols-2 gap-1 rounded-full bg-paper/10 p-1 text-sm font-semibold">
          {(["login", "signup"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => switchMode(value)}
              className={`rounded-full py-2.5 transition ${
                mode === value
                  ? "bg-accent text-ink"
                  : "text-paper/60 hover:text-paper"
              }`}
            >
              {value === "login" ? "로그인" : "회원가입"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-2">
            <span className="pl-1 text-xs font-medium text-paper/60">
              이메일
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="rounded-field bg-paper px-4 py-3.5 text-base text-ink outline-none placeholder:text-ink/60 focus:ring-2 focus:ring-accent"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="pl-1 text-xs font-medium text-paper/60">
              비밀번호
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              placeholder="6자 이상"
              className="rounded-field bg-paper px-4 py-3.5 text-base text-ink outline-none placeholder:text-ink/60 focus:ring-2 focus:ring-accent"
            />
          </label>

          {error && (
            <p role="alert" className="pl-1 text-sm text-danger-soft">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-3 rounded-full bg-paper/10 py-4 text-base font-bold text-paper ring-1 ring-paper/20 transition disabled:opacity-50"
          >
            {isSubmitting
              ? "처리 중…"
              : mode === "login"
                ? "로그인"
                : "회원가입"}
          </button>
        </form>
      </main>
    </div>
  );
}
