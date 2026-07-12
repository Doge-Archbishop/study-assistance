import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  // 今日待复习统计
  const now = new Date();
  const [dueQuestions, dueVocab, totalPoints, totalNotes] = await Promise.all([
    prisma.wrongQuestion.count({
      where: { sm2NextReviewDate: { lte: now } },
    }),
    prisma.vocabulary.count({
      where: { sm2NextReviewDate: { lte: now } },
    }),
    prisma.knowledgePoint.count(),
    prisma.note.count(),
  ]);

  // 按科目统计错题
  const subjectStats = await prisma.wrongQuestion.groupBy({
    by: ["subject"],
    _count: { id: true },
    where: { subject: { not: null } },
  });

  const subjects = [
    { key: "biology", label: "生物", color: "#51cf66" },
    { key: "chemistry", label: "化学", color: "#4dabf7" },
    { key: "english", label: "英语", color: "#ffd43b" },
    { key: "chinese", label: "语文", color: "#ff6b6b" },
  ] as const;

  return (
    <div style={styles.wrapper}>
      {/* ---- Header ---- */}
      <header style={styles.header}>
        <h1 style={styles.title}>学习助手</h1>
        <span style={styles.subtitle}>高三复习 · 以知识点为中枢</span>
      </header>

      {/* ---- 今日概览 ---- */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>今日概览</h2>
        <div style={styles.statGrid}>
          <StatCard
            label="待复习错题"
            value={dueQuestions}
            href="/review"
            color="var(--red)"
          />
          <StatCard
            label="待复习单词"
            value={dueVocab}
            href="/vocabulary"
            color="var(--blue)"
          />
          <StatCard
            label="知识点"
            value={totalPoints}
            href="/knowledge-graph"
            color="var(--accent)"
          />
          <StatCard
            label="笔记"
            value={totalNotes}
            href="/notes"
            color="var(--green)"
          />
        </div>
      </section>

      {/* ---- 科目分布 ---- */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>错题分布</h2>
        <div style={styles.subjectBar}>
          {subjects.map(({ key, label, color }) => {
            const stat = subjectStats.find((s) => s.subject === key);
            const count = stat?._count.id ?? 0;
            return (
              <Link key={key} href={`/wrong-questions?subject=${key}`} style={styles.subjectItem}>
                <span style={{ ...styles.subjectDot, background: color }} />
                <span style={styles.subjectLabel}>{label}</span>
                <span style={styles.subjectCount}>{count} 题</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ---- 快捷操作 ---- */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>快捷操作</h2>
        <div style={styles.actionGrid}>
          <Link href="/wrong-questions/upload" style={styles.actionCard}>
            <span style={styles.actionIcon}>📷</span>
            <span style={styles.actionLabel}>拍照上传错题</span>
            <span style={styles.actionHint}>AI 自动解析</span>
          </Link>
          <Link href="/notes/new" style={styles.actionCard}>
            <span style={styles.actionIcon}>📝</span>
            <span style={styles.actionLabel}>新建笔记</span>
            <span style={styles.actionHint}>Markdown 编辑</span>
          </Link>
          <Link href="/knowledge-graph" style={styles.actionCard}>
            <span style={styles.actionIcon}>🔗</span>
            <span style={styles.actionLabel}>知识图谱</span>
            <span style={styles.actionHint}>Canvas 可视化</span>
          </Link>
          <Link href="/review" style={styles.actionCard}>
            <span style={styles.actionIcon}>🔄</span>
            <span style={styles.actionLabel}>开始复习</span>
            <span style={styles.actionHint}>SM-2 间隔重复</span>
          </Link>
        </div>
      </section>
    </div>
  );
}

/** ---- 子组件 ---- */

function StatCard({
  label,
  value,
  href,
  color,
}: {
  label: string;
  value: number;
  href: string;
  color: string;
}) {
  return (
    <Link href={href} style={{ ...styles.statCard, borderColor: color }}>
      <span style={{ ...styles.statValue, color }}>{value}</span>
      <span style={styles.statLabel}>{label}</span>
    </Link>
  );
}

/** ---- 样式 ---- */

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    flex: 1,
    maxWidth: 720,
    margin: "0 auto",
    padding: "20px 16px 40px",
  },
  header: {
    padding: "32px 0 24px",
    borderBottom: "1px solid var(--border)",
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    margin: 0,
    letterSpacing: "-0.5px",
  },
  subtitle: {
    fontSize: 14,
    color: "var(--text-muted)",
    marginTop: 4,
    display: "block",
  },
  section: { marginBottom: 28 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: "var(--text-muted)",
    textTransform: "uppercase" as const,
    letterSpacing: 1,
    margin: "0 0 12px",
  },
  statGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 10,
  },
  statCard: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    padding: "16px 8px",
    background: "var(--surface)",
    borderRadius: 12,
    border: "1px solid var(--border)",
    textDecoration: "none",
    transition: "transform 0.15s",
  },
  statValue: { fontSize: 32, fontWeight: 700, lineHeight: 1 },
  statLabel: {
    fontSize: 12,
    color: "var(--text-muted)",
    marginTop: 6,
  },
  subjectBar: {
    display: "flex",
    gap: 8,
  },
  subjectItem: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "12px 14px",
    background: "var(--surface)",
    borderRadius: 10,
    border: "1px solid var(--border)",
    textDecoration: "none",
  },
  subjectDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    flexShrink: 0,
  },
  subjectLabel: {
    fontSize: 14,
    fontWeight: 500,
    color: "var(--text)",
    flex: 1,
  },
  subjectCount: {
    fontSize: 13,
    color: "var(--text-muted)",
  },
  actionGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: 10,
  },
  actionCard: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    padding: "20px 12px",
    background: "var(--surface)",
    borderRadius: 12,
    border: "1px solid var(--border)",
    textDecoration: "none",
    transition: "border-color 0.2s",
  },
  actionIcon: { fontSize: 28, marginBottom: 8 },
  actionLabel: { fontSize: 14, fontWeight: 600, color: "var(--text)" },
  actionHint: { fontSize: 11, color: "var(--text-muted)", marginTop: 4 },
};
