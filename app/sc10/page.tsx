"use client";

import { Suspense } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { findProduct } from "@/lib/products";

function ProductDetail() {
  const router = useRouter();
  const productId = useSearchParams().get("product");
  const product = productId ? findProduct(productId) : undefined;

  if (!product) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-5 text-center">
        <p className="text-sm text-ink/60">제품 정보를 찾을 수 없어요.</p>
        <button
          type="button"
          onClick={() => router.replace("/sc09")}
          className="rounded-full bg-ink px-6 py-3 text-sm font-bold text-paper"
        >
          제품 목록으로
        </button>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col px-5 pt-6 pb-4">
      <header className="mb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="뒤로"
          className="-ml-2 flex size-11 items-center justify-center text-2xl leading-none text-ink/60"
        >
          ‹
        </button>
        <h1 className="text-lg font-extrabold">제품 상세</h1>
      </header>

      <div className="relative overflow-hidden rounded-card bg-paper">
        <Image
          src={product.thumbnail_url}
          alt=""
          width={430}
          height={260}
          className="h-52 w-full object-cover"
        />
        {product.is_sold_out && (
          <span className="absolute top-3 left-3 rounded-full bg-ink px-3 py-1.5 text-[11px] font-bold text-paper">
            품절
          </span>
        )}
      </div>

      <section className="mt-4">
        <span className="rounded-full bg-paper px-2.5 py-1 text-[11px] font-bold text-ink/60">
          {product.category}
        </span>
        <h2 className="mt-2 text-xl font-extrabold">{product.name}</h2>
        <p className="mt-1 text-2xl font-extrabold">
          {product.price.toLocaleString("ko-KR")}원
        </p>
        {product.review_summary && (
          <div className="mt-4">
            <h3 className="pl-1 text-xs font-bold text-ink/60">리뷰</h3>
            <p className="mt-1.5 pl-1 text-sm font-semibold">
              {product.review_summary}
            </p>
          </div>
        )}
      </section>

      {/* 제휴 링크 — 외부 브라우저로 이동, 품절이면 비활성화 */}
      {product.is_sold_out ? (
        <button
          type="button"
          disabled
          className="mt-auto rounded-full bg-ink/10 py-4 text-base font-bold text-ink/60"
        >
          품절된 상품이에요
        </button>
      ) : (
        <a
          href={product.affiliate_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto rounded-full bg-accent py-4 text-center text-base font-bold text-ink"
        >
          구매하러 가기
        </a>
      )}
    </main>
  );
}

export default function ProductDetailScreen() {
  return (
    <Suspense
      fallback={
        <main className="flex flex-1 items-center justify-center">
          <p className="text-sm text-ink/60">불러오는 중…</p>
        </main>
      }
    >
      <ProductDetail />
    </Suspense>
  );
}
