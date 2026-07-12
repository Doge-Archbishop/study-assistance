import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "学习助手",
  description: "高三复习 · 错题整理 · 知识图谱",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0a0f",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"
          integrity="sha384-nB0mivk3N4AJECx7BIcCkNFmR2J2b4FITfswhRdeNjSZTbBY03zJOuqRJy3N/lM"
          crossOrigin="anonymous"
        />
      </head>
      <body className="h-full flex flex-col">{children}</body>
    </html>
  );
}
