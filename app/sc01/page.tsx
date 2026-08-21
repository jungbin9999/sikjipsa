"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
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
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-10">
      <div className="mb-10 flex flex-col items-center gap-3">
        <Image
          src="/images/logo_icon.png"
          alt=""
          width={64}
          height={64}
          className="h-16 w-16"
          priority
        />
        <h1 className="text-2xl font-bold">식집사</h1>
        <p className="text-sm text-neutral-500">날씨를 아는 AI 식물집사</p>
      </div>

      <div className="mb-6 grid grid-cols-2 rounded-lg bg-neutral-100 p-1 text-sm font-medium">
        {(["login", "signup"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => switchMode(value)}
            className={`rounded-md py-2 transition ${
              mode === value
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-500"
            }`}
          >
            {value === "login" ? "로그인" : "회원가입"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">이메일</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="rounded-lg border border-neutral-300 px-3 py-2.5 text-base outline-none focus:border-emerald-500"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">비밀번호</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            placeholder="6자 이상"
            className="rounded-lg border border-neutral-300 px-3 py-2.5 text-base outline-none focus:border-emerald-500"
          />
        </label>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 rounded-lg bg-emerald-600 py-3 text-base font-semibold text-white transition disabled:opacity-60"
        >
          {isSubmitting
            ? "처리 중…"
            : mode === "login"
              ? "로그인"
              : "회원가입"}
        </button>
      </form>
    </main>
  );
}
