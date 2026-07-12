/**
 * 复习页面 —— 翻牌卡片 + SM-2 评分
 * 支持错题和单词两种模式
 */
"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

// ── 类型 ──
interface ReviewQuestion {
  id: string;
  subject: string;
  questionText: string;
  correctAnswer: string;
  analysis: string;
  images: string[];
  difficulty: number;
  sourceLabel: string;
  userNote: string;
  knowledgePoints: string[];
  sm2: { repetitions: number; easeFactor: number; interval: number; nextReviewDate: string };
  reviewCount: number;
}

interface ReviewVocab {
  id: string;
  word: string;
  pronunciation: string;
  partOfSpeech: string;
  meaning: string;
  example: string;
  sm2: { repetitions: number; easeFactor: number; interval: number; nextReviewDate: string };
}

const SUBJECT_COLORS: Record<string, string> = {
  biology: "#51cf66",
  chemistry: "#4dabf7",
  english: "#ffd43b",
  chinese: "#ff6b6b",
};

const SUBJECT_LABELS: Record<string, string> = {
  biology: "生物",
  chemistry: "化学",
  english: "英语",
  chinese: "语文",
};

const RATINGS = [
  { q: 0, label: "完全忘记", color: "#ff6b6b", desc: "一点印象都没有" },
  { q: 2, label: "有印象", color: "#ff922b", desc: "记得一点但答不对" },
  { q: 3, label: "勉强正确", color: "#ffd43b", desc: "想了好久才答对" },
  { q: 4, label: "比较熟练", color: "#74c0fc", desc: "犹豫了一下答对" },
  { q: 5, label: "非常熟练", color: "#51cf66", desc: "秒答，完全掌握" },
];

