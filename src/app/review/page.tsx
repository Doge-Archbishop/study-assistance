/**
 * 复习页面 —— 翻牌卡片 + SM-2 评分
 * 支持错题和单词两种模式
 */
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { LucideIcon } from "@/components/lucide-icon";

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
  biology: "#81C995",
  chemistry: "#8AB4F8",
  english: "#FDD663",
  chinese: "#F28B82",
};

const SUBJECT_LABELS: Record<string, string> = {
  biology: "生物",
  chemistry: "化学",
  english: "英语",
  chinese: "语文",
};

const RATINGS = [
  { q: 0, label: "完全忘记", color: "#F28B82", desc: "一点印象都没有" },
  { q: 2, label: "有印象", color: "#FDD663", desc: "记得一点但答不对" },
  { q: 3, label: "勉强正确", color: "#FFB74D", desc: "想了好久才答对" },
  { q: 4, label: "比较熟练", color: "#8AB4F8", desc: "犹豫了一下答对" },
  { q: 5, label: "非常熟练", color: "#81C995", desc: "秒答，完全掌握" },
];

export default function ReviewPage() {
  const [questions, setQuestions] = useState<ReviewQuestion[]>([]);
  const [vocabs, setVocabs] = useState<ReviewVocab[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentType, setCurrentType] = useState<"question" | "vocab">("question");
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sessionStats, setSessionStats] = useState({ reviewed: 0, avgQuality: 0, totalQuality: 0 });
  const [sessionDone, setSessionDone] = useState(false);


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

  const advance = useCallback(() => {
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

  const handleRate = useCallback(
    async (quality: number) => {
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
      advance();
    },
    [current, submitting, currentType, advance],
  );

  const handleSkip = useCallback(() => {
    setFlipped(false);
    advance();
  }, [advance]);

  if (loading) {
    return (
      <div style={s.center}>
        <p style={{ color: "var(--text-secondary)" }}>加载中...</p>
      </div>
    );
  }

  if (currentList.length === 0 && !sessionDone) {
    return (
      <div style={{ ...s.center, gap: 16 }}>
        <LucideIcon name="check-circle" size={48} />
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>暂时没有待复习内容</h2>
        <p style={{ color: "var(--text-secondary)", fontSize: 14, margin: 0 }}>
          上传错题或添加单词后会自动安排复习
        </p>
        <Link href="/" style={{ marginTop: 12, color: "var(--accent)", fontSize: 14 }}>
          返回首页
        </Link>
      </div>
    );
  }

  if (sessionDone) {
    return (
      <div style={{ ...s.center, gap: 16 }}>
        <LucideIcon name="trophy" size={56} />
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>今日复习完成！</h2>
        <div style={{ display: "flex", gap: 28, marginTop: 8 }}>
          <div style={{ textAlign: "center" as const }}>
            <div style={{ fontSize: 30, fontWeight: 700, color: "var(--accent)" }}>
              {sessionStats.reviewed}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>复习数</div>
          </div>
          <div style={{ textAlign: "center" as const }}>
            <div style={{ fontSize: 30, fontWeight: 700, color: "var(--green)" }}>
              {sessionStats.avgQuality}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>均分 / 5</div>
          </div>
        </div>
        <Link
          href="/"
          style={{
            marginTop: 20,
            padding: "10px 24px",
            borderRadius: 10,
            background: "var(--accent)",
            color: "#121212",
            textDecoration: "none",
            fontSize: 14,
            fontWeight: 600,
            transition: "all 0.2s",
          }}
        >
          返回首页
        </Link>
      </div>
    );
  }

  const overallIndex =
    currentType === "question" ? currentIndex + 1 : questions.length + currentIndex + 1;

  const subjectColor =
    currentType === "question"
      ? SUBJECT_COLORS[(current as ReviewQuestion).subject] || "var(--accent)"
      : "#FDD663";

  return (
    <div style={s.container}>
      {/* ── 顶栏 ── */}
      <div style={s.topBar}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: subjectColor,
              boxShadow: `0 0 8px ${subjectColor}60`,
            }}
          />
          <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}>
            {currentType === "question"
              ? `${SUBJECT_LABELS[(current as ReviewQuestion).subject]} · 错题`
              : "英语 · 单词"}
          </span>
        </div>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
          {overallIndex}/{totalItems}
        </span>
      </div>

      {/* 进度条 */}
      <div className="progress-bar" style={{ marginBottom: 24 }}>
        <div
          className="progress-bar-fill"
          style={{
            width: `${(overallIndex / totalItems) * 100}%`,
            background: subjectColor,
          }}
        />
      </div>

      {/* ── 卡片 ── */}
      <div
        onClick={() => !submitting && setFlipped(!flipped)}
        style={{
          ...s.card,
          borderColor: flipped ? `${subjectColor}40` : "var(--border)",
        }}
      >
        {currentType === "question" ? (
          <>
            {(current as ReviewQuestion).images?.[0] && (current as ReviewQuestion).images[0] && (
                <div
                  style={{
                    background: "#000",
                    display: "flex",
                    justifyContent: "center",
                    maxHeight: 260,
                    overflow: "hidden",
                    borderTopLeftRadius: 16,
                    borderTopRightRadius: 16,
                  }}
                >
                  <img
                    src={(current as ReviewQuestion).images[0]}
                    alt="题目"
                    style={{ maxWidth: "100%", maxHeight: 260, objectFit: "contain" }}
                  />
                </div>
              )}

            <div style={{ padding: "24px", flex: 1, display: "flex", flexDirection: "column" }}>
              {!flipped ? (
                <>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--text-muted)",
                      textTransform: "uppercase" as const,
                      letterSpacing: 1,
                      marginBottom: 12,
                    }}
                  >
                    题目
                    {(current as ReviewQuestion).sourceLabel &&
                      ` · ${(current as ReviewQuestion).sourceLabel}`}
                  </span>
                  <p style={{ fontSize: 15, lineHeight: 1.8, margin: 0, flex: 1 }}>
                    {(current as ReviewQuestion).questionText || "（查看图片）"}
                  </p>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 16 }}>
                    {(current as ReviewQuestion).knowledgePoints?.map((kp: string) => (
                      <span
                        key={kp}
                        className="tag"
                        style={{
                          background: `${subjectColor}18`,
                          color: subjectColor,
                        }}
                      >
                        {kp}
                      </span>
                    ))}
                  </div>
                  <p
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      textAlign: "center",
                      margin: "20px 0 0",
                      opacity: 0.4,
                    }}
                  >
                    点击翻转查看答案和解析
                  </p>
                </>
              ) : (
                <>
                  {/* 正确答案 */}
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                      <LucideIcon name="check-circle" size={16} color="var(--green)" />
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: "var(--green)",
                          textTransform: "uppercase" as const,
                          letterSpacing: 1,
                        }}
                      >
                        正确答案
                      </span>
                    </div>
                    <p style={{ fontSize: 15, lineHeight: 1.8, margin: 0, color: "var(--green)" }}>
                      {(current as ReviewQuestion).correctAnswer || "未提供"}
                    </p>
                  </div>

                  {/* AI 解析 */}
                  {(current as ReviewQuestion).analysis && (
                    <div
                      style={{
                        padding: 16,
                        borderRadius: 12,
                        background: "rgba(138,180,248,0.06)",
                        border: "1px solid rgba(138,180,248,0.15)",
                        marginBottom: 14,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          marginBottom: 8,
                        }}
                      >
                        <LucideIcon
                          name="sparkles"
                          size={14} style={{ color: "var(--accent)" }}
                        />
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: "var(--accent)",
                          }}
                        >
                          AI 解析
                        </span>
                      </div>
                      <p style={{ fontSize: 14, lineHeight: 1.7, margin: 0 }}>
                        {(current as ReviewQuestion).analysis}
                      </p>
                    </div>
                  )}

                  {/* 用户笔记 */}
                  {(current as ReviewQuestion).userNote && (
                    <div
                      style={{
                        padding: "12px 16px",
                        borderRadius: 10,
                        background: "rgba(255,255,255,0.02)",
                        marginBottom: 14,
                      }}
                    >
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        <LucideIcon
                          name="sticky-note"
                          style={{
                            width: 12,
                            height: 12,
                            display: "inline",
                            verticalAlign: -2,
                            marginRight: 4,
                          }}
                        />{" "}
                        你的笔记
                      </span>
                      <p
                        style={{
                          fontSize: 13,
                          margin: "6px 0 0",
                          fontStyle: "italic",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {(current as ReviewQuestion).userNote}
                      </p>
                    </div>
                  )}

                  {/* SM-2 状态 */}
                  <div
                    style={{
                      display: "flex",
                      gap: 20,
                      fontSize: 11,
                      color: "var(--text-muted)",
                      marginTop: "auto",
                    }}
                  >
                    <span>复习 {(current as ReviewQuestion).reviewCount} 次</span>
                    <span>间隔 {Math.round((current as ReviewQuestion).sm2.interval)} 天</span>
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          /* ── 单词卡片 ── */
          <div
            style={{
              padding: "32px 24px",
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {!flipped ? (
              <>
                <span
                  style={{
                    fontSize: 40,
                    fontWeight: 700,
                    letterSpacing: 1,
                    marginBottom: 12,
                  }}
                >
                  {(current as ReviewVocab).word}
                </span>
                {(current as ReviewVocab).pronunciation && (
                  <span
                    style={{
                      fontSize: 15,
                      color: "var(--text-secondary)",
                      marginBottom: 12,
                    }}
                  >
                    /{(current as ReviewVocab).pronunciation}/
                  </span>
                )}
                {(current as ReviewVocab).partOfSpeech && (
                  <span
                    className="tag"
                    style={{
                      background: "rgba(253,214,99,0.15)",
                      color: "#FDD663",
                    }}
                  >
                    {(current as ReviewVocab).partOfSpeech}
                  </span>
                )}
                <p
                  style={{
                    fontSize: 12,
                    color: "var(--text-muted)",
                    marginTop: 36,
                    opacity: 0.4,
                  }}
                >
                  点击翻转查看释义
                </p>
              </>
            ) : (
              <>
                <span
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    color: "var(--accent)",
                    marginBottom: 20,
                  }}
                >
                  {(current as ReviewVocab).meaning}
                </span>
                {(current as ReviewVocab).example && (
                  <p
                    style={{
                      fontSize: 14,
                      color: "var(--text-secondary)",
                      textAlign: "center",
                      lineHeight: 1.6,
                      fontStyle: "italic",
                      maxWidth: 360,
                    }}
                  >
                    &ldquo;{(current as ReviewVocab).example}&rdquo;
                  </p>
                )}
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    fontSize: 11,
                    color: "var(--text-muted)",
                    marginTop: 28,
                  }}
                >
                  <span>间隔 {Math.round((current as ReviewVocab).sm2.interval)} 天</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── 评分按钮 ── */}
      {flipped && (
        <div style={{ padding: "20px 0 0" }}>
          <p
            style={{
              fontSize: 12,
              color: "var(--text-muted)",
              textAlign: "center",
              margin: "0 0 12px",
            }}
          >
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
                  padding: "12px 4px",
                  borderRadius: 12,
                  border: `1.5px solid ${color}30`,
                  background: `${color}0D`,
                  cursor: submitting ? "default" : "pointer",
                  opacity: submitting ? 0.5 : 1,
                  transition: "all 0.15s var(--ease-out)",
                  position: "relative",
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLElement).style.borderColor = `${color}70`;
                  (e.target as HTMLElement).style.background = `${color}18`;
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.borderColor = `${color}30`;
                  (e.target as HTMLElement).style.background = `${color}0D`;
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 600, color }}>{label}</span>
                <span style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 3 }}>
                  {desc}
                </span>
              </button>
            ))}
          </div>
          <button
            onClick={handleSkip}
            disabled={submitting}
            style={{
              width: "100%",
              marginTop: 10,
              padding: "10px",
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text-secondary)",
              fontSize: 13,
              cursor: submitting ? "default" : "pointer",
              transition: "all 0.2s",
            }}
          >
            跳过（不评分）
          </button>
        </div>
      )}
    </div>
  );
}

/** ── 样式 ── */
const s: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    maxWidth: 520,
    margin: "0 auto",
    padding: "24px 16px 40px",
    display: "flex",
    flexDirection: "column",
  },
  center: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  topBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  card: {
    flex: 1,
    background: "var(--surface)",
    borderRadius: 18,
    border: "1.5px solid var(--border)",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    transition: "border-color 0.25s, box-shadow 0.25s",
    minHeight: 360,
    boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
  },
};
