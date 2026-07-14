/**
 * 错题详情页 —— 查看 AI 解析 + 编辑 + 知识点管理 + 复习历史
 */
"use client";
import { LucideIcon } from "@/components/lucide-icon";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface KnowledgePoint {
  id: string;
  name: string;
  subject: string;
}

interface ReviewLogEntry {
  id: string;
  quality: number;
  timeSpent: number | null;
  createdAt: string;
}

interface WrongQuestionDetail {
  id: string;
  images: string;
  sourceLabel: string | null;
  subject: string | null;
  questionText: string | null;
  answerText: string | null;
  correctAnswer: string | null;
  analysis: string | null;
  errorType: string | null;
  difficulty: number;
  userNote: string | null;
  sm2Repetitions: number;
  sm2EaseFactor: number;
  sm2Interval: number;
  sm2NextReviewDate: string;
  reviewCount: number;
  masteryLevel: number;
  createdAt: string;
  knowledgePoints: { knowledgePoint: KnowledgePoint }[];
  reviewLogs: ReviewLogEntry[];
  linkedNotes: { note: { id: string; title: string } }[];
}

const SUBJECTS = [
  { key: "biology", label: "生物", color: "#81C995" },
  { key: "chemistry", label: "化学", color: "#8AB4F8" },
  { key: "english", label: "英语", color: "#FDD663" },
  { key: "chinese", label: "语文", color: "#F28B82" },
];

const ERROR_TYPES: Record<string, string> = {
  concept_unclear: "概念不清",
  calculation_error: "计算失误",
  careless: "审题粗心",
  memory_forget: "记忆遗忘",
  other: "其他",
};

