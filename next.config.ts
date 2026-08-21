import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 상위 디렉터리의 lockfile을 루트로 잡지 않도록 고정
  turbopack: { root: path.resolve(".") },
  // next dev가 CLAUDE.md(기획 산출물)에 자체 블록을 덧붙이지 않도록 비활성화
  agentRules: false,
  images: {
    // plants.json · products.json 썸네일 호스트(Wikimedia Commons CDN)
    remotePatterns: [{ protocol: "https", hostname: "upload.wikimedia.org" }],
  },
};

export default nextConfig;
