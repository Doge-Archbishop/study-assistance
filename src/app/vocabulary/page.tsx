/**
 * 单词本 —— 列表 + 搜索 + 复习统计
 */
"use client";
import { LucideIcon } from "@/components/lucide-icon";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface VocabItem {
  id: string;
  word: string;
  pronunciation: string | null;
  partOfSpeech: string | null;
  meaning: string;
  example: string | null;
  masteryLevel: number;
  reviewCount: number;
  sm2Interval: number;
  sm2NextReviewDate: string;
  createdAt: string;
}

const PART_COLORS: Record<string, string> = {
  noun: "#FDD663",
  verb: "#8AB4F8",
  adjective: "#81C995",
  adverb: "#FFB74D",
  phrase: "#F28B82",
};

export default function VocabularyPage() {
  const [words, setWords] = useState<VocabItem[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);


  const fetchWords = useCallback(async (q: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("search", q);
    const res = await fetch(`/api/vocabulary?${params}`);
    const data = await res.json();
    setWords(data.words || []);
    setTotal(data.total || 0);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchWords(search);
  }, [search, fetchWords]);

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除？")) return;
    await fetch(`/api/vocabulary/${id}`, { method: "DELETE" });
    fetchWords(search);
  };

  const masteryLabel = (level: number) => {
    if (level >= 80) return { text: "已掌握", color: "#81C995" };
    if (level >= 50) return { text: "学习中", color: "#FDD663" };
    if (level > 0) return { text: "薄弱", color: "#FFB74D" };
    return { text: "新词", color: "var(--text-muted)" };
  };

  return (
    <div style={s.wrapper}>
      <header style={s.header}>
        <div style={s.headerLeft}>
          <h2 style={s.pageTitle}>单词本</h2>
          <span style={s.count}>{total} 词</span>
        </div>
        <Link href="/vocabulary/new" className="btn btn-primary" style={{ padding: "8px 18px" }}>
          <LucideIcon name="plus" size={16} />
          添加
        </Link>
      </header>

      {/* 搜索 */}
      <input
        type="text"
        placeholder="搜索单词或释义..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="input"
        style={{ marginBottom: 16 }}
      />

      {loading ? (
        <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: 40 }}>
          加载中...
        </p>
      ) : words.length === 0 ? (
        <div style={s.empty}>
          <LucideIcon name="book-open" size={40} color="var(--text-muted)" style={{ opacity: 0.4 }} />
          <p style={{ margin: "12px 0 0", color: "var(--text-secondary)" }}>单词本还是空的</p>
          <Link href="/vocabulary/new" style={{ color: "var(--accent)", fontSize: 14, marginTop: 8 }}>
            添加第一个单词 →
          </Link>
        </div>
      ) : (
        <div style={s.list}>
          {words.map((w) => {
            const ml = masteryLabel(w.masteryLevel);
            const posColor = PART_COLORS[w.partOfSpeech || ""] || "var(--accent)";
            return (
              <div key={w.id} className="card" style={s.wordItem}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={s.wordHeader}>
                    <Link href={`/vocabulary/${w.id}`} style={s.wordText}>
                      {w.word}
                    </Link>
                    {w.partOfSpeech && (
                      <span
                        className="tag"
                        style={{ background: `${posColor}18`, color: posColor }}
                      >
                        {w.partOfSpeech}
                      </span>
                    )}
                    {w.pronunciation && (
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        /{w.pronunciation}/
                      </span>
                    )}
                  </div>
                  <p style={s.wordMeaning}>
                    {w.meaning}
                    {w.example && (
                      <span style={{ opacity: 0.45, marginLeft: 8 }}>
                        — {w.example}
                      </span>
                    )}
                  </p>
                </div>

                {/* 掌握度 */}
                <div style={s.mastery}>
                  <span style={{ fontSize: 11, fontWeight: 500, color: ml.color }}>
                    {ml.text}
                  </span>
                  {w.reviewCount > 0 && (
                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                      复习{w.reviewCount}次
                    </span>
                  )}
                </div>

                <button
                  onClick={() => handleDelete(w.id)}
                  style={s.delBtn}
                  title="删除"
                >
                  <LucideIcon name="trash-2" size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  wrapper: { flex: 1, maxWidth: 720, margin: "0 auto", padding: "24px 16px 40px" },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  headerLeft: { display: "flex", alignItems: "baseline", gap: 10 },
  pageTitle: { fontSize: 22, fontWeight: 700, margin: 0 },
  count: { fontSize: 13, color: "var(--text-muted)" },
  empty: { textAlign: "center", padding: 60, color: "var(--text-muted)" },
  list: { display: "flex", flexDirection: "column", gap: 6 },
  wordItem: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "14px 16px",
  },
  wordHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  wordText: {
    fontSize: 16,
    fontWeight: 700,
    color: "var(--text)",
    textDecoration: "none",
  },
  wordMeaning: {
    fontSize: 13,
    color: "var(--text-secondary)",
    margin: 0,
  },
  mastery: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    flexShrink: 0,
    gap: 1,
  },
  delBtn: {
    background: "none",
    border: "none",
    color: "var(--text-muted)",
    cursor: "pointer",
    opacity: 0.2,
    flexShrink: 0,
    padding: 4,
    transition: "opacity 0.15s",
  },
};
