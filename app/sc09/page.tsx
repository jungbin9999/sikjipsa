import TabBar from "@/components/TabBar";

// TODO: 구현 착수 순서 10번에서 SC-09 제품 추천 리스트로 대체
export default function ProductListScreen() {
  return (
    <>
      <main className="flex flex-1 flex-col items-center justify-center gap-2 px-5 text-center">
        <h1 className="text-xl font-extrabold">SC-09 제품</h1>
        <p className="text-xs text-ink/40">구현 착수 순서 10번에서 만듭니다.</p>
      </main>
      <TabBar />
    </>
  );
}
