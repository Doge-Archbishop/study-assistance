/**
 * 侧边栏导航 —— 毛玻璃效果 + 移动端抽屉
 * Desktop: 固定左侧 220px
 * Mobile (< 768px): 抽屉式滑入 + 遮罩
 */
"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { LucideIcon } from "@/components/lucide-icon";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  color: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "仪表盘", icon: "layout-dashboard", color: "var(--accent)" },
  { href: "/notes", label: "笔记", icon: "file-text", color: "var(--green)" },
  { href: "/vocabulary", label: "单词本", icon: "book-open", color: "var(--yellow)" },
  { href: "/wrong-questions", label: "错题库", icon: "x-circle", color: "var(--red)" },
  { href: "/knowledge-graph", label: "知识图谱", icon: "git-graph", color: "var(--accent)" },
  { href: "/review", label: "复习", icon: "refresh-cw", color: "var(--green)" },
];

interface SidebarProps {
  /** 移动端抽屉状态（由 layout 传递） */
  mobileOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // 路由变化时关闭移动端抽屉
  // onClose 用 ref 保存最新引用，避免作为 useEffect 依赖导致父组件每次重渲染都触发关闭
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });
  useEffect(() => {
    if (isMobile) onCloseRef.current();
  }, [pathname, isMobile]);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const sidebarContent = (
    <aside style={isMobile ? s.mobile : s.desktop}>
      {/* Logo */}
      <div style={{ padding: "0 20px 24px" }}>
        <Link href="/" style={s.logoLink} onClick={() => isMobile && onClose()}>
          <span style={s.logoMark}>S</span>
          <span style={s.logoText}>学习助手</span>
        </Link>
      </div>

      {/* 导航 */}
      <nav style={{ flex: 1, padding: "0 12px" }}>
        <span style={s.navLabel}>导航</span>
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                ...s.navItem,
                fontWeight: active ? 600 : 400,
                color: active ? "var(--text)" : "var(--text-secondary)",
                background: active ? "rgba(255, 255, 255, 0.06)" : "transparent",
              }}
            >
              {active && (
                <span
                  style={{
                    position: "absolute",
                    left: 0,
                    top: "25%",
                    height: "50%",
                    width: 3,
                    borderRadius: 2,
                    background: item.color,
                    boxShadow: `0 0 8px ${item.color}40`,
                  }}
                />
              )}
              <LucideIcon name={item.icon} size={18} color={active ? item.color : "var(--text-muted)"} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* 底部状态 */}
      <div style={s.footer}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={s.statusDot} />
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>高三复习</span>
        </div>
      </div>
    </aside>
  );

  // Mobile: 抽屉 + 遮罩
  if (isMobile) {
    return (
      <>
        {/* 遮罩 */}
        {mobileOpen && (
          <div style={s.overlay} onClick={onClose} />
        )}
        {/* 抽屉 */}
        <div
          style={{
            ...s.drawer,
            transform: mobileOpen ? "translateX(0)" : "translateX(-100%)",
          }}
        >
          {sidebarContent}
        </div>
      </>
    );
  }

  // Desktop: 固定侧边栏
  return sidebarContent;
}

const s: Record<string, React.CSSProperties> = {
  desktop: {
    width: 220,
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    background: "rgba(30, 30, 30, 0.55)",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    borderRight: "1px solid rgba(255, 255, 255, 0.06)",
    boxShadow: "2px 0 24px rgba(0, 0, 0, 0.2)",
    zIndex: 50,
    padding: "20px 0",
  },
  mobile: {
    width: 220,
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    background: "rgba(30, 30, 30, 0.9)",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    borderRight: "1px solid rgba(255, 255, 255, 0.06)",
    padding: "20px 0",
    height: "100%",
    overflowY: "auto",
  },
  drawer: {
    position: "fixed",
    top: 0,
    left: 0,
    bottom: 0,
    zIndex: 100,
    transition: "transform 0.3s var(--ease-out)",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 99,
    background: "rgba(0, 0, 0, 0.5)",
    backdropFilter: "blur(2px)",
  },
  logoLink: { textDecoration: "none", display: "flex", alignItems: "center", gap: 10 },
  logoMark: {
    width: 34, height: 34, borderRadius: 10, background: "var(--accent)",
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "#121212", fontWeight: 800, fontSize: 16,
  },
  logoText: { fontSize: 17, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.3px" },
  navLabel: {
    fontSize: 11, fontWeight: 600, color: "var(--text-muted)",
    textTransform: "uppercase", letterSpacing: 1.5, padding: "0 8px 8px", display: "block",
  },
  navItem: {
    display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
    borderRadius: 10, marginBottom: 2, textDecoration: "none", fontSize: 14,
    transition: "all 0.2s var(--ease-out)", position: "relative",
  },
  footer: {
    padding: "16px 20px 0", borderTop: "1px solid rgba(255, 255, 255, 0.05)", margin: "0 12px",
  },
  statusDot: {
    width: 6, height: 6, borderRadius: "50%", background: "var(--green)",
    boxShadow: "0 0 6px rgba(129, 201, 149, 0.5)",
  },
};
