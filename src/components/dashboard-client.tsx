/**
 * 仪表盘客户端组件
 * Google Material Dark + Lucide Icons + 微交互
 */
"use client";

import Link from "next/link";
import { LucideIcon } from "@/components/lucide-icon";

interface DashboardStats {
  dueQuestions: number;
  dueVocab: number;
  totalPoints: number;
  totalNotes: number;
  subjectStats: { subject: string; count: number }[];
}

const SUBJECTS = [
  { key: "biology", label: "生物", color: "#81C995" },
  { key: "chemistry", label: "化学", color: "#8AB4F8" },
  { key: "english", label: "英语", color: "#FDD663" },
  { key: "chinese", label: "语文", color: "#F28B82" },
] as const;

const QUICK_ACTIONS = [
  { href: "/wrong-questions/upload", icon: "camera", label: "拍照上传错题", hint: "AI 自动解析", color: "var(--red)" },
  { href: "/notes/new", icon: "pen-line", label: "新建笔记", hint: "Markdown 编辑", color: "var(--accent)" },
  { href: "/knowledge-graph", icon: "git-graph", label: "知识图谱", hint: "Canvas 可视化", color: "var(--accent)" },
  { href: "/review", icon: "refresh-cw", label: "开始复习", hint: "SM-2 间隔重复", color: "var(--green)" },
];

export function DashboardClient({ stats }: { stats: DashboardStats }) {
  const subjectCount = (key: string) =>
    stats.subjectStats.find((s) => s.subject === key)?.count ?? 0;

  return (
    <div style={s.wrapper}>
      {/* ── Header ── */}
      <header style={s.header}>
        <div>
          <h1 style={s.title}>仪表盘</h1>
          <span style={s.subtitle}>
            {new Date().toLocaleDateString("zh-CN", {
              year: "numeric", month: "long", day: "numeric", weekday: "long",
            })}
          </span>
        </div>
      </header>

      {/* ── 今日概览 ── */}
      <section style={s.section}>
        <h2 style={s.sectionTitle}>今日概览</h2>
        <div style={s.statGrid}>
          <StatCard icon="x-circle" label="待复习错题" value={stats.dueQuestions} href="/review" color="var(--red)" />
          <StatCard icon="book-open" label="待复习单词" value={stats.dueVocab} href="/vocabulary" color="var(--yellow)" />
          <StatCard icon="git-branch" label="知识点" value={stats.totalPoints} href="/knowledge-graph" color="var(--accent)" />
          <StatCard icon="file-text" label="笔记" value={stats.totalNotes} href="/notes" color="var(--green)" />
        </div>
      </section>

      {/* ── 科目分布 ── */}
      <section style={s.section}>
        <h2 style={s.sectionTitle}>错题分布</h2>
        <div style={s.subjectBar}>
          {SUBJECTS.map(({ key, label, color }) => {
            const count = subjectCount(key);
            return (
              <Link key={key} href={`/wrong-questions?subject=${key}`} className="card" style={s.subjectItem}>
                <span style={{ ...s.subjectDot, background: color }} />
                <span style={s.subjectLabel}>{label}</span>
                <span style={{ ...s.subjectCount, color }}>{count} 题</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── 快捷操作 ── */}
      <section style={s.section}>
        <h2 style={s.sectionTitle}>快捷操作</h2>
        <div style={s.actionGrid}>
          {QUICK_ACTIONS.map((action) => (
            <Link key={action.href} href={action.href} className="card" style={s.actionCard}>
              <span style={{ ...s.actionIcon, background: `${action.color}15` }}>
                <LucideIcon name={action.icon} size={22} color={action.color} />
              </span>
              <span style={s.actionLabel}>{action.label}</span>
              <span style={s.actionHint}>{action.hint}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatCard({ icon, label, value, href, color }: {
  icon: string; label: string; value: number; href: string; color: string;
}) {
  return (
    <Link href={href} className="card" style={{ ...s.statCard, borderColor: value > 0 ? `${color}30` : "var(--border)" }}>
      <LucideIcon name={icon} size={20} color={color} style={{ marginBottom: 8, opacity: value > 0 ? 1 : 0.35 }} />
      <span style={{ ...s.statValue, color: value > 0 ? color : "var(--text-muted)" }}>{value}</span>
      <span style={s.statLabel}>{label}</span>
    </Link>
  );
}

const s: Record<string, React.CSSProperties> = {
  wrapper: { flex: 1, maxWidth: 720, margin: "0 auto", padding: "28px 20px 48px" },
  header: { display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 32 },
  title: { fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: "-0.5px", lineHeight: 1.2 },
  subtitle: { fontSize: 14, color: "var(--text-secondary)", marginTop: 4, display: "block" },
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1.2, margin: "0 0 12px" },
  statGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 },
  statCard: { display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 8px", textDecoration: "none" },
  statValue: { fontSize: 32, fontWeight: 700, lineHeight: 1, transition: "color 0.2s" },
  statLabel: { fontSize: 12, color: "var(--text-muted)", marginTop: 6 },
  subjectBar: { display: "flex", gap: 8 },
  subjectItem: { flex: 1, display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", textDecoration: "none" },
  subjectDot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0, boxShadow: "0 0 6px currentColor" },
  subjectLabel: { fontSize: 14, fontWeight: 500, color: "var(--text)", flex: 1 },
  subjectCount: { fontSize: 13, fontWeight: 600 },
  actionGrid: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 },
  actionCard: { display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 12px", textDecoration: "none", transition: "border-color 0.2s, transform 0.2s" },
  actionIcon: { width: 44, height: 44, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12, transition: "background 0.2s" },
  actionLabel: { fontSize: 14, fontWeight: 600, color: "var(--text)", transition: "color 0.2s" },
  actionHint: { fontSize: 11, color: "var(--text-muted)", marginTop: 4 },
};
