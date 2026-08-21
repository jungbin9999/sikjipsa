import TabBar from "@/components/TabBar";

// TODO: 구현 착수 순서 8번에서 SC-05 월간 캘린더 뷰로 대체
export default function CalendarScreen() {
  return (
    <>
      <main className="flex flex-1 flex-col items-center justify-center gap-2 px-5 text-center">
        <h1 className="text-xl font-extrabold">SC-05 달력</h1>
        <p className="text-xs text-ink/40">구현 착수 순서 8번에서 만듭니다.</p>
      </main>
      <TabBar />
    </>
  );
}
