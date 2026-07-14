/**
 * 编辑单词页面
 */
"use client";
import { LucideIcon } from "@/components/lucide-icon";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

const PARTS = ["noun", "verb", "adjective", "adverb", "preposition", "conjunction", "phrase", "other"];

export default function EditVocabularyPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [word, setWord] = useState("");
  const [pronunciation, setPronunciation] = useState("");
  const [partOfSpeech, setPartOfSpeech] = useState("");
  const [meaning, setMeaning] = useState("");
  const [example, setExample] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/vocabulary/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then((data) => {
        setWord(data.word || "");
        setPronunciation(data.pronunciation || "");
        setPartOfSpeech(data.partOfSpeech || "");
        setMeaning(data.meaning || "");
        setExample(data.example || "");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);


  const handleSave = async () => {
    if (!word.trim() || !meaning.trim()) return;
    setSaving(true);
    await fetch(`/api/vocabulary/${id}`, {
      method: "PUT",
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

  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--text-secondary)" }}>加载中...</p>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, maxWidth: 560, margin: "0 auto", padding: "24px 16px 40px" }}>
      <header style={s.header}>
        <Link href="/vocabulary" style={{ color: "var(--text-secondary)", display: "flex" }}>
          <LucideIcon name="arrow-left" size={20} />
        </Link>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>编辑单词</h2>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary"
          style={{ fontSize: 13, padding: "7px 18px" }}
        >
          {saving ? "保存中..." : "保存"}
        </button>
      </header>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="text" placeholder="单词" value={word}
            onChange={(e) => setWord(e.target.value)}
            className="input" style={{ flex: 1 }}
          />
          <input
            type="text" placeholder="音标" value={pronunciation}
            onChange={(e) => setPronunciation(e.target.value)}
            className="input" style={{ width: 160 }}
          />
        </div>
        <select value={partOfSpeech} onChange={(e) => setPartOfSpeech(e.target.value)} className="input">
          <option value="">词性</option>
          {PARTS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <textarea
          placeholder="释义" value={meaning} onChange={(e) => setMeaning(e.target.value)}
          rows={3}
          className="input"
          style={{ resize: "vertical", fontFamily: "var(--font-sans)", width: "100%", padding: "10px 14px", fontSize: 14 }}
        />
        <textarea
          placeholder="例句" value={example} onChange={(e) => setExample(e.target.value)}
          rows={2}
          className="input"
          style={{ resize: "vertical", fontFamily: "var(--font-sans)", width: "100%", padding: "10px 14px", fontSize: 14 }}
        />
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 0 16px" },
};
