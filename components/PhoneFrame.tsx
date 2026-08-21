import type { ReactNode } from "react";

/**
 * 모바일 세로형 앱을 데스크톱에서 볼 때 폰 모양 안에 담아 보여준다.
 * - 모바일(sm 미만): 프레임 없이 전체 화면
 * - 데스크톱(sm 이상): 가운데 정렬된 폰 형태
 *
 * 창이 낮거나 브라우저를 확대하면 높이에 맞춰 폭까지 같이 줄어든다(aspect 고정).
 * 높이만 잘리면 비율이 뭉개져 폰처럼 보이지 않기 때문.
 * 화면 콘텐츠는 이 안에서만 스크롤되므로 각 화면은 그대로 flex-1을 쓰면 된다.
 */
export default function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-cloud sm:items-center sm:justify-center sm:bg-ink/10 sm:p-4">
      <div className="flex min-h-dvh w-full flex-col overflow-y-auto bg-cloud sm:aspect-[430/860] sm:h-[calc(100dvh-2rem)] sm:max-h-[860px] sm:min-h-0 sm:w-auto sm:min-w-[300px] sm:max-w-[430px] sm:rounded-[2.75rem] sm:shadow-[0_24px_60px_-12px_rgba(8,8,10,0.35)]">
        {children}
      </div>
    </div>
  );
}
