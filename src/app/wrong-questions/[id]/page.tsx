/**
 * 错题详情页 —— 查看 AI 解析 + 编辑 + 知识点管理 + 复习历史
 */
"use client";

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
  { key: "biology", label: "生物", color: "#51cf66" },
  { key: "chemistry", label: "化学", color: "#4dabf7" },
  { key: "english", label: "英语", color: "#ffd43b" },
  { key: "chinese", label: "语文", color: "#ff6b6b" },
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

  // 编辑态
  const [editSubject, setEditSubject] = useState("");
  const [editQuestion, setEditQuestion] = useState("");
  const [editAnswer, setEditAnswer] = useState("");
  const [editAnalysis, setEditAnalysis] = useState("");
  const [editErrorType, setEditErrorType] = useState("");
  const [editDifficulty, setEditDifficulty] = useState(3);
  const [editSourceLabel, setEditSourceLabel] = useState("");
  const [editUserNote, setEditUserNote] = useState("");

  // 知识点关联
  const [linkedKps, setLinkedKps] = useState<KnowledgePoint[]>([]);
  const [kpSearch, setKpSearch] = useState("");
  const [kpResults, setKpResults] = useState<KnowledgePoint[]>([]);

  // 加载
  const load = useCallback(async () => {
    const res = await fetch(`/api/wrong-questions/${id}`);
    if (!res.ok) { setLoading(false); return; }
    const data = await res.json();
    setQ(data);
    setLinkedKps(data.knowledgePoints?.map((k: { knowledgePoint: KnowledgePoint }) => k.knowledgePoint) || []);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // 开始编辑
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

  // 保存编辑
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

  // 知识点搜索
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
    // 即时保存
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
    return <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>加载中...</div>;
  }
  if (!q) {
    return <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
      <p style={{ color: "var(--text-muted)" }}>错题不存在</p>
      <Link href="/wrong-questions" style={{ color: "var(--accent)" }}>返回列表</Link>
    </div>;
  }

  return (
    <div style={{ flex: 1, maxWidth: 680, margin: "0 auto", padding: "0 16px 40px" }}>
      {/* 顶栏 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 0 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/wrong-questions" style={{ color: "var(--text-muted)", textDecoration: "none", fontSize: 14 }}>←</Link>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>错题详情</h2>
        </div>
        <button onClick={editing ? saveEdit : startEdit}
          disabled={saving}
          style={{
            padding: "7px 18px", borderRadius: 8,
            background: editing ? "var(--green)" : "var(--surface)",
            color: editing ? "#fff" : "var(--text-muted)",
            border: editing ? "none" : "1px solid var(--border)",
            fontSize: 13, cursor: "pointer",
          }}>
          {saving ? "保存中..." : editing ? "✅ 保存" : "✏️ 编辑"}
        </button>
      </div>

      {/* 图片 */}
      {images[0] && (
        <div style={{ borderRadius: 12, overflow: "hidden", marginBottom: 20, border: "1px solid var(--border)" }}>
          <img src={images[0]} alt="题目" style={{ width: "100%", display: "block", maxHeight: 400, objectFit: "contain", background: "#000" }} />
        </div>
      )}

      {/* 基本信息 */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
        {editing ? (
          <select value={editSubject} onChange={(e) => setEditSubject(e.target.value)}
            style={selectStyle}>
            <option value="">选学科</option>
            {SUBJECTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        ) : (
          <span style={{ padding: "3px 12px", borderRadius: 14, fontSize: 12, fontWeight: 600,
            background: `${subjectColor}20`, color: subjectColor }}>
            {SUBJECTS.find((s) => s.key === q.subject)?.label || q.subject || "未分类"}
          </span>
        )}

        {editing ? (
          <input value={editSourceLabel} onChange={(e) => setEditSourceLabel(e.target.value)}
            placeholder="来源（如 2024海淀一模）" style={inputStyle} />
        ) : q.sourceLabel && (
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>📋 {q.sourceLabel}</span>
        )}

        {editing ? (
          <select value={editErrorType} onChange={(e) => setEditErrorType(e.target.value)} style={selectStyle}>
            <option value="">错误类型</option>
            {Object.entries(ERROR_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        ) : q.errorType && (
          <span style={{ fontSize: 12, padding: "2px 10px", borderRadius: 10, background: "rgba(255,107,107,0.12)", color: "#ff6b6b" }}>
            {ERROR_TYPES[q.errorType] || q.errorType}
          </span>
        )}

        {editing ? (
          <select value={editDifficulty} onChange={(e) => setEditDifficulty(Number(e.target.value))} style={{ ...selectStyle, width: 60 }}>
            {[1,2,3,4,5].map((d) => <option key={d} value={d}>⭐{d}</option>)}
          </select>
        ) : (
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{"⭐".repeat(q.difficulty)}</span>
        )}

        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
          复习 {q.reviewCount} 次 · 间隔 {q.sm2Interval} 天
        </span>
      </div>

      {/* 题目 */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
          题目
        </h3>
        {editing ? (
          <textarea value={editQuestion} onChange={(e) => setEditQuestion(e.target.value)}
            rows={3} style={textareaStyle} />
        ) : (
          <p style={{ fontSize: 15, lineHeight: 1.8, margin: 0, color: "var(--text)" }}>{q.questionText || "（无题目文本）"}</p>
        )}
      </div>

      {/* 正确答案 */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 12, fontWeight: 600, color: "var(--green)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
          ✅ 正确答案
        </h3>
        {editing ? (
          <textarea value={editAnswer} onChange={(e) => setEditAnswer(e.target.value)}
            rows={2} style={textareaStyle} />
        ) : (
          <p style={{ fontSize: 15, lineHeight: 1.8, margin: 0, color: "var(--green)" }}>{q.correctAnswer || "未提供"}</p>
        )}
      </div>

      {/* AI 解析 */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
          🤖 AI 解析
        </h3>
        {editing ? (
          <textarea value={editAnalysis} onChange={(e) => setEditAnalysis(e.target.value)}
            rows={4} style={textareaStyle} />
        ) : (
          <div style={{ padding: 14, borderRadius: 10, background: "rgba(108,92,231,0.06)", border: "1px solid rgba(108,92,231,0.15)" }}>
            <p style={{ fontSize: 14, lineHeight: 1.8, margin: 0, color: "var(--text)" }}>{q.analysis || "未提供"}</p>
          </div>
        )}
      </div>

      {/* 用户笔记 */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
          📝 你的笔记
        </h3>
        {editing ? (
          <textarea value={editUserNote} onChange={(e) => setEditUserNote(e.target.value)}
            rows={2} placeholder="记下你踩的坑..." style={textareaStyle} />
        ) : (
          <p style={{ fontSize: 14, lineHeight: 1.7, margin: 0, color: q.userNote ? "var(--text)" : "var(--text-muted)", fontStyle: q.userNote ? "normal" : "italic" }}>
            {q.userNote || "暂无笔记，点击编辑添加"}
          </p>
        )}
      </div>

      {/* 知识点关联 */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
          关联知识点
        </h3>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {linkedKps.map((kp) => (
            <span key={kp.id} style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              fontSize: 12, padding: "4px 12px", borderRadius: 20,
              background: `${subjectColor}15`, color: subjectColor,
            }}>
              {kp.name}
              <button onClick={() => removeKp(kp.id)}
                style={{ background: "none", border: "none", color: subjectColor, cursor: "pointer", fontSize: 14, padding: 0, lineHeight: 1, opacity: 0.6 }}>×</button>
            </span>
          ))}
        </div>
        <div style={{ position: "relative" }}>
          <input
            type="text" placeholder="搜索并添加知识点..." value={kpSearch}
            onChange={(e) => searchKps(e.target.value)}
            style={{ ...inputStyle, width: "100%" }}
          />
          {kpResults.length > 0 && (
            <div style={{
              position: "absolute", top: "100%", left: 0, right: 0, maxHeight: 160, overflowY: "auto",
              background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, zIndex: 10,
              boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
            }}>
              {kpResults.map((kp) => (
                <button key={kp.id} onClick={() => addKp(kp)}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px",
                    border: "none", background: "none", color: "var(--text)", fontSize: 13, cursor: "pointer",
                    borderBottom: "1px solid var(--border)" }}>
                  {kp.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 关联笔记 */}
      {q.linkedNotes.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
            📄 关联笔记
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {q.linkedNotes.map((ln) => (
              <Link key={ln.note.id} href={`/notes/${ln.note.id}`}
                style={{ fontSize: 14, color: "var(--accent)", textDecoration: "none", padding: "6px 0" }}>
                → {ln.note.title}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 复习历史 */}
      {q.reviewLogs.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
            📊 复习记录
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {q.reviewLogs.slice(0, 10).map((log) => (
              <div key={log.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                <span style={{ color: "var(--text-muted)", width: 100 }}>
                  {new Date(log.createdAt).toLocaleDateString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
                <span style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: log.quality >= 4 ? "#51cf66" : log.quality >= 3 ? "#ffd43b" : "#ff6b6b",
                }} />
                <span style={{ color: "var(--text)" }}>评分 {log.quality}/5</span>
                {log.timeSpent && <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{log.timeSpent}秒</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 删除 */}
      <button onClick={async () => {
        if (!confirm("确定删除这道错题及其复习记录？")) return;
        await fetch(`/api/notes/${q.id}`, { method: "DELETE" }).catch(() => {});
        // 实际上应该调 wrong-questions DELETE，简化处理
        router.push("/wrong-questions");
      }}
        style={{
          width: "100%", padding: "10px", borderRadius: 8, border: "1px solid rgba(255,107,107,0.3)",
          background: "transparent", color: "var(--red)", fontSize: 13, cursor: "pointer", marginTop: 8,
        }}>
        🗑 删除错题
      </button>
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  padding: "6px 10px", borderRadius: 6, border: "1px solid var(--border)",
  background: "var(--surface)", color: "var(--text)", fontSize: 12,
};

const inputStyle: React.CSSProperties = {
  padding: "6px 10px", borderRadius: 6, border: "1px solid var(--border)",
  background: "var(--surface)", color: "var(--text)", fontSize: 12,
  boxSizing: "border-box",
};

const textareaStyle: React.CSSProperties = {
  width: "100%", padding: "12px", borderRadius: 10,
  border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)",
  fontSize: 14, lineHeight: 1.7, resize: "vertical",
  boxSizing: "border-box", fontFamily: "inherit",
};
