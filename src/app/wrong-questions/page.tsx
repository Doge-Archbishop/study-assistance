/**
 * 错题列表页 —— 学科筛选 + 点击进入详情
 */
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

const SUBJECTS: Record<string, string> = {
  biology: "生物",
  chemistry: "化学",
  english: "英语",
  chinese: "语文",
};

const SUBJECT_COLORS: Record<string, string> = {
  biology: "#51cf66",
  chemistry: "#4dabf7",
  english: "#ffd43b",
  chinese: "#ff6b6b",
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
    <div style={{ flex: 1, maxWidth: 720, margin: "0 auto", padding: "0 16px 40px" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 12, padding: "24px 0 16px" }}>
        <Link href="/" style={{ color: "var(--accent)", textDecoration: "none", fontSize: 14 }}>←</Link>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, flex: 1 }}>错题库</h2>
        <span style={{ fontSize: 13, color: "var(--text-muted)", marginRight: 8 }}>{questions.length} 题</span>
        <Link href="/wrong-questions/upload" style={{
          padding: "7px 16px", borderRadius: 8, background: "var(--accent)", color: "#fff",
          textDecoration: "none", fontSize: 13, fontWeight: 600,
        }}>+ 上传</Link>
      </header>

      {/* 学科筛选 */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {[
          { key: "", label: "全部" },
          { key: "biology", label: "生物" },
          { key: "chemistry", label: "化学" },
          { key: "english", label: "英语" },
          { key: "chinese", label: "语文" },
        ].map((s) => {
          const active = (subject || "") === s.key;
          const color = SUBJECT_COLORS[s.key] || "var(--text-muted)";
          return (
            <Link
              key={s.key}
              href={s.key ? `/wrong-questions?subject=${s.key}` : "/wrong-questions"}
              style={{
                padding: "5px 14px", borderRadius: 20, fontSize: 13,
                border: active ? `1.5px solid ${color}` : "1px solid var(--border)",
                background: active ? `${color}15` : "transparent",
                color: active ? color : "var(--text-muted)",
                textDecoration: "none", fontWeight: active ? 600 : 400,
              }}
            >
              {s.label}
            </Link>
          );
        })}
      </div>

      {questions.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>
          <p style={{ fontSize: 32, margin: "0 0 12px" }}>📷</p>
          <p style={{ margin: 0 }}>还没有错题，拍照上传第一道吧</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {questions.map((q) => {
            const color = SUBJECT_COLORS[q.subject || ""] || "var(--accent)";
            return (
              <Link
                key={q.id}
                href={`/wrong-questions/${q.id}`}
                style={{
                  display: "block", padding: "14px 16px", borderRadius: 12,
                  background: "var(--surface)", border: "1px solid var(--border)",
                  textDecoration: "none", transition: "border-color 0.15s",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color }}>{SUBJECTS[q.subject || ""] || q.subject}</span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {new Date(q.createdAt).toLocaleDateString("zh-CN")}
                    {q.reviewCount > 0 && ` · 复习${q.reviewCount}次`}
                  </span>
                </div>
                <p style={{ fontSize: 14, lineHeight: 1.5, margin: "0 0 10px", color: "var(--text)" }}>
                  {(q.questionText || "（查看详情）").slice(0, 150)}
                </p>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {q.knowledgePoints.map((kp) => (
                    <span key={kp.knowledgePointId} style={{
                      fontSize: 11, padding: "2px 8px", borderRadius: 12,
                      background: `${color}15`, color,
                    }}>
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
