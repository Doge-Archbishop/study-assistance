import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 原生模块 + 大型库不能被打包器处理，标记为外部依赖
  serverExternalPackages: ["@napi-rs/canvas", "pdfjs-dist", "mammoth"],
};

export default nextConfig;
