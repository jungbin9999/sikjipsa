import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 상위 디렉터리의 lockfile을 루트로 잡지 않도록 고정
  turbopack: { root: path.resolve(".") },
};

export default nextConfig;
