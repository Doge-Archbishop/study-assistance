/**
 * 笔记编辑器 —— Markdown 编辑 + KaTeX 实时预览 + 知识点关联 + 手写画板
 */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MarkdownRenderer from "./markdown-renderer";
import DrawingPad from "./drawing-pad";

interface KnowledgePoint {
  id: string;
  name: string;
  subject: string;
  level: string;
}

interface Props {
  initial?: {
    id: string;
    title: string;
    content: string;
    subject: string;
    isPinned: boolean;
    images: string | null;
    knowledgePoints: { knowledgePoint: KnowledgePoint }[];
  };
}

const SUBJECTS = [
  { key: "biology", label: "生物", color: "#51cf66" },
  { key: "chemistry", label: "化学", color: "#4dabf7" },
  { key: "english", label: "英语", color: "#ffd43b" },
  { key: "chinese", label: "语文", color: "#ff6b6b" },
];

export default function NoteEditor({ initial }: Props) {
  const router = useRouter();
  const isEdit = !!initial;

  const [title, setTitle] = useState(initial?.title || "");
  const [content, setContent] = useState(initial?.content || "");
  const [subject, setSubject] = useState(initial?.subject || "biology");
  const [isPinned, setIsPinned] = useState(initial?.isPinned || false);
  const [saving, setSaving] = useState(false);

  // 知识点关联
  const [linkedKps, setLinkedKps] = useState<KnowledgePoint[]>(
    initial?.knowledgePoints?.map((kp) => kp.knowledgePoint) || [],
  );
  const [kpSearch, setKpSearch] = useState("");
  const [kpResults, setKpResults] = useState<KnowledgePoint[]>([]);
  const [kpOpen, setKpOpen] = useState(false);
  const kpRef = useRef<HTMLDivElement>(null);

  // 预览/编辑切换
  const [preview, setPreview] = useState(false);

  // Canvas 手写
  const [showDrawing, setShowDrawing] = useState(false);

  // 搜索知识点
  useEffect(() => {
    if (!kpSearch.trim()) {
      setKpResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const res = await fetch(
        `/api/knowledge-points?search=${encodeURIComponent(kpSearch)}&subject=${subject}`,
      );
      const data = await res.json();
      setKpResults(data.filter((kp: KnowledgePoint) => !linkedKps.find((l) => l.id === kp.id)));
    }, 200);
    return () => clearTimeout(t);
  }, [kpSearch, subject, linkedKps]);

  // 下拉关闭
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (kpRef.current && !kpRef.current.contains(e.target as Node)) {
        setKpOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const addKp = useCallback(
    (kp: KnowledgePoint) => {
      setLinkedKps((prev) => [...prev, kp]);
      setKpSearch("");
      setKpOpen(false);
    },
    [],
  );

  const removeKp = useCallback((id: string) => {
    setLinkedKps((prev) => prev.filter((kp) => kp.id !== id));
  }, []);

  const handleSave = useCallback(async () => {
    if (!title.trim()) return;
    setSaving(true);

    const body = {
      title: title.trim(),
      content,
      subject,
      isPinned,
      knowledgePointIds: linkedKps.map((kp) => kp.id),
    };

    const url = isEdit ? `/api/notes/${initial!.id}` : "/api/notes";
    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      router.push("/notes");
      router.refresh();
    } else {
      setSaving(false);
    }
  }, [title, content, subject, isPinned, linkedKps, isEdit, initial, router]);

  const handleAITags = useCallback(async () => {
    if (!isEdit) return;
    setSaving(true);
    await fetch(`/api/notes/${initial!.id}/ai-tags`, { method: "POST" });
    setSaving(false);
    router.refresh();
  }, [isEdit, initial, router]);

  const insertDrawing = useCallback(
    (dataUrl: string) => {
      setContent((prev) => prev + `\n\n![手写草稿](${dataUrl})\n`);
      setShowDrawing(false);
    },
    [],
  );

  const subjectColor = SUBJECTS.find((s) => s.key === subject)?.color || "var(--accent)";

  return (
    <div style={{ flex: 1, maxWidth: 720, margin: "0 auto", padding: "0 16px 40px" }}>
      {/* 顶栏 */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 0 16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/notes" style={{ color: "var(--text-muted)", textDecoration: "none", fontSize: 14 }}>
            ←
          </Link>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
            {isEdit ? "编辑笔记" : "新建笔记"}
          </h2>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {isEdit && (
            <button
              onClick={handleAITags}
              disabled={saving || !content.trim()}
              style={{
                padding: "7px 14px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--text-muted)",
                fontSize: 12,
                cursor: saving ? "default" : "pointer",
                opacity: saving ? 0.5 : 1,
              }}
            >
              🤖 AI 标签
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            style={{
              padding: "7px 20px",
              borderRadius: 8,
              border: "none",
              background: title.trim() ? "var(--accent)" : "var(--border)",
              color: title.trim() ? "#fff" : "var(--text-muted)",
              fontSize: 13,
              fontWeight: 600,
              cursor: title.trim() ? "pointer" : "default",
            }}
          >
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </header>

      {/* 标题 */}
      <input
        type="text"
        placeholder="笔记标题..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={{
          width: "100%",
          padding: "12px 0",
          fontSize: 24,
          fontWeight: 700,
          border: "none",
          outline: "none",
          background: "transparent",
          color: "var(--text)",
          marginBottom: 12,
        }}
      />

      {/* 工具栏：学科 + 置顶 + 预览 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        {SUBJECTS.map((s) => (
          <button
            key={s.key}
            onClick={() => setSubject(s.key)}
            style={{
              padding: "4px 12px",
              borderRadius: 20,
              border: subject === s.key ? "1.5px solid" : "1px solid var(--border)",
              borderColor: subject === s.key ? s.color : "var(--border)",
              background: subject === s.key ? `${s.color}15` : "transparent",
              color: subject === s.key ? s.color : "var(--text-muted)",
              fontSize: 12,
              fontWeight: subject === s.key ? 600 : 400,
              cursor: "pointer",
            }}
          >
            {s.label}
          </button>
        ))}

        <div style={{ width: 1, height: 20, background: "var(--border)", margin: "0 4px" }} />

        <button
          onClick={() => setIsPinned(!isPinned)}
          title="置顶"
          style={{
            padding: "4px 10px",
            borderRadius: 20,
            border: "1px solid var(--border)",
            background: isPinned ? `${subjectColor}15` : "transparent",
            color: isPinned ? subjectColor : "var(--text-muted)",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          📌 {isPinned ? "已置顶" : "置顶"}
        </button>

        <button
          onClick={() => setShowDrawing(!showDrawing)}
          style={{
            padding: "4px 10px",
            borderRadius: 20,
            border: "1px solid var(--border)",
            background: showDrawing ? `${subjectColor}15` : "transparent",
            color: showDrawing ? subjectColor : "var(--text-muted)",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          ✍️ 手写
        </button>

        <button
          onClick={() => setPreview(!preview)}
          style={{
            padding: "4px 10px",
            borderRadius: 20,
            border: "1px solid var(--border)",
            background: preview ? `${subjectColor}15` : "transparent",
            color: preview ? subjectColor : "var(--text-muted)",
            fontSize: 12,
            cursor: "pointer",
            marginLeft: "auto",
          }}
        >
          {preview ? "编辑" : "预览"}
        </button>
      </div>

      {/* 知识点关联 */}
      <div ref={kpRef} style={{ position: "relative", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: linkedKps.length > 0 ? 8 : 0 }}>
          {linkedKps.map((kp) => (
            <span
              key={kp.id}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontSize: 12,
                padding: "3px 10px",
                borderRadius: 20,
                background: `${subjectColor}20`,
                color: subjectColor,
              }}
            >
              {kp.name}
              <button
                onClick={() => removeKp(kp.id)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: subjectColor,
                  fontSize: 14,
                  padding: 0,
                  lineHeight: 1,
                  opacity: 0.6,
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <input
          type="text"
          placeholder="关联知识点（搜索添加）..."
          value={kpSearch}
          onChange={(e) => {
            setKpSearch(e.target.value);
            setKpOpen(true);
          }}
          onFocus={() => setKpOpen(true)}
          style={{
            width: "100%",
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "var(--surface)",
            color: "var(--text)",
            fontSize: 13,
            outline: "none",
            boxSizing: "border-box",
          }}
        />
        {kpOpen && kpResults.length > 0 && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              maxHeight: 180,
              overflowY: "auto",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              zIndex: 10,
              boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
            }}
          >
            {kpResults.map((kp) => (
              <button
                key={kp.id}
                onClick={() => addKp(kp)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 12px",
                  border: "none",
                  background: "none",
                  color: "var(--text)",
                  fontSize: 13,
                  cursor: "pointer",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                {kp.name}
                <span style={{ color: "var(--text-muted)", fontSize: 11, marginLeft: 8 }}>
                  {kp.level === "chapter" ? "章" : kp.level === "section" ? "节" : "考点"}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 手写画板 */}
      {showDrawing && (
        <div style={{ marginBottom: 16 }}>
          <DrawingPad onSave={insertDrawing} />
        </div>
      )}

      {/* 编辑 / 预览 */}
      {preview ? (
        <div
          style={{
            minHeight: 300,
            padding: "20px",
            borderRadius: 12,
            border: "1px solid var(--border)",
            background: "var(--surface)",
          }}
        >
          {content ? (
            <MarkdownRenderer content={content} />
          ) : (
            <p style={{ color: "var(--text-muted)", textAlign: "center", padding: 40 }}>
              暂无内容
            </p>
          )}
        </div>
      ) : (
        <textarea
          placeholder={`开始写笔记...\n\n# Markdown 标题\n**粗体** *斜体*\n\n化学方程式：$\\ce{2H2 + O2 -> 2H2O}$\n数学公式：$$E = mc^{2}$$\n\n- 列表项 1\n- 列表项 2`}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          style={{
            width: "100%",
            minHeight: 360,
            padding: "16px",
            borderRadius: 12,
            border: "1px solid var(--border)",
            background: "var(--surface)",
            color: "var(--text)",
            fontSize: 15,
            lineHeight: 1.7,
            resize: "vertical",
            outline: "none",
            fontFamily: "var(--font-mono, monospace)",
            boxSizing: "border-box",
          }}
        />
      )}

      {/* 底部快捷键提示 */}
      <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 12, textAlign: "center" }}>
        💡 使用 <code>$</code> 包裹行内公式 · <code>$$</code> 块级公式 · <code>\ce{}</code> 化学方程式
      </p>
    </div>
  );
}
