"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarIcon,
  MyIcon,
  PlantIcon,
  ProductIcon,
  TodayIcon,
} from "@/components/TabIcons";

/** 화면설계서 공통 내비게이션 규칙 — 하단 탭바 5개, 탭 간 이동은 back 스택에 쌓지 않는다 */
const TABS = [
  { href: "/sc03", label: "오늘", Icon: TodayIcon },
  { href: "/sc05", label: "달력", Icon: CalendarIcon },
  { href: "/sc06", label: "내 식물", Icon: PlantIcon },
  { href: "/sc09", label: "제품", Icon: ProductIcon },
  { href: "/sc11", label: "마이", Icon: MyIcon },
] as const;

/** SC-04(빈 상태)는 오늘 탭의 대체 화면이므로 "오늘"을 활성으로 본다 */
const TAB_ALIAS: Record<string, string> = { "/sc04": "/sc03" };

export default function TabBar() {
  const pathname = usePathname();
  const activeHref = TAB_ALIAS[pathname] ?? pathname;

  return (
    <nav className="sticky bottom-0 border-t border-ink/5 bg-paper/95 px-2 pt-1.5 pb-2 backdrop-blur">
      <ul className="flex">
        {TABS.map(({ href, label, Icon }) => {
          const isActive = activeHref === href;
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                replace
                aria-current={isActive ? "page" : undefined}
                className="flex min-h-11 flex-col items-center justify-center gap-1 py-1.5"
              >
                <span
                  className={`flex size-10 items-center justify-center rounded-full transition ${
                    isActive ? "bg-accent text-ink" : "text-ink/60"
                  }`}
                >
                  <Icon className="size-6" />
                </span>
                <span
                  className={`text-[11px] font-semibold ${
                    isActive ? "text-ink" : "text-ink/60"
                  }`}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
