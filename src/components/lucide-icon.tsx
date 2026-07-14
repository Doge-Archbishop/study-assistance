/**
 * Lucide 图标组件 —— 动态加载 CDN，零依赖
 */
"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

const CDN_URL = "https://unpkg.com/lucide@latest/dist/umd/lucide.min.js";

// ── 全局：确保脚本只加载一次 ──
let loadPromise: Promise<void> | null = null;

function ensureLucideLoaded(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if ((window as any).lucide) return Promise.resolve();
  if (!loadPromise) {
    loadPromise = new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = CDN_URL;
      script.onload = () => resolve();
      script.onerror = () => {
        // 重试一次
        const retry = document.createElement("script");
        retry.src = CDN_URL;
        retry.onload = () => resolve();
        retry.onerror = () => resolve(); // 放弃
        document.head.appendChild(retry);
      };
      document.head.appendChild(script);
    });
  }
  return loadPromise;
}

interface LucideIconProps {
  name: string;
  size?: number;
  color?: string;
  style?: CSSProperties;
  className?: string;
  strokeWidth?: number;
}

/**
 * LucideIcon —— 使用 Lucide CDN 的 createElement API 渲染 SVG
 * 动态加载脚本，确保可靠渲染
 */
export function LucideIcon({
  name,
  size = 20,
  color = "currentColor",
  style,
  className,
  strokeWidth = 2,
}: LucideIconProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    ensureLucideLoaded().then(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready || !containerRef.current) return;
    const lucide = (window as any).lucide;
    if (!lucide) return;

    // 清空再渲染
    containerRef.current.innerHTML = "";

    try {
      // 将 kebab-case 转为 PascalCase
      const iconName = name
        .split("-")
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join("");

      const icon = lucide.createElement(lucide[iconName] || lucide.X);
      if (icon) {
        icon.setAttribute("width", String(size));
        icon.setAttribute("height", String(size));
        icon.setAttribute("color", color);
        icon.setAttribute("stroke-width", String(strokeWidth));
        if (className) icon.classList.add(className);
        containerRef.current.appendChild(icon);
      }
    } catch {
      // 图标不存在时静默降级
    }
  }, [ready, name, size, color, strokeWidth, className]);

  return (
    <span
      ref={containerRef}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: ready ? undefined : size,
        height: ready ? undefined : size,
        flexShrink: 0,
        ...style,
      }}
      className={className}
    />
  );
}
