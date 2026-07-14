/**
 * 添加单词 —— 单个添加 + 批量导入
 */
"use client";
import { LucideIcon } from "@/components/lucide-icon";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const PARTS = ["noun", "verb", "adjective", "adverb", "preposition", "conjunction", "phrase", "other"];

export default function NewVocabularyPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"single" | "batch">("single");

  const [word, setWord] = useState("");
  const [pronunciation, setPronunciation] = useState("");
  const [partOfSpeech, setPartOfSpeech] = useState("");
  const [meaning, setMeaning] = useState("");
  const [example, setExample] = useState("");
  const [saving, setSaving] = useState(false);

  const [batchText, setBatchText] = useState("");
  const [batchResult, setBatchResult] = useState<{ created: number; skipped: number } | null>(null);


  const handleSingle = async () => {
    if (!word.trim() || !meaning.trim()) return;
    setSaving(true);
    await fetch("/api/vocabulary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        word: word.trim(),
        pronunciation: pronunciation.trim() || null,
        partOfSpeech: partOfSpeech || null,
        meaning: meaning.trim(),
        example: example.trim() || null,
      }),
    });
    setSaving(false);
    router.push("/vocabulary");
  };

  const handleBatch = async () => {
    if (!batchText.trim()) return;
    setSaving(true);
    const res = await fetch("/api/vocabulary/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raw: batchText }),
    });
    const data = await res.json();
    setBatchResult(data);
    setSaving(false);
  };

  return (
    <div style={{ flex: 1, maxWidth: 560, margin: "0 auto", padding: "24px 16px 40px" }}>
      <header style={s.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/vocabulary" style={{ color: "var(--text-secondary)", display: "flex" }}>
            <LucideIcon name="arrow-left" size={20} />
          </Link>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>添加单词</h2>
        </div>
        <div style={{ display: "flex", gap: 1, borderRadius: 10, overflow: "hidden", border: "1px solid var(--border)" }}>
          <button
            onClick={() => setMode("single")}
            style={{
              padding: "6px 16px", border: "none", fontSize: 12, cursor: "pointer",
              fontFamily: "var(--font-sans)", transition: "all 0.15s",
              background: mode === "single" ? "var(--accent)" : "transparent",
              color: mode === "single" ? "#121212" : "var(--text-secondary)",
              fontWeight: mode === "single" ? 600 : 400,
            }}
          >
            单个
          </button>
          <button
            onClick={() => setMode("batch")}
            style={{
              padding: "6px 16px", border: "none", fontSize: 12, cursor: "pointer",
              fontFamily: "var(--font-sans)", transition: "all 0.15s",
              background: mode === "batch" ? "var(--accent)" : "transparent",
              color: mode === "batch" ? "#121212" : "var(--text-secondary)",
              fontWeight: mode === "batch" ? 600 : 400,
            }}
          >
            批量
          </button>
        </div>
      </header>

      {mode === "single" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text" placeholder="单词 *" value={word}
              onChange={(e) => setWord(e.target.value)}
              className="input" style={{ flex: 1 }}
            />
            <input
              type="text" placeholder="音标 (可选)" value={pronunciation}
              onChange={(e) => setPronunciation(e.target.value)}
              className="input" style={{ width: 160 }}
            />
          </div>
          <select value={partOfSpeech} onChange={(e) => setPartOfSpeech(e.target.value)} className="input">
            <option value="">词性 (可选)</option>
            {PARTS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <textarea
            placeholder="释义 *" value={meaning} onChange={(e) => setMeaning(e.target.value)}
            rows={2} className="input" style={{ resize: "vertical", fontFamily: "var(--font-sans)", width: "100%", padding: "10px 14px", fontSize: 14 }}
          />
          <textarea
            placeholder="例句 (可选)" value={example} onChange={(e) => setExample(e.target.value)}
            rows={2} className="input" style={{ resize: "vertical", fontFamily: "var(--font-sans)", width: "100%", padding: "10px 14px", fontSize: 14 }}
          />
          <button
            onClick={handleSingle}
            disabled={saving || !word.trim() || !meaning.trim()}
            className="btn btn-primary"
            style={{
              width: "100%", padding: "12px 0", fontSize: 15, fontWeight: 600,
              opacity: word.trim() && meaning.trim() ? 1 : 0.4,
            }}
          >
            {saving ? "添加中..." : "添加单词"}
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0, lineHeight: 1.6 }}>
            每行一个单词，格式：
            <code style={{ background: "var(--surface)", padding: "2px 6px", borderRadius: 4 }}>单词 - 释义</code>
            {" "}或{" "}
            <code style={{ background: "var(--surface)", padding: "2px 6px", borderRadius: 4 }}>单词  释义</code>
            （用制表符/逗号/破折号分隔）
          </p>
          <textarea
            placeholder={`abandon - 放弃\nbiology - 生物学\nphotosynthesis - 光合作用\nmitochondria - 线粒体`}
            value={batchText}
            onChange={(e) => setBatchText(e.target.value)}
            rows={12}
            className="input"
            style={{ fontFamily: "var(--font-mono)", fontSize: 14, resize: "vertical", width: "100%", padding: "12px 14px" }}
          />

          {batchResult && (
            <div style={{
              padding: "12px 16px", borderRadius: 12, border: "1px solid var(--green)",
              background: "rgba(129,201,149,0.06)", color: "var(--green)", fontSize: 14,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <LucideIcon name="check-circle" size={16} />
              导入完成：新增 {batchResult.created} 词，跳过 {batchResult.skipped} 词（重复或格式错误）
            </div>
          )}

          <button
            onClick={handleBatch}
            disabled={saving || !batchText.trim()}
            className="btn btn-primary"
            style={{
              width: "100%", padding: "12px 0", fontSize: 15, fontWeight: 600,
              opacity: batchText.trim() ? 1 : 0.4,
            }}
          >
            {saving ? "导入中..." : "批量导入"}
          </button>
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 20,
  },
};
