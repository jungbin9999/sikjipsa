import type { ReactNode } from "react";

/**
 * 모바일 세로형(390~430px) 앱을 데스크톱에서 볼 때 폰 모양 안에 담아 보여준다.
 * - 모바일(sm 미만): 프레임 없이 전체 화면
 * - 데스크톱(sm 이상): 가운데 430px 폰 형태, 바깥은 backdrop
 * 화면 콘텐츠는 이 안에서만 스크롤되므로 각 화면은 그대로 flex-1을 쓰면 된다.
 */
export default function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-cloud sm:items-center sm:justify-center sm:bg-ink/10 sm:p-8">
      <div className="flex min-h-dvh w-full flex-col overflow-y-auto bg-cloud sm:h-[860px] sm:max-h-[calc(100dvh-4rem)] sm:min-h-0 sm:w-[430px] sm:rounded-[2.75rem] sm:shadow-[0_24px_60px_-12px_rgba(8,8,10,0.35)]">
        {children}
      </div>
    </div>
  );
}
