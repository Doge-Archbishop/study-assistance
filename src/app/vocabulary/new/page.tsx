/**
 * 添加单词 —— 单个添加 + 批量导入
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const PARTS = ["noun", "verb", "adjective", "adverb", "preposition", "conjunction", "phrase", "other"];

export default function NewVocabularyPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"single" | "batch">("single");

  // 单个
  const [word, setWord] = useState("");
  const [pronunciation, setPronunciation] = useState("");
  const [partOfSpeech, setPartOfSpeech] = useState("");
  const [meaning, setMeaning] = useState("");
  const [example, setExample] = useState("");
  const [saving, setSaving] = useState(false);

  // 批量
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
    <div style={{ flex: 1, maxWidth: 560, margin: "0 auto", padding: "0 16px 40px" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 12, padding: "20px 0 16px" }}>
        <Link href="/vocabulary" style={{ color: "var(--text-muted)", textDecoration: "none", fontSize: 14 }}>←</Link>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>添加单词</h2>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 2, borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)" }}>
          <button onClick={() => setMode("single")} style={{
            padding: "5px 14px", border: "none", fontSize: 12, cursor: "pointer",
            background: mode === "single" ? "var(--accent)" : "transparent",
            color: mode === "single" ? "#fff" : "var(--text-muted)",
          }}>单个</button>
          <button onClick={() => setMode("batch")} style={{
            padding: "5px 14px", border: "none", fontSize: 12, cursor: "pointer",
            background: mode === "batch" ? "var(--accent)" : "transparent",
            color: mode === "batch" ? "#fff" : "var(--text-muted)",
          }}>批量</button>
        </div>
      </header>

      {mode === "single" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input type="text" placeholder="单词 *" value={word} onChange={(e) => setWord(e.target.value)}
              style={{ ...inputStyle, flex: 1 }} />
            <input type="text" placeholder="音标 (可选)" value={pronunciation} onChange={(e) => setPronunciation(e.target.value)}
              style={{ ...inputStyle, width: 160 }} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <select value={partOfSpeech} onChange={(e) => setPartOfSpeech(e.target.value)} style={inputStyle}>
              <option value="">词性 (可选)</option>
              {PARTS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <textarea placeholder="释义 *" value={meaning} onChange={(e) => setMeaning(e.target.value)}
            rows={2} style={textareaStyle} />
          <textarea placeholder="例句 (可选)" value={example} onChange={(e) => setExample(e.target.value)}
            rows={2} style={textareaStyle} />
          <button onClick={handleSingle} disabled={saving || !word.trim() || !meaning.trim()}
            style={{
              padding: "12px", borderRadius: 10, border: "none", background: "var(--accent)", color: "#fff",
              fontSize: 15, fontWeight: 600, cursor: "pointer", opacity: word.trim() && meaning.trim() ? 1 : 0.4,
            }}>
            {saving ? "添加中..." : "添加单词"}
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0, lineHeight: 1.6 }}>
            每行一个单词，格式：
            <code style={{ background: "var(--surface)", padding: "2px 6px", borderRadius: 4 }}>单词 - 释义</code>
            或
            <code style={{ background: "var(--surface)", padding: "2px 6px", borderRadius: 4 }}>单词  释义</code>
            （用制表符/逗号/破折号分隔）
          </p>
          <textarea
            placeholder={`abandon - 放弃\nbiology - 生物学\nphotosynthesis - 光合作用\nmitochondria - 线粒体`}
            value={batchText}
            onChange={(e) => setBatchText(e.target.value)}
            rows={12}
            style={{ ...textareaStyle, fontFamily: "monospace", fontSize: 14 }}
          />

          {batchResult && (
            <div style={{
              padding: "12px 16px", borderRadius: 10, border: "1px solid var(--green)",
              background: "rgba(81,207,102,0.08)", color: "var(--green)", fontSize: 14,
            }}>
              导入完成：新增 {batchResult.created} 词，跳过 {batchResult.skipped} 词（重复或格式错误）
            </div>
          )}

          <button onClick={handleBatch} disabled={saving || !batchText.trim()}
            style={{
              padding: "12px", borderRadius: 10, border: "none", background: "var(--accent)", color: "#fff",
              fontSize: 15, fontWeight: 600, cursor: "pointer", opacity: batchText.trim() ? 1 : 0.4,
            }}>
            {saving ? "导入中..." : "批量导入"}
          </button>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border)",
  background: "var(--surface)", color: "var(--text)", fontSize: 14, outline: "none",
  boxSizing: "border-box",
};

const textareaStyle: React.CSSProperties = {
  padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border)",
  background: "var(--surface)", color: "var(--text)", fontSize: 14, outline: "none",
  resize: "vertical", boxSizing: "border-box", fontFamily: "inherit",
  width: "100%",
};
