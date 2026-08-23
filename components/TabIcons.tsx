/**
 * 하단 탭바 아이콘 — 로고 톤(둥근 형태)에 맞춘 선 아이콘.
 * 이모지와 텍스트 기호를 섞어 쓰던 것을 한 종류로 통일한다.
 */
type IconProps = { className?: string };

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** 오늘 — 해 */
export function TodayIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6" />
    </svg>
  );
}

/** 달력 */
export function CalendarIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <rect x="3.2" y="5" width="17.6" height="16" rx="3.5" />
      <path d="M3.2 10h17.6M8.4 3v4M15.6 3v4" />
    </svg>
  );
}

/** 내 식물 — 새싹 */
export function PlantIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M12 21v-8.4" />
      <path d="M12 12.6C12 9.2 9.4 6.6 6 6.6c0 3.4 2.6 6 6 6Z" />
      <path d="M12 12.6c0-3.4 2.6-6 6-6 0 3.4-2.6 6-6 6Z" />
    </svg>
  );
}

/** 제품 — 쇼핑백 */
export function ProductIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M4.6 8h14.8l-1.1 11.2a2.4 2.4 0 0 1-2.4 2.1H8.1a2.4 2.4 0 0 1-2.4-2.1Z" />
      <path d="M8.8 8V6.4a3.2 3.2 0 0 1 6.4 0V8" />
    </svg>
  );
}

/** 마이 — 사람 */
export function MyIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <circle cx="12" cy="8.2" r="3.8" />
      <path d="M4.8 20.4a7.2 7.2 0 0 1 14.4 0" />
    </svg>
  );
}
