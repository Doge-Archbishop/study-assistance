/**
 * AppShell —— 全局布局壳
 * 管理侧边栏状态 + 汉堡按钮 + ErrorBoundary
 */
"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { ErrorBoundary } from "@/components/error-boundary";
import { LucideIcon } from "@/components/lucide-icon";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div style={{ display: "flex", height: "100%" }}>
      <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main style={s.main}>
        {/* 移动端汉堡按钮 */}
        <button
          style={s.hamburger}
          onClick={() => setSidebarOpen(true)}
          aria-label="打开菜单"
        >
          <LucideIcon name="menu" size={22} color="var(--text)" />
        </button>

        <ErrorBoundary>
          <div className="page-enter">{children}</div>
        </ErrorBoundary>
      </main>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  main: {
    flex: 1,
    overflowY: "auto",
    minWidth: 0,
    position: "relative",
  },
  hamburger: {
    display: "none",
    position: "fixed",
    top: 12,
    left: 12,
    zIndex: 40,
    width: 40,
    height: 40,
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(30,30,30,0.7)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    padding: 0,
  },
};
