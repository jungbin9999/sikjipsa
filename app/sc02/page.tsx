"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

/** 위치 권한 거부·실패 시 적용하는 기본값(정책정의서 예외처리 규칙) */
const DEFAULT_LOCATION = "서울";

type Step = "location" | "notification" | "plant";

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("location");
  const [location, setLocation] = useState<string | null>(null);
  const [isNotificationAllowed, setIsNotificationAllowed] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  const saveProfile = async (patch: Record<string, unknown>) => {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) {
      router.replace("/sc01");
      return;
    }
    await supabase.from("profiles").update(patch).eq("user_id", userId);
  };

  const requestLocation = async () => {
    setIsBusy(true);
    const value = await new Promise<string>((resolve) => {
      if (!navigator.geolocation) {
        resolve(DEFAULT_LOCATION);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) =>
          resolve(
            `${position.coords.latitude.toFixed(4)},${position.coords.longitude.toFixed(4)}`,
          ),
        // 거부·실패 모두 서울 기준값으로 폴백
        () => resolve(DEFAULT_LOCATION),
        { timeout: 8000 },
      );
    });

    setLocation(value);
    await saveProfile({ location: value });
    setIsBusy(false);
    setStep("notification");
  };

  const skipLocation = async () => {
    setIsBusy(true);
    setLocation(DEFAULT_LOCATION);
    await saveProfile({ location: DEFAULT_LOCATION });
    setIsBusy(false);
    setStep("notification");
  };

  const requestNotification = async () => {
    setIsBusy(true);
    let granted = false;
    if (typeof Notification !== "undefined") {
      granted = (await Notification.requestPermission()) === "granted";
    }
    setIsNotificationAllowed(granted);
    await saveProfile({ notification_permission: granted });
    setIsBusy(false);
    setStep("plant");
  };

  const skipNotification = async () => {
    setIsBusy(true);
    await saveProfile({ notification_permission: false });
    setIsBusy(false);
    setStep("plant");
  };

  return (
    <div className="flex flex-1 flex-col bg-ink text-paper">
      <main className="flex flex-1 flex-col px-6 pt-14 pb-8">
        <div className="mb-8 flex gap-1.5">
          {(["location", "notification", "plant"] as const).map((value) => (
            <span
              key={value}
              className={`h-1 flex-1 rounded-full ${
                step === value ? "bg-accent" : "bg-paper/15"
              }`}
            />
          ))}
        </div>

        {step === "location" && (
          <>
            <h1 className="text-3xl leading-snug font-extrabold">
              어디에서 식물을
              <br />
              키우고 있나요?
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-paper/60">
              동네 날씨를 알아야 물주기를 정확히 계산할 수 있어요.
              <br />
              폭염·한파·장마에 맞춰 일정을 자동으로 조정합니다.
            </p>
            <div className="mt-auto flex flex-col gap-3">
              <button
                type="button"
                onClick={requestLocation}
                disabled={isBusy}
                className="rounded-full bg-accent py-4 text-base font-bold text-ink disabled:opacity-50"
              >
                {isBusy ? "확인 중…" : "위치 사용 허용"}
              </button>
              <button
                type="button"
                onClick={skipLocation}
                disabled={isBusy}
                className="py-2 text-sm font-medium text-paper/50"
              >
                나중에 할게요 (서울 기준으로 시작)
              </button>
            </div>
          </>
        )}

        {step === "notification" && (
          <>
            <h1 className="text-3xl leading-snug font-extrabold">
              물 줄 때가 되면
              <br />
              알려드릴까요?
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-paper/60">
              {location === DEFAULT_LOCATION
                ? "서울 기준으로 시작할게요. 나중에 마이페이지에서 바꿀 수 있어요."
                : "위치를 확인했어요. 이제 알림만 켜면 준비 끝이에요."}
            </p>
            <div className="mt-auto flex flex-col gap-3">
              <button
                type="button"
                onClick={requestNotification}
                disabled={isBusy}
                className="rounded-full bg-accent py-4 text-base font-bold text-ink disabled:opacity-50"
              >
                {isBusy ? "확인 중…" : "알림 받기"}
              </button>
              <button
                type="button"
                onClick={skipNotification}
                disabled={isBusy}
                className="py-2 text-sm font-medium text-paper/50"
              >
                알림 없이 쓸게요
              </button>
            </div>
          </>
        )}

        {step === "plant" && (
          <>
            <h1 className="text-3xl leading-snug font-extrabold">
              첫 식물을
              <br />
              등록해 볼까요?
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-paper/60">
              {isNotificationAllowed
                ? "알림까지 준비됐어요."
                : "알림은 꺼둘게요. 앱에서 배지로 알려드립니다."}
              <br />
              식물을 등록하면 물주기 일정이 바로 만들어져요.
            </p>
            <div className="mt-auto flex flex-col gap-3">
              <button
                type="button"
                onClick={() => router.replace("/sc08")}
                className="rounded-full bg-accent py-4 text-base font-bold text-ink"
              >
                식물 등록하기
              </button>
              <button
                type="button"
                onClick={() => router.replace("/sc04")}
                className="py-2 text-sm font-medium text-paper/50"
              >
                건너뛰기
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
