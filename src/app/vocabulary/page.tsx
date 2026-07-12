/**
 * 单词本 —— 列表 + 搜索 + 复习统计
 */
"use client";

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
  noun: "#ffd43b",
  verb: "#4dabf7",
  adjective: "#51cf66",
  adverb: "#ff922b",
  phrase: "#ff6b6b",
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

  useEffect(() => { fetchWords(search); }, [search, fetchWords]);

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除？")) return;
    await fetch(`/api/vocabulary/${id}`, { method: "DELETE" });
    fetchWords(search);
  };

  const masteryLabel = (level: number) => {
    if (level >= 80) return { text: "已掌握", color: "#51cf66" };
    if (level >= 50) return { text: "学习中", color: "#ffd43b" };
    if (level > 0) return { text: "薄弱", color: "#ff922b" };
    return { text: "新词", color: "var(--text-muted)" };
  };

  return (
    <div style={{ flex: 1, maxWidth: 720, margin: "0 auto", padding: "0 16px 40px" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px 0 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/" style={{ color: "var(--accent)", textDecoration: "none", fontSize: 14 }}>←</Link>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>单词本</h2>
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{total} 词</span>
        </div>
        <Link href="/vocabulary/new" style={{
          padding: "7px 16px", borderRadius: 8, background: "var(--accent)", color: "#fff",
          textDecoration: "none", fontSize: 13, fontWeight: 600,
        }}>+ 添加</Link>
      </header>

      {/* 搜索 */}
      <input
        type="text" placeholder="搜索单词或释义..." value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border)",
          background: "var(--surface)", color: "var(--text)", fontSize: 14, outline: "none",
          marginBottom: 16, boxSizing: "border-box",
        }}
      />

      {loading ? (
        <p style={{ color: "var(--text-muted)", textAlign: "center", padding: 40 }}>加载中...</p>
      ) : words.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>
          <p style={{ fontSize: 32, margin: "0 0 12px" }}>📖</p>
          <p style={{ margin: 0 }}>单词本还是空的</p>
          <Link href="/vocabulary/new" style={{ color: "var(--accent)", fontSize: 14 }}>添加第一个单词 →</Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {words.map((w) => {
            const ml = masteryLabel(w.masteryLevel);
            const posColor = PART_COLORS[w.partOfSpeech || ""] || "var(--accent)";
            return (
              <div key={w.id} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "12px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)",
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    <Link href={`/vocabulary/${w.id}`} style={{
                      fontSize: 16, fontWeight: 700, color: "var(--text)", textDecoration: "none",
                    }}>
                      {w.word}
                    </Link>
                    {w.partOfSpeech && (
                      <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 8, background: `${posColor}20`, color: posColor }}>
                        {w.partOfSpeech}
                      </span>
                    )}
                    {w.pronunciation && (
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>/{w.pronunciation}/</span>
                    )}
                  </div>
                  <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
                    {w.meaning}
                    {w.example && <span style={{ opacity: 0.5, marginLeft: 6 }}>— {w.example}</span>}
                  </p>
                </div>

                {/* 掌握度 */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: 11, color: ml.color }}>{ml.text}</span>
                  {w.reviewCount > 0 && (
                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>复习{w.reviewCount}次</span>
                  )}
                </div>

                <button onClick={() => handleDelete(w.id)}
                  style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 12, opacity: 0.3, flexShrink: 0 }}>
                  🗑
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
