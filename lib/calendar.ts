import { toDateString } from "@/lib/care-calc";

export type CalendarView = "월간" | "주간";

const DAY_MS = 86400000;

export const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

const startOfWeek = (date: Date) => {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  start.setHours(0, 0, 0, 0);
  return start;
};

/**
 * 화면에 그릴 날짜 배열을 만든다.
 * 월간은 1일이 속한 주의 일요일부터 6주(42칸), 주간은 해당 주 7칸.
 */
export function buildCalendarDays(anchor: Date, view: CalendarView): Date[] {
  const start =
    view === "주간"
      ? startOfWeek(anchor)
      : startOfWeek(new Date(anchor.getFullYear(), anchor.getMonth(), 1));
  const count = view === "주간" ? 7 : 42;

  return Array.from(
    { length: count },
    (_, index) => new Date(start.getTime() + index * DAY_MS),
  );
}

export function shiftAnchor(
  anchor: Date,
  view: CalendarView,
  direction: 1 | -1,
): Date {
  const next = new Date(anchor);
  if (view === "주간") next.setDate(next.getDate() + direction * 7);
  else next.setMonth(next.getMonth() + direction);
  return next;
}

export function formatRangeLabel(anchor: Date, view: CalendarView): string {
  if (view === "월간") {
    return `${anchor.getFullYear()}년 ${anchor.getMonth() + 1}월`;
  }
  const days = buildCalendarDays(anchor, "주간");
  const first = days[0];
  const last = days[6];
  return `${first.getMonth() + 1}월 ${first.getDate()}일 – ${last.getMonth() + 1}월 ${last.getDate()}일`;
}

export const isSameDay = (a: Date, b: Date) =>
  toDateString(a) === toDateString(b);