export default function WrongQuestionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [q, setQ] = useState<WrongQuestionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const [editSubject, setEditSubject] = useState("");
  const [editQuestion, setEditQuestion] = useState("");
  const [editAnswer, setEditAnswer] = useState("");
  const [editAnalysis, setEditAnalysis] = useState("");
  const [editErrorType, setEditErrorType] = useState("");
  const [editDifficulty, setEditDifficulty] = useState(3);
  const [editSourceLabel, setEditSourceLabel] = useState("");
  const [editUserNote, setEditUserNote] = useState("");

  const [linkedKps, setLinkedKps] = useState<KnowledgePoint[]>([]);
  const [kpSearch, setKpSearch] = useState("");
  const [kpResults, setKpResults] = useState<KnowledgePoint[]>([]);


  const load = useCallback(async () => {
    const res = await fetch(`/api/wrong-questions/${id}`);
    if (!res.ok) { setLoading(false); return; }
    const data = await res.json();
    setQ(data);
    setLinkedKps(data.knowledgePoints?.map((k: { knowledgePoint: KnowledgePoint }) => k.knowledgePoint) || []);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const startEdit = () => {
    if (!q) return;
    setEditSubject(q.subject || "");
    setEditQuestion(q.questionText || "");
    setEditAnswer(q.correctAnswer || "");
    setEditAnalysis(q.analysis || "");
    setEditErrorType(q.errorType || "");
    setEditDifficulty(q.difficulty || 3);
    setEditSourceLabel(q.sourceLabel || "");
    setEditUserNote(q.userNote || "");
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!q) return;
    setSaving(true);
    await fetch(`/api/wrong-questions/${q.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: editSubject,
        questionText: editQuestion,
        correctAnswer: editAnswer,
        analysis: editAnalysis,
        errorType: editErrorType,
        difficulty: editDifficulty,
        sourceLabel: editSourceLabel,
        userNote: editUserNote,
        knowledgePointIds: linkedKps.map((k) => k.id),
      }),
    });
    setSaving(false);
    setEditing(false);
    await load();
  };

  const searchKps = async (search: string) => {
    setKpSearch(search);
    if (!search.trim()) { setKpResults([]); return; }
    const res = await fetch(`/api/knowledge-points?search=${encodeURIComponent(search)}&subject=${q?.subject || ""}`);
    const data = await res.json();
    setKpResults(data.filter((k: KnowledgePoint) => !linkedKps.find((l) => l.id === k.id)));
  };

  const addKp = async (kp: KnowledgePoint) => {
    setLinkedKps((p) => [...p, kp]);
    setKpSearch("");
    setKpResults([]);
    if (q) {
      const ids = [...linkedKps.map((k) => k.id), kp.id];
      await fetch(`/api/wrong-questions/${q.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ knowledgePointIds: ids }),
      });
    }
  };

  const removeKp = async (kpId: string) => {
    setLinkedKps((p) => p.filter((k) => k.id !== kpId));
    if (q) {
      const ids = linkedKps.filter((k) => k.id !== kpId).map((k) => k.id);
      await fetch(`/api/wrong-questions/${q.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ knowledgePointIds: ids }),
      });
    }
  };

  const subjectColor = SUBJECTS.find((s) => s.key === q?.subject)?.color || "var(--accent)";
  const images: string[] = q ? JSON.parse(q.images || "[]") : [];

  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--text-secondary)" }}>加载中...</p>
      </div>
    );
  }

  if (!q) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
        <p style={{ color: "var(--text-muted)" }}>错题不存在</p>
        <Link href="/wrong-questions" style={{ color: "var(--accent)" }}>返回列表</Link>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, maxWidth: 680, margin: "0 auto", padding: "0 16px 40px" }}>
      {/* 顶栏 */}
      <div style={s.topBar}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/wrong-questions" style={{ color: "var(--text-secondary)", display: "flex" }}>
            <LucideIcon name="arrow-left" size={20} />
          </Link>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>错题详情</h2>
        </div>
        <button
          onClick={editing ? saveEdit : startEdit}
          disabled={saving}
          className={editing ? "btn btn-primary" : "btn btn-secondary"}
          style={{ fontSize: 13, padding: "7px 16px" }}
        >
          {saving ? (
            "保存中..."
          ) : editing ? (
            <>
              <LucideIcon name="check" size={14} />
              保存
            </>
          ) : (
            <>
              <LucideIcon name="edit-3" size={14} />
              编辑
            </>
          )}
        </button>
      </div>

      {/* 图片 */}
      {images[0] && (
        <div style={s.imageWrap}>
          <img src={images[0]} alt="题目" style={{ width: "100%", display: "block", maxHeight: 400, objectFit: "contain", background: "#000" }} />
        </div>
      )}

      {/* 基本信息 */}
      <div style={s.metaBar}>
        {editing ? (
          <select value={editSubject} onChange={(e) => setEditSubject(e.target.value)} style={selectStyle}>
            <option value="">选学科</option>
            {SUBJECTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        ) : (
          <span className="tag" style={{ background: `${subjectColor}18`, color: subjectColor }}>
            {SUBJECTS.find((s) => s.key === q.subject)?.label || q.subject || "未分类"}
          </span>
        )}

        {editing ? (
          <input value={editSourceLabel} onChange={(e) => setEditSourceLabel(e.target.value)}
            placeholder="来源（如 2024海淀一模）" className="input" style={{ fontSize: 12, padding: "5px 10px", flex: 1 }} />
        ) : q.sourceLabel && (
          <span style={{ fontSize: 12, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
            <LucideIcon name="bookmark" size={13} />
            {q.sourceLabel}
          </span>
        )}

        {editing ? (
          <select value={editErrorType} onChange={(e) => setEditErrorType(e.target.value)} style={selectStyle}>
            <option value="">错误类型</option>
            {Object.entries(ERROR_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        ) : q.errorType && (
          <span className="tag" style={{ background: "rgba(242,139,130,0.12)", color: "#F28B82" }}>
            {ERROR_TYPES[q.errorType] || q.errorType}
          </span>
        )}

        {editing ? (
          <select value={editDifficulty} onChange={(e) => setEditDifficulty(Number(e.target.value))} style={{ ...selectStyle, width: 64 }}>
            {[1, 2, 3, 4, 5].map((d) => (
              <option key={d} value={d}>难度 {d}</option>
            ))}
          </select>
        ) : (
          <span style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 2 }}>
            {Array.from({ length: q.difficulty }).map((_, i) => (
              <LucideIcon key={i} name="star" style={{ width: 12, height: 12, color: "#FFB74D", fill: "#FFB74D" }} />
            ))}
          </span>
        )}

        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
          复习 {q.reviewCount} 次 · 间隔 {q.sm2Interval} 天
        </span>
      </div>

      {/* 题目 */}
      <Section title="题目" icon="file-question" color="var(--text-muted)">
        {editing ? (
          <textarea value={editQuestion} onChange={(e) => setEditQuestion(e.target.value)} rows={3} style={textareaStyle} />
        ) : (
          <p style={s.contentText}>{q.questionText || "（无题目文本）"}</p>
        )}
      </Section>

      {/* 正确答案 */}
      <Section title="正确答案" icon="check-circle" color="var(--green)">
        {editing ? (
          <textarea value={editAnswer} onChange={(e) => setEditAnswer(e.target.value)} rows={2} style={textareaStyle} />
        ) : (
          <p style={{ ...s.contentText, color: "var(--green)" }}>{q.correctAnswer || "未提供"}</p>
        )}
      </Section>

      {/* AI 解析 */}
      <Section title="AI 解析" icon="sparkles" color="var(--accent)">
        {editing ? (
          <textarea value={editAnalysis} onChange={(e) => setEditAnalysis(e.target.value)} rows={4} style={textareaStyle} />
        ) : (
          <div style={s.aiBox}>
            <p style={{ fontSize: 14, lineHeight: 1.8, margin: 0 }}>{q.analysis || "未提供"}</p>
          </div>
        )}
      </Section>

      {/* 用户笔记 */}
      <Section title="你的笔记" icon="sticky-note" color="var(--text-muted)">
        {editing ? (
          <textarea value={editUserNote} onChange={(e) => setEditUserNote(e.target.value)} rows={2} placeholder="记下你踩的坑..." style={textareaStyle} />
        ) : (
          <p style={{ ...s.contentText, fontStyle: q.userNote ? "normal" : "italic", color: q.userNote ? "var(--text)" : "var(--text-muted)" }}>
            {q.userNote || "暂无笔记，点击编辑添加"}
          </p>
        )}
      </Section>

      {/* 知识点关联 */}
      <Section title="关联知识点" icon="git-branch" color="var(--text-muted)">
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {linkedKps.map((kp) => (
            <span key={kp.id} className="tag" style={{ background: `${subjectColor}18`, color: subjectColor, gap: 4, display: "inline-flex", alignItems: "center" }}>
              {kp.name}
              <button onClick={() => removeKp(kp.id)}
                style={{ background: "none", border: "none", color: subjectColor, cursor: "pointer", fontSize: 14, padding: 0, lineHeight: 1, opacity: 0.6 }}>
                <LucideIcon name="x" size={12} />
              </button>
            </span>
          ))}
        </div>
        <div style={{ position: "relative" }}>
          <input
            type="text" placeholder="搜索并添加知识点..." value={kpSearch}
            onChange={(e) => searchKps(e.target.value)}
            className="input" style={{ fontSize: 13, padding: "8px 12px" }}
          />
          {kpResults.length > 0 && (
            <div style={s.dropdown}>
              {kpResults.map((kp) => (
                <button key={kp.id} onClick={() => addKp(kp)} style={s.dropdownItem}>
                  {kp.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </Section>

      {/* 关联笔记 */}
      {q.linkedNotes.length > 0 && (
        <Section title="关联笔记" icon="file-text" color="var(--text-muted)">
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {q.linkedNotes.map((ln) => (
              <Link key={ln.note.id} href={`/notes/${ln.note.id}`}
                style={{ fontSize: 14, color: "var(--accent)", textDecoration: "none", padding: "6px 0", display: "flex", alignItems: "center", gap: 6 }}>
                <LucideIcon name="arrow-right" size={14} />
                {ln.note.title}
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* 复习历史 */}
      {q.reviewLogs.length > 0 && (
        <Section title="复习记录" icon="bar-chart-2" color="var(--text-muted)">
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {q.reviewLogs.slice(0, 10).map((log) => (
              <div key={log.id} style={s.reviewRow}>
                <span style={{ color: "var(--text-muted)", width: 110, fontSize: 12 }}>
                  {new Date(log.createdAt).toLocaleDateString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
                <span style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: log.quality >= 4 ? "#81C995" : log.quality >= 3 ? "#FDD663" : "#F28B82",
                }} />
                <span style={{ color: "var(--text)", fontSize: 13 }}>评分 {log.quality}/5</span>
                {log.timeSpent && <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{log.timeSpent}秒</span>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* 删除 */}
      <button
        onClick={async () => {
          if (!confirm("确定删除这道错题及其复习记录？")) return;
          await fetch(`/api/wrong-questions/${q.id}`, { method: "DELETE" }).catch(() => {});
          router.push("/wrong-questions");
        }}
        style={s.deleteBtn}
      >
        <LucideIcon name="trash-2" size={15} />
        删除错题
      </button>
    </div>
  );
}

/** Section 组件 */
function Section({
  title,
  icon,
  color,
  children,
}: {
  title: string;
  icon: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 22 }}>
      <h3 style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: 1, margin: "0 0 10px", display: "flex", alignItems: "center", gap: 6 }}>
        <LucideIcon name={icon} style={{ width: 14, height: 14, color }} />
        {title}
      </h3>
      {children}
    </div>
  );
}

// ── 样式 ──
const s: Record<string, React.CSSProperties> = {
  topBar: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 0 16px" },
  imageWrap: { borderRadius: 14, overflow: "hidden", marginBottom: 22, border: "1px solid var(--border)" },
  metaBar: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20, alignItems: "center" },
  contentText: { fontSize: 15, lineHeight: 1.8, margin: 0, color: "var(--text)" },
  aiBox: { padding: 16, borderRadius: 12, background: "rgba(138,180,248,0.05)", border: "1px solid rgba(138,180,248,0.12)" },
  dropdown: {
    position: "absolute", top: "100%", left: 0, right: 0, maxHeight: 160, overflowY: "auto",
    background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, zIndex: 10,
    boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
  },
  dropdownItem: {
    display: "block", width: "100%", textAlign: "left", padding: "8px 12px",
    border: "none", background: "none", color: "var(--text)", fontSize: 13, cursor: "pointer",
    borderBottom: "1px solid var(--border)", fontFamily: "var(--font-sans)",
  },
  reviewRow: { display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" },
  deleteBtn: {
    width: "100%", marginTop: 16, padding: "12px", borderRadius: 10,
    border: "1px solid rgba(242,139,130,0.25)", background: "transparent",
    color: "var(--red)", fontSize: 13, cursor: "pointer",
    fontFamily: "var(--font-sans)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
    transition: "all 0.2s",
  },
};

const selectStyle: React.CSSProperties = {
  padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)",
  background: "var(--surface)", color: "var(--text)", fontSize: 12,
  fontFamily: "var(--font-sans)", outline: "none",
};

const textareaStyle: React.CSSProperties = {
  width: "100%", padding: "12px", borderRadius: 10,
  border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)",
  fontSize: 14, lineHeight: 1.7, resize: "vertical",
  boxSizing: "border-box", fontFamily: "var(--font-sans)", outline: "none",
};
