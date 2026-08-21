"use client";

import { useEffect, useState, type ReactNode } from "react";

/** 앱 기준 뷰포트 — 모든 화면은 이 크기를 기준으로 만든다 */
const FRAME_WIDTH = 430;
const FRAME_HEIGHT = 860;
/** 프레임 바깥 여백 */
const GUTTER = 32;
/** 이 폭 미만은 실제 모바일로 보고 프레임 없이 전체 화면 */
const DESKTOP_MIN_WIDTH = 640;

/**
 * 모바일 세로형 앱을 데스크톱에서 폰 모양 안에 담아 보여준다.
 *
 * 안쪽은 항상 430×860 CSS px로 고정하고 창 크기에 맞춰 통째로 축소한다.
 * 프레임만 줄이고 내용은 그대로 두면, 창이 작아질수록 글자·버튼이 상대적으로
 * 커 보여서 실제 폰 비율과 달라지기 때문.
 *
 * transform이 걸려 있어 이 안의 `position: fixed`는 화면이 아니라 프레임 기준으로
 * 잡힌다 — 하단 탭바처럼 고정 요소를 붙일 때 의도한 대로 동작한다.
 */
export default function PhoneFrame({ children }: { children: ReactNode }) {
  // null = 프레임 없이 전체 화면(모바일 또는 측정 전)
  const [scale, setScale] = useState<number | null>(null);

  useEffect(() => {
    const update = () => {
      const { innerWidth, innerHeight } = window;
      if (innerWidth < DESKTOP_MIN_WIDTH) {
        setScale(null);
        return;
      }
      setScale(
        Math.min(
          1,
          (innerWidth - GUTTER) / FRAME_WIDTH,
          (innerHeight - GUTTER) / FRAME_HEIGHT,
        ),
      );
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  if (scale === null) {
    return <div className="flex min-h-dvh flex-col bg-cloud">{children}</div>;
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-ink/10">
      {/* 축소된 실제 크기만큼 자리를 잡아주는 박스 (transform은 레이아웃 크기를 바꾸지 않음) */}
      <div
        style={{
          width: FRAME_WIDTH * scale,
          height: FRAME_HEIGHT * scale,
        }}
      >
        <div
          className="flex flex-col overflow-x-hidden overflow-y-auto rounded-[2.75rem] bg-cloud shadow-[0_24px_60px_-12px_rgba(8,8,10,0.35)]"
          style={{
            width: FRAME_WIDTH,
            height: FRAME_HEIGHT,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
