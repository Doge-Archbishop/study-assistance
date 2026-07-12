/**
 * 笔记列表页 —— 学科筛选 + 搜索 + 置顶
 */
"use client";

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
  { key: "biology", label: "生物", color: "#51cf66" },
  { key: "chemistry", label: "化学", color: "#4dabf7" },
  { key: "english", label: "英语", color: "#ffd43b" },
  { key: "chinese", label: "语文", color: "#ff6b6b" },
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
    <div style={{ flex: 1, maxWidth: 720, margin: "0 auto", padding: "0 16px 40px" }}>
      {/* 顶栏 */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "24px 0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/" style={{ color: "var(--accent)", textDecoration: "none", fontSize: 14 }}>
            ←
          </Link>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>笔记</h2>
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{total} 篇</span>
        </div>
        <Link
          href="/notes/new"
          style={{
            padding: "8px 18px",
            borderRadius: 8,
            background: "var(--accent)",
            color: "#fff",
            textDecoration: "none",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          + 新建
        </Link>
      </header>

      {/* 学科筛选 */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {SUBJECTS.map((s) => (
          <button
            key={s.key}
            onClick={() => setSubject(s.key)}
            style={{
              padding: "5px 14px",
              borderRadius: 20,
              border: subject === s.key ? "1.5px solid" : "1px solid var(--border)",
              borderColor: subject === s.key ? s.color : "var(--border)",
              background: subject === s.key ? `${s.color}15` : "var(--surface)",
              color: subject === s.key ? s.color : "var(--text-muted)",
              fontSize: 13,
              fontWeight: subject === s.key ? 600 : 400,
              cursor: "pointer",
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* 搜索 */}
      <input
        type="text"
        placeholder="搜索笔记..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: "100%",
          padding: "10px 14px",
          borderRadius: 10,
          border: "1px solid var(--border)",
          background: "var(--surface)",
          color: "var(--text)",
          fontSize: 14,
          marginBottom: 16,
          outline: "none",
          boxSizing: "border-box",
        }}
      />

      {/* 列表 */}
      {loading ? (
        <p style={{ color: "var(--text-muted)", textAlign: "center", padding: 40 }}>加载中...</p>
      ) : notes.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>
          <p style={{ fontSize: 32, margin: "0 0 12px" }}>📝</p>
          <p style={{ margin: 0 }}>还没有笔记，写第一篇吧</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {notes.map((note) => (
            <div
              key={note.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                padding: "14px 16px",
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: note.isPinned ? "var(--surface)" : "transparent",
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
                }}
              />

              {/* 内容 */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <Link
                  href={`/notes/${note.id}`}
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: "var(--text)",
                    textDecoration: "none",
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  {note.isPinned && "📌 "}
                  {note.title || "无标题"}
                </Link>
                {note.aiSummary && (
                  <p
                    style={{
                      margin: "0 0 6px",
                      fontSize: 13,
                      color: "var(--text-muted)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {note.aiSummary}
                  </p>
                )}
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 4 }}>
                  {note.knowledgePoints?.map((kp) => (
                    <span
                      key={kp.knowledgePoint.id}
                      style={{
                        fontSize: 11,
                        padding: "2px 8px",
                        borderRadius: 10,
                        background: `${subjectColor(note.subject)}20`,
                        color: subjectColor(note.subject),
                      }}
                    >
                      {kp.knowledgePoint.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* 操作 */}
              <div style={{ display: "flex", gap: 4, alignItems: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                  {formatDate(note.updatedAt)}
                </span>
                <button
                  onClick={() => handlePin(note)}
                  title={note.isPinned ? "取消置顶" : "置顶"}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 14,
                    padding: 2,
                    opacity: note.isPinned ? 1 : 0.3,
                  }}
                >
                  📌
                </button>
                <button
                  onClick={() => handleDelete(note.id)}
                  title="删除"
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 14,
                    padding: 2,
                    opacity: 0.3,
                    color: "var(--text-muted)",
                  }}
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
