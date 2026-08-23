"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import TabBar from "@/components/TabBar";
import {
  isDefaultLocation,
  locationLabel,
  requestCurrentLocation,
  DEFAULT_LOCATION,
} from "@/lib/location";
import { loadCareReport, type CareReport } from "@/lib/care-report";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types";

export default function MyPageScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");
  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [report, setReport] = useState<CareReport | null>(null);

  const load = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session) {
      router.replace("/sc01");
      return;
    }
    setEmail(session.user.email ?? "");

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", session.user.id)
      .single();
    setProfile(data as Profile);

    const { data: plantRows } = await supabase
      .from("plants")
      .select("plant_id")
      .eq("status", "활성");
    setReport(
      await loadCareReport((plantRows ?? []).map((row) => row.plant_id)),
    );
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const notify = (message: string) => {
    setNotice(message);
    setTimeout(() => setNotice(null), 2000);
  };

  const patchProfile = async (patch: Partial<Profile>) => {
    if (!profile) return;
    setProfile({ ...profile, ...patch });
    await supabase
      .from("profiles")
      .update(patch)
      .eq("user_id", profile.user_id);
  };

  const saveNickname = async () => {
    const value = nicknameDraft.trim();
    setEditingNickname(false);
    await patchProfile({ nickname: value === "" ? null : value });
    notify("프로필을 저장했어요");
  };

  const resetLocation = async (useCurrent: boolean) => {
    setIsBusy(true);
    const value = useCurrent ? await requestCurrentLocation() : DEFAULT_LOCATION;
    await patchProfile({ location: value });
    setIsBusy(false);
    notify(
      value === DEFAULT_LOCATION
        ? "서울 기준으로 설정했어요"
        : "현재 위치로 설정했어요",
    );
  };

  const toggleNotification = async () => {
    if (!profile) return;
    const next = !profile.notification_permission;
    // 실제 푸시 발송은 MVP 범위 밖 — 설정 상태만 저장한다
    if (next && typeof Notification !== "undefined") {
      await Notification.requestPermission();
    }
    await patchProfile({ notification_permission: next });
    notify(next ? "알림을 켰어요" : "알림을 껐어요");
  };

  if (!profile) {
    return (
      <>
        <main className="flex flex-1 items-center justify-center">
          <p className="text-sm text-ink/60">불러오는 중…</p>
        </main>
        <TabBar />
      </>
    );
  }

  const displayName = profile.nickname ?? email.split("@")[0];
  const showLocationBadge = isDefaultLocation(profile.location);
  const showNotificationBadge = !profile.notification_permission;

  return (
    <>
      <main className="flex flex-1 flex-col gap-3 px-5 pb-4">
        <h1 className="sticky top-0 z-10 -mx-5 bg-cloud px-5 pt-6 pb-3 text-2xl font-extrabold">
          마이
        </h1>

        {/* 프로필 — 사진은 MVP에서 기본 아바타 고정 */}
        <section className="flex items-center gap-4 rounded-card bg-ink p-4 text-paper">
          <Image
            src="/images/avatar_default.png"
            alt=""
            width={56}
            height={56}
            className="size-14 rounded-full bg-paper/10 object-cover"
          />
          <div className="min-w-0 flex-1">
            {editingNickname ? (
              <input
                type="text"
                value={nicknameDraft}
                onChange={(e) => setNicknameDraft(e.target.value)}
                onBlur={saveNickname}
                onKeyDown={(e) => e.key === "Enter" && saveNickname()}
                autoFocus
                placeholder="닉네임"
                className="w-full rounded-lg bg-paper/10 px-2 py-1 text-lg font-extrabold text-paper outline-none placeholder:text-paper/50"
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  setNicknameDraft(profile.nickname ?? "");
                  setEditingNickname(true);
                }}
                className="block min-h-11 truncate text-left text-lg font-extrabold"
              >
                {displayName} <span className="text-xs text-paper/60">수정</span>
              </button>
            )}
            <p className="truncate text-xs text-paper/60">{email}</p>
          </div>
        </section>

        {/* 권한 배지 — 둘 다 거부 상태면 나란히 노출(정책정의서 예외 결합 규칙) */}
        {(showLocationBadge || showNotificationBadge) && (
          <div className="flex flex-wrap gap-2">
            {showLocationBadge && (
              <span className="rounded-full bg-lilac px-3 py-1.5 text-[11px] font-bold text-ink">
                서울 기준값 사용 중
              </span>
            )}
            {showNotificationBadge && (
              <span className="rounded-full bg-lilac px-3 py-1.5 text-[11px] font-bold text-ink">
                알림 꺼짐
              </span>
            )}
          </div>
        )}

        {/* 케어 리포트 — 저장 엔티티가 아니라 케어 이력을 집계한 계산값 */}
        {report && (
          <section className="rounded-card bg-accent p-4 text-ink">
            <h2 className="text-sm font-bold">이번 주 케어 리포트</h2>
            <div className="mt-3 flex gap-3">
              <div className="flex-1 rounded-2xl bg-paper/50 px-3 py-3">
                <p className="text-[11px] font-semibold text-ink/60">
                  주간 완료율
                </p>
                <p className="mt-1 text-2xl leading-none font-extrabold">
                  {report.weeklyTotal === 0
                    ? "—"
                    : `${report.weeklyCompletionRate}%`}
                </p>
                <p className="mt-1 text-[11px] text-ink/60">
                  {report.weeklyTotal === 0
                    ? "예정된 케어 없음"
                    : `${report.weeklyDone}/${report.weeklyTotal}건 완료`}
                </p>
              </div>
              <div className="flex-1 rounded-2xl bg-paper/50 px-3 py-3">
                <p className="text-[11px] font-semibold text-ink/60">
                  연속 관리
                </p>
                <p className="mt-1 text-2xl leading-none font-extrabold">
                  {report.streakDays}일
                </p>
                <p className="mt-1 text-[11px] text-ink/60">
                  {report.streakDays === 0 ? "오늘부터 시작해요" : "계속 이어가요"}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* 위치(날씨) 설정 */}
        <section className="rounded-card bg-paper p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">위치(날씨) 설정</h2>
            <span className="text-xs font-semibold text-ink/60">
              {locationLabel(profile.location)}
            </span>
          </div>
          <p className="mt-1 text-xs text-ink/60">
            물주기 계산에 쓰는 날씨 기준 지역이에요.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => resetLocation(true)}
              disabled={isBusy}
              className="rounded-full bg-ink py-3 text-sm font-bold text-paper disabled:opacity-50"
            >
              {isBusy ? "확인 중…" : "현재 위치로"}
            </button>
            <button
              type="button"
              onClick={() => resetLocation(false)}
              disabled={isBusy}
              className="rounded-full bg-cloud py-3 text-sm font-bold text-ink/60 disabled:opacity-50"
            >
              서울 기준으로
            </button>
          </div>
        </section>

        {/* 알림 설정 — 실제 발송 없이 on/off 상태만 저장(MVP 구현 범위) */}
        <section className="flex items-center justify-between rounded-card bg-paper p-4">
          <div>
            <h2 className="text-sm font-bold">알림 설정</h2>
            <p className="mt-1 text-xs text-ink/60">
              물 줄 때가 되면 알려드려요.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={profile.notification_permission}
            aria-label="알림 설정"
            onClick={toggleNotification}
            className={`flex h-8 w-14 shrink-0 items-center rounded-full p-1 transition ${
              profile.notification_permission ? "bg-accent" : "bg-ink/15"
            }`}
          >
            <span
              className={`size-6 rounded-full bg-paper shadow-sm transition ${
                profile.notification_permission ? "translate-x-6" : ""
              }`}
            />
          </button>
        </section>

        <button
          type="button"
          onClick={() => router.push("/sc12")}
          className="flex items-center justify-between rounded-card bg-paper p-4 text-left"
        >
          <span className="text-sm font-bold">계정 관리</span>
          <span className="text-ink/30">›</span>
        </button>

        {notice && (
          <p className="pointer-events-none absolute inset-x-5 bottom-28 rounded-full bg-ink px-4 py-3 text-center text-xs font-semibold text-paper">
            {notice}
          </p>
        )}
      </main>
      <TabBar />
    </>
  );
}
