/**
 * 笔记列表页 —— 学科筛选 + 搜索 + 置顶
 */
"use client";
import { LucideIcon } from "@/components/lucide-icon";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface NoteItem {
  id: string;
  title: string;
  subject: string;
  isPinned: boolean;
  aiSummary: string | null;
  updatedAt: string;
  knowledgePoints: { knowledgePoint: { id: string; name: string } }[];
}

const SUBJECTS = [
  { key: "", label: "全部", color: "var(--text-muted)" },
  { key: "biology", label: "生物", color: "#81C995" },
  { key: "chemistry", label: "化学", color: "#8AB4F8" },
  { key: "english", label: "英语", color: "#FDD663" },
  { key: "chinese", label: "语文", color: "#F28B82" },
];

export default function NotesPage() {
  const router = useRouter();
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [total, setTotal] = useState(0);
  const [subject, setSubject] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);


  const fetchNotes = useCallback(async (s: string, q: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (s) params.set("subject", s);
    if (q) params.set("search", q);
    const res = await fetch(`/api/notes?${params}`);
    const data = await res.json();
    setNotes(data.notes);
    setTotal(data.total);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchNotes(subject, search);
  }, [subject, search, fetchNotes]);

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除这条笔记？")) return;
    await fetch(`/api/notes/${id}`, { method: "DELETE" });
    fetchNotes(subject, search);
  };

  const handlePin = async (note: NoteItem) => {
    await fetch(`/api/notes/${note.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPinned: !note.isPinned }),
    });
    fetchNotes(subject, search);
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("zh-CN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const subjectColor = (s: string) =>
    SUBJECTS.find((x) => x.key === s)?.color || "var(--text-muted)";

  return (
    <div style={st.wrapper}>
      {/* 顶栏 */}
      <header style={st.header}>
        <div style={st.headerLeft}>
          <h2 style={st.pageTitle}>笔记</h2>
          <span style={st.count}>{total} 篇</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <Link href="/notes/upload" className="btn btn-secondary" style={{ padding: "8px 14px" }}>
            <LucideIcon name="upload" size={15} />
            上传分析
          </Link>
          <Link href="/notes/new" className="btn btn-primary" style={{ padding: "8px 18px" }}>
            <LucideIcon name="plus" size={16} />
            新建
          </Link>
        </div>
      </header>

      {/* 学科筛选 */}
      <div style={st.filterBar}>
        {SUBJECTS.map((sub) => (
          <button
            key={sub.key}
            onClick={() => setSubject(sub.key)}
            style={{
              ...st.filterBtn,
              borderColor: subject === sub.key ? sub.color : "var(--border)",
              background: subject === sub.key ? `${sub.color}15` : "transparent",
              color: subject === sub.key ? sub.color : "var(--text-secondary)",
              fontWeight: subject === sub.key ? 600 : 400,
            }}
          >
            {sub.label}
          </button>
        ))}
      </div>

      {/* 搜索 */}
      <input
        type="text"
        placeholder="搜索笔记..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="input"
        style={{ marginBottom: 16 }}
      />

      {/* 列表 */}
      {loading ? (
        <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: 40 }}>加载中...</p>
      ) : notes.length === 0 ? (
        <div style={st.empty}>
          <LucideIcon name="file-text" size={40} />
          <p style={{ margin: "12px 0 0", color: "var(--text-secondary)" }}>还没有笔记，写第一篇吧</p>
        </div>
      ) : (
        <div style={st.list}>
          {notes.map((note) => (
            <div
              key={note.id}
              className="card"
              style={{
                ...st.noteItem,
                borderColor: note.isPinned ? "var(--accent)" : "var(--border)",
              }}
            >
              {/* 学科色条 */}
              <div
                style={{
                  width: 4,
                  height: 40,
                  borderRadius: 2,
                  background: subjectColor(note.subject),
                  flexShrink: 0,
                  marginTop: 2,
                  boxShadow: `0 0 6px ${subjectColor(note.subject)}40`,
                }}
              />

              {/* 内容 */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <Link href={`/notes/${note.id}`} style={st.noteTitle}>
                  {note.title || "无标题"}
                </Link>
                {note.aiSummary && (
                  <p style={st.noteSummary}>{note.aiSummary}</p>
                )}
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 4 }}>
                  {note.knowledgePoints?.map((kp) => (
                    <span
                      key={kp.knowledgePoint.id}
                      className="tag"
                      style={{
                        background: `${subjectColor(note.subject)}18`,
                        color: subjectColor(note.subject),
                      }}
                    >
                      {kp.knowledgePoint.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* 操作 */}
              <div style={st.noteActions}>
                <span style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                  {formatDate(note.updatedAt)}
                </span>
                <button
                  onClick={() => handlePin(note)}
                  title={note.isPinned ? "取消置顶" : "置顶"}
                  style={{
                    ...st.iconBtn,
                    opacity: note.isPinned ? 1 : 0.25,
                    color: note.isPinned ? "var(--accent)" : "var(--text-muted)",
                  }}
                >
                  <LucideIcon name="pin" size={14} />
                </button>
                <button
                  onClick={() => handleDelete(note.id)}
                  title="删除"
                  style={{ ...st.iconBtn, opacity: 0.25 }}
                >
                  <LucideIcon name="trash-2" size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const st: Record<string, React.CSSProperties> = {
  wrapper: { flex: 1, maxWidth: 720, margin: "0 auto", padding: "24px 16px 40px" },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 20,
  },
  headerLeft: { display: "flex", alignItems: "baseline", gap: 10 },
  pageTitle: { fontSize: 22, fontWeight: 700, margin: 0 },
  count: { fontSize: 13, color: "var(--text-muted)" },
  filterBar: { display: "flex", gap: 6, marginBottom: 14 },
  filterBtn: {
    padding: "6px 14px",
    borderRadius: 20,
    border: "1px solid var(--border)",
    background: "transparent",
    fontSize: 13,
    cursor: "pointer",
    transition: "all 0.15s",
    fontFamily: "var(--font-sans)",
  },
  empty: { textAlign: "center", padding: 60, color: "var(--text-muted)" },
  list: { display: "flex", flexDirection: "column", gap: 8 },
  noteItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: 14,
    padding: "16px",
  },
  noteTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: "var(--text)",
    textDecoration: "none",
    display: "block",
    marginBottom: 5,
  },
  noteSummary: {
    margin: "0 0 6px",
    fontSize: 13,
    color: "var(--text-secondary)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  noteActions: {
    display: "flex",
    gap: 6,
    alignItems: "center",
    flexShrink: 0,
  },
  iconBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 2,
    color: "var(--text-muted)",
    transition: "opacity 0.15s",
  },
};
