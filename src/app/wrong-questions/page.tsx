import { LucideIcon } from "@/components/lucide-icon";
/**
 * 错题列表页 —— 学科筛选 + 点击进入详情
 */
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

const SUBJECTS_MAP: Record<string, string> = {
  biology: "生物",
  chemistry: "化学",
  english: "英语",
  chinese: "语文",
};

const SUBJECT_COLORS: Record<string, string> = {
  biology: "#81C995",
  chemistry: "#8AB4F8",
  english: "#FDD663",
  chinese: "#F28B82",
};

export default async function WrongQuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string }>;
}) {
  const { subject } = await searchParams;

  const questions = await prisma.wrongQuestion.findMany({
    where: subject ? { subject } : undefined,
    include: {
      knowledgePoints: { include: { knowledgePoint: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div style={st.wrapper}>
      <header style={st.header}>
        <div style={st.headerLeft}>
          <h2 style={st.pageTitle}>错题库</h2>
          <span style={st.count}>{questions.length} 题</span>
        </div>
        <Link href="/wrong-questions/upload" className="btn btn-primary" style={{ padding: "8px 18px" }}>
          <LucideIcon name="plus" size={16} />
          上传
        </Link>
      </header>

      {/* 学科筛选 */}
      <div style={st.filterBar}>
        {[
          { key: "", label: "全部" },
          { key: "biology", label: "生物" },
          { key: "chemistry", label: "化学" },
          { key: "english", label: "英语" },
          { key: "chinese", label: "语文" },
        ].map((sub) => {
          const active = (subject || "") === sub.key;
          const color = SUBJECT_COLORS[sub.key] || "var(--text-muted)";
          return (
            <Link
              key={sub.key}
              href={sub.key ? `/wrong-questions?subject=${sub.key}` : "/wrong-questions"}
              style={{
                ...st.filterBtn,
                borderColor: active ? color : "var(--border)",
                background: active ? `${color}15` : "transparent",
                color: active ? color : "var(--text-secondary)",
                fontWeight: active ? 600 : 400,
              }}
            >
              {sub.label}
            </Link>
          );
        })}
      </div>

      {questions.length === 0 ? (
        <div style={st.empty}>
          <LucideIcon name="camera" size={40} />
          <p style={{ margin: "12px 0 0", color: "var(--text-secondary)" }}>还没有错题，拍照上传第一道吧</p>
        </div>
      ) : (
        <div style={st.list}>
          {questions.map((q) => {
            const color = SUBJECT_COLORS[q.subject || ""] || "var(--accent)";
            return (
              <Link
                key={q.id}
                href={`/wrong-questions/${q.id}`}
                className="card"
                style={st.questionItem}
              >
                <div style={st.questionMeta}>
                  <span style={{ fontSize: 12, fontWeight: 600, color }}>
                    {SUBJECTS_MAP[q.subject || ""] || q.subject}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {new Date(q.createdAt).toLocaleDateString("zh-CN")}
                    {q.reviewCount > 0 && ` · 复习${q.reviewCount}次`}
                  </span>
                </div>
                <p style={st.questionText}>
                  {(q.questionText || "（查看详情）").slice(0, 150)}
                </p>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {q.knowledgePoints.map((kp) => (
                    <span
                      key={kp.knowledgePointId}
                      className="tag"
                      style={{ background: `${color}18`, color }}
                    >
                      {kp.knowledgePoint.name}
                    </span>
                  ))}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

const st: Record<string, React.CSSProperties> = {
  wrapper: { flex: 1, maxWidth: 720, margin: "0 auto", padding: "24px 16px 40px" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  headerLeft: { display: "flex", alignItems: "baseline", gap: 10 },
  pageTitle: { fontSize: 22, fontWeight: 700, margin: 0 },
  count: { fontSize: 13, color: "var(--text-muted)" },
  filterBar: { display: "flex", gap: 6, marginBottom: 18 },
  filterBtn: {
    padding: "6px 14px",
    borderRadius: 20,
    fontSize: 13,
    textDecoration: "none",
    border: "1px solid var(--border)",
    transition: "all 0.15s",
  },
  empty: { textAlign: "center", padding: 60, color: "var(--text-muted)" },
  list: { display: "flex", flexDirection: "column", gap: 8 },
  questionItem: {
    display: "block",
    padding: "16px",
    textDecoration: "none",
  },
  questionMeta: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  questionText: {
    fontSize: 14,
    lineHeight: 1.6,
    margin: "0 0 12px",
    color: "var(--text)",
  },
};
