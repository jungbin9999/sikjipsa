"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import TabBar from "@/components/TabBar";
import { toDateString } from "@/lib/care-calc";
import {
  PRODUCTS,
  PRODUCT_CATEGORIES,
  repottingRecommendations,
} from "@/lib/products";
import { supabase } from "@/lib/supabase";
import type { Product } from "@/types";

/** 분갈이 시기가 이 안으로 들어오면 관련 제품을 먼저 보여준다 */
const REPOTTING_SOON_DAYS = 30;

function formatPrice(price: number) {
  return `${price.toLocaleString("ko-KR")}원`;
}

function ProductCard({
  product,
  onSelect,
}: {
  product: Product;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={product.is_sold_out}
      className="flex w-full flex-col gap-2 text-left disabled:opacity-60"
    >
      <span className="relative block overflow-hidden rounded-card bg-paper">
        <Image
          src={product.thumbnail_url}
          alt=""
          width={200}
          height={140}
          className="h-28 w-full object-cover"
        />
        {product.is_sold_out && (
          <span className="absolute top-2 left-2 rounded-full bg-ink px-2 py-1 text-[10px] font-bold text-paper">
            품절
          </span>
        )}
      </span>
      <span className="block">
        <span className="block truncate text-sm font-bold">{product.name}</span>
        <span className="block text-xs font-semibold text-ink/60">
          {formatPrice(product.price)}
        </span>
      </span>
    </button>
  );
}

export default function ProductListScreen() {
  const router = useRouter();
  const [category, setCategory] = useState<string | null>(null);
  const [hasRepottingSoon, setHasRepottingSoon] = useState(false);

  // 분갈이 시기 도래 여부 — 추천 섹션 노출 트리거
  useEffect(() => {
    const check = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.replace("/sc01");
        return;
      }
      const limit = new Date();
      limit.setDate(limit.getDate() + REPOTTING_SOON_DAYS);

      const { data } = await supabase
        .from("plants")
        .select("plant_id")
        .eq("status", "활성")
        .lte("next_repotting_date", toDateString(limit))
        .limit(1);
      setHasRepottingSoon((data ?? []).length > 0);
    };
    check();
  }, [router]);

  const visibleProducts = useMemo(
    () =>
      category
        ? PRODUCTS.filter((product) => product.category === category)
        : PRODUCTS,
    [category],
  );

  const openDetail = (product: Product) =>
    router.push(`/sc10?product=${product.product_id}`);

  return (
    <>
      <main className="flex flex-1 flex-col gap-4 px-5 pb-4">
        <h1 className="sticky top-0 z-10 -mx-5 bg-cloud px-5 pt-6 pb-3 text-2xl font-extrabold">
          제품
        </h1>

        {/* 분갈이 알림 연동 추천 — 상단 고정 */}
        {hasRepottingSoon && (
          <section className="rounded-card bg-ink p-4 text-paper">
            <p className="text-sm font-extrabold">분갈이 시기가 다가와요</p>
            <p className="mt-1 text-xs text-paper/60">
              화분과 흙을 미리 준비해두면 편해요.
            </p>
            <ul className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {repottingRecommendations().map((product) => (
                <li key={product.product_id} className="w-28 shrink-0">
                  <button
                    type="button"
                    onClick={() => openDetail(product)}
                    className="w-full text-left"
                  >
                    <Image
                      src={product.thumbnail_url}
                      alt=""
                      width={112}
                      height={80}
                      className="h-20 w-full rounded-xl object-cover"
                    />
                    <span className="mt-1.5 block truncate text-[11px] font-semibold">
                      {product.name}
                    </span>
                    <span className="block text-[11px] text-accent">
                      {formatPrice(product.price)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 카테고리 필터 칩 */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[null, ...PRODUCT_CATEGORIES].map((value) => (
            <button
              key={value ?? "전체"}
              type="button"
              onClick={() => setCategory(value)}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition ${
                category === value
                  ? "bg-ink text-paper"
                  : "bg-paper text-ink/60"
              }`}
            >
              {value ?? "전체"}
            </button>
          ))}
        </div>

        <ul className="grid grid-cols-2 gap-x-3 gap-y-5">
          {visibleProducts.map((product) => (
            <li key={product.product_id}>
              <ProductCard
                product={product}
                onSelect={() => openDetail(product)}
              />
            </li>
          ))}
        </ul>
      </main>
      <TabBar />
    </>
  );
}
