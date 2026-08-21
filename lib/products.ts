import productsData from "@/data/products.json";
import type { Product } from "@/types";

/** 제품 카탈로그 16개 — 제휴사 API 연동 없이 코드 내 목업(MVP 구현 범위) */
export const PRODUCTS = productsData as Product[];

export const PRODUCT_CATEGORIES = Array.from(
  new Set(PRODUCTS.map((product) => product.category)),
);

export function findProduct(productId: string): Product | undefined {
  return PRODUCTS.find((product) => product.product_id === productId);
}

/** 분갈이 시기가 다가온 사용자에게 먼저 보여줄 카테고리 */
export const REPOTTING_CATEGORIES = ["화분", "흙"];

export function repottingRecommendations(): Product[] {
  return PRODUCTS.filter(
    (product) =>
      REPOTTING_CATEGORIES.includes(product.category) && !product.is_sold_out,
  ).slice(0, 4);
}
