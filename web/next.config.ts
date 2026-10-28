import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 시안 시연 화면에 개발용 표시가 겹치지 않게 끈다
  devIndicators: false,
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
