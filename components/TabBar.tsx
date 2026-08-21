"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** 화면설계서 공통 내비게이션 규칙 — 하단 탭바 5개, 탭 간 이동은 back 스택에 쌓지 않는다 */
const TABS = [
  { href: "/sc03", label: "오늘", icon: "☀" },
  { href: "/sc05", label: "달력", icon: "▤" },
  { href: "/sc06", label: "내 식물", icon: "🌱" },
  { href: "/sc09", label: "제품", icon: "◎" },
  { href: "/sc11", label: "마이", icon: "☺" },
] as const;

export default function TabBar() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 border-t border-ink/5 bg-paper/95 px-2 pt-2 pb-3 backdrop-blur">
      <ul className="flex">
        {TABS.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                replace
                className="flex flex-col items-center gap-1 py-1"
              >
                <span
                  className={`flex size-9 items-center justify-center rounded-full text-base transition ${
                    isActive ? "bg-accent" : ""
                  }`}
                >
                  {tab.icon}
                </span>
                <span
                  className={`text-[11px] font-semibold ${
                    isActive ? "text-ink" : "text-ink/40"
                  }`}
                >
                  {tab.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