export default function ReviewPage() {
  const [questions, setQuestions] = useState<ReviewQuestion[]>([]);
  const [vocabs, setVocabs] = useState<ReviewVocab[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentType, setCurrentType] = useState<"question" | "vocab">("question");
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // 本次复习统计
  const [sessionStats, setSessionStats] = useState({ reviewed: 0, avgQuality: 0, totalQuality: 0 });
  const [sessionDone, setSessionDone] = useState(false);

  // 加载
  useEffect(() => {
    fetch("/api/review?mode=due")
      .then((r) => r.json())
      .then((data) => {
        const qs = data.questions || [];
        const vs = data.vocabularies || [];
        setQuestions(qs);
        setVocabs(vs);
        if (qs.length === 0 && vs.length > 0) setCurrentType("vocab");
        setLoading(false);
      });
  }, []);

  const currentList = currentType === "question" ? questions : vocabs;
  const current = currentType === "question" ? questions[currentIndex] : vocabs[currentIndex];
  const totalItems = questions.length + vocabs.length;

  // 评分 → 提交 → 下一张
  const handleRate = useCallback(async (quality: number) => {
    if (!current || submitting) return;
    setSubmitting(true);

    const itemType = currentType === "question" ? "wrong_question" : "vocabulary";
    await fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemType, itemId: current.id, quality }),
    });

    setSessionStats((s) => ({
      reviewed: s.reviewed + 1,
      totalQuality: s.totalQuality + quality,
      avgQuality: Math.round(((s.totalQuality + quality) / (s.reviewed + 1)) * 10) / 10,
    }));

    setFlipped(false);
    setSubmitting(false);

    // 前进
    if (currentType === "question" && currentIndex + 1 < questions.length) {
      setCurrentIndex(currentIndex + 1);
    } else if (currentType === "question" && vocabs.length > 0) {
      setCurrentType("vocab");
      setCurrentIndex(0);
    } else if (currentType === "vocab" && currentIndex + 1 < vocabs.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setSessionDone(true);
    }
  }, [current, submitting, currentType, currentIndex, questions.length, vocabs.length]);

  // 跳过（不评分，下次还会出现）
  const handleSkip = useCallback(() => {
    setFlipped(false);
    if (currentType === "question" && currentIndex + 1 < questions.length) {
      setCurrentIndex(currentIndex + 1);
    } else if (currentType === "question" && vocabs.length > 0) {
      setCurrentType("vocab");
      setCurrentIndex(0);
    } else if (currentType === "vocab" && currentIndex + 1 < vocabs.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setSessionDone(true);
    }
  }, [currentType, currentIndex, questions.length, vocabs.length]);

  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
        加载中...
      </div>
    );
  }

  // 没有待复习项
  if (currentList.length === 0 && !sessionDone) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 40 }}>
        <p style={{ fontSize: 40, margin: 0 }}>✅</p>
        <h2 style={{ margin: 0, fontSize: 20 }}>暂时没有待复习内容</h2>
        <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>上传错题或添加单词后会自动安排复习</p>
        <Link href="/" style={{ marginTop: 16, color: "var(--accent)", fontSize: 14 }}>返回首页</Link>
      </div>
    );
  }

  // 全部完成
  if (sessionDone) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 40 }}>
        <p style={{ fontSize: 48, margin: 0 }}>🎉</p>
        <h2 style={{ margin: 0, fontSize: 22 }}>今日复习完成！</h2>
        <div style={{ display: "flex", gap: 20, marginTop: 8 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: "var(--accent)" }}>{sessionStats.reviewed}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>复习数</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: "var(--green)" }}>{sessionStats.avgQuality}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>均分 / 5</div>
          </div>
        </div>
        <Link href="/" style={{ marginTop: 20, color: "var(--accent)", fontSize: 14 }}>返回首页</Link>
      </div>
    );
  }

  // 进度信息
  const overallIndex = currentType === "question"
    ? currentIndex + 1
    : questions.length + currentIndex + 1;

  const subjectColor = currentType === "question"
    ? SUBJECT_COLORS[(current as ReviewQuestion).subject] || "var(--accent)"
    : "#ffd43b";

  return (
    <div style={{ flex: 1, maxWidth: 520, margin: "0 auto", padding: "12px 16px 32px", display: "flex", flexDirection: "column" }}>
      {/* ── 顶栏 ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <Link href="/" style={{ color: "var(--text-muted)", textDecoration: "none", fontSize: 14 }}>←</Link>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{
              display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: subjectColor,
            }} />
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
              {currentType === "question"
                ? `${SUBJECT_LABELS[(current as ReviewQuestion).subject]} · 错题`
                : "英语 · 单词"}
            </span>
          </div>
          <div style={{ height: 3, borderRadius: 2, background: "var(--border)", overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 2, background: "var(--accent)",
              width: `${(overallIndex / totalItems) * 100}%`,
              transition: "width 0.3s",
            }} />
          </div>
        </div>
        <span style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
          {overallIndex}/{totalItems}
        </span>
      </div>

      {/* ── 卡片 ── */}
      <div
        onClick={() => !submitting && setFlipped(!flipped)}
        style={{
          flex: 1,
          background: "var(--surface)",
          borderRadius: 16,
          border: `1.5px solid ${flipped ? subjectColor : "var(--border)"}`,
          cursor: submitting ? "default" : "pointer",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          transition: "border-color 0.2s",
          minHeight: 340,
        }}
      >
        {currentType === "question" ? (
          <>
            {/* 题目图片 */}
            {(current as ReviewQuestion).images?.[0] && !(current as ReviewQuestion).images[0].startsWith("data:") && (
              <div style={{ background: "#000", display: "flex", justifyContent: "center", maxHeight: 280, overflow: "hidden" }}>
                <img
                  src={(current as ReviewQuestion).images[0]}
                  alt="题目"
                  style={{ maxWidth: "100%", maxHeight: 280, objectFit: "contain" }}
                />
              </div>
            )}

            <div style={{ padding: "20px 24px", flex: 1, display: "flex", flexDirection: "column", overflow: "auto" }}>
              {!flipped ? (
                <>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
                    题目
                    {(current as ReviewQuestion).sourceLabel && ` · ${(current as ReviewQuestion).sourceLabel}`}
                  </span>
                  <p style={{ fontSize: 15, lineHeight: 1.8, margin: 0, flex: 1, color: "var(--text)" }}>
                    {(current as ReviewQuestion).questionText || "（查看图片）"}
                  </p>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
                    {(current as ReviewQuestion).knowledgePoints?.map((kp: string) => (
                      <span key={kp} style={{
                        fontSize: 11, padding: "2px 10px", borderRadius: 12,
                        background: `${subjectColor}15`, color: subjectColor,
                      }}>
                        {kp}
                      </span>
                    ))}
                  </div>
                  <p style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", margin: "16px 0 0", opacity: 0.4 }}>
                    点击翻转查看答案和解析
                  </p>
                </>
              ) : (
                <>
                  {/* 答案 */}
                  <div style={{ marginBottom: 16 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "var(--green)", textTransform: "uppercase", letterSpacing: 1 }}>
                      ✅ 正确答案
                    </span>
                    <p style={{ fontSize: 15, lineHeight: 1.8, margin: "6px 0 0", color: "var(--green)" }}>
                      {(current as ReviewQuestion).correctAnswer || "未提供"}
                    </p>
                  </div>

                  {/* AI 解析 */}
                  {(current as ReviewQuestion).analysis && (
                    <div style={{
                      padding: 14, borderRadius: 10,
                      background: "rgba(108,92,231,0.08)", border: "1px solid rgba(108,92,231,0.2)",
                      marginBottom: 12,
                    }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--accent)" }}>🤖 AI 解析</span>
                      <p style={{ fontSize: 14, lineHeight: 1.7, margin: "6px 0 0", color: "var(--text)" }}>
                        {(current as ReviewQuestion).analysis}
                      </p>
                    </div>
                  )}

                  {/* 用户笔记 */}
                  {(current as ReviewQuestion).userNote && (
                    <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(255,255,255,0.03)", marginBottom: 12 }}>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>📝 你的笔记</span>
                      <p style={{ fontSize: 13, margin: "4px 0 0", color: "var(--text)", fontStyle: "italic" }}>
                        {(current as ReviewQuestion).userNote}
                      </p>
                    </div>
                  )}

                  {/* SM-2 状态 */}
                  <div style={{ display: "flex", gap: 16, fontSize: 11, color: "var(--text-muted)", marginTop: "auto" }}>
                    <span>复习 {(current as ReviewQuestion).reviewCount} 次</span>
                    <span>间隔 {Math.round((current as ReviewQuestion).sm2.interval)} 天</span>
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          /* ── 单词卡片 ── */
          <div style={{ padding: "28px 24px", flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            {!flipped ? (
              <>
                <span style={{ fontSize: 36, fontWeight: 700, color: "var(--text)", letterSpacing: 1 }}>
                  {(current as ReviewVocab).word}
                </span>
                {(current as ReviewVocab).pronunciation && (
                  <span style={{ fontSize: 15, color: "var(--text-muted)", marginTop: 8 }}>
                    /{(current as ReviewVocab).pronunciation}/
                  </span>
                )}
                {(current as ReviewVocab).partOfSpeech && (
                  <span style={{
                    fontSize: 11, marginTop: 8, padding: "2px 10px", borderRadius: 10,
                    background: "rgba(255,212,59,0.15)", color: "#ffd43b",
                  }}>
                    {(current as ReviewVocab).partOfSpeech}
                  </span>
                )}
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 32, opacity: 0.4 }}>
                  点击翻转查看释义
                </p>
              </>
            ) : (
              <>
                <span style={{ fontSize: 22, fontWeight: 700, color: "var(--accent)" }}>
                  {(current as ReviewVocab).meaning}
                </span>
                {(current as ReviewVocab).example && (
                  <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 16, textAlign: "center", lineHeight: 1.6, fontStyle: "italic" }}>
                    "{(current as ReviewVocab).example}"
                  </p>
                )}
                <div style={{ display: "flex", gap: 12, fontSize: 11, color: "var(--text-muted)", marginTop: 24 }}>
                  <span>间隔 {Math.round((current as ReviewVocab).sm2.interval)} 天</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── 评分按钮 ── */}
      {flipped && (
        <div style={{ padding: "16px 0 0" }}>
          <p style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", margin: "0 0 10px" }}>
            你的回忆程度如何？
          </p>
          <div style={{ display: "flex", gap: 6 }}>
            {RATINGS.map(({ q, label, color, desc }) => (
              <button
                key={q}
                onClick={() => handleRate(q)}
                disabled={submitting}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  padding: "10px 4px",
                  borderRadius: 10,
                  border: `1.5px solid ${color}30`,
                  background: `${color}10`,
                  color: "var(--text)",
                  cursor: submitting ? "default" : "pointer",
                  opacity: submitting ? 0.5 : 1,
                  transition: "all 0.15s",
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color }}>{label}</span>
                <span style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{desc}</span>
              </button>
            ))}
          </div>
          <button
            onClick={handleSkip}
            disabled={submitting}
            style={{
              width: "100%", marginTop: 8, padding: "8px",
              borderRadius: 8, border: "1px solid var(--border)",
              background: "transparent", color: "var(--text-muted)",
              fontSize: 12, cursor: submitting ? "default" : "pointer",
            }}
          >
            跳过（不评分）
          </button>
        </div>
      )}
    </div>
  );
}
