/**
 * 笔记编辑器 —— Markdown 编辑 + KaTeX 实时预览 + 知识点关联 + 手写画板
 */
"use client";
import { LucideIcon } from "@/components/lucide-icon";

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
  { key: "biology", label: "生物", color: "#81C995" },
  { key: "chemistry", label: "化学", color: "#8AB4F8" },
  { key: "english", label: "英语", color: "#FDD663" },
  { key: "chinese", label: "语文", color: "#F28B82" },
];

export default function NoteEditor({ initial }: Props) {
  const router = useRouter();
  const isEdit = !!initial;

  const [title, setTitle] = useState(initial?.title || "");
  const [content, setContent] = useState(initial?.content || "");
  const [subject, setSubject] = useState(initial?.subject || "biology");
  const [isPinned, setIsPinned] = useState(initial?.isPinned || false);
  const [saving, setSaving] = useState(false);

  const [linkedKps, setLinkedKps] = useState<KnowledgePoint[]>(
    initial?.knowledgePoints?.map((kp) => kp.knowledgePoint) || [],
  );
  const [kpSearch, setKpSearch] = useState("");
  const [kpResults, setKpResults] = useState<KnowledgePoint[]>([]);
  const [kpOpen, setKpOpen] = useState(false);
  const kpRef = useRef<HTMLDivElement>(null);

  const [preview, setPreview] = useState(false);
  const [showDrawing, setShowDrawing] = useState(false);


  // 搜索知识点（200ms 防抖）
  // linkedKps 通过 ref 读取，避免作为 deps 导致不必要的搜索重发
  const linkedKpsRef = useRef(linkedKps);
  useEffect(() => { linkedKpsRef.current = linkedKps; });
  useEffect(() => {
    const t = setTimeout(async () => {
      if (!kpSearch.trim()) return; // 空搜索不触发请求
      const res = await fetch(
        `/api/knowledge-points?search=${encodeURIComponent(kpSearch)}&subject=${subject}`,
      );
      const data = await res.json();
      setKpResults(data.filter((kp: KnowledgePoint) => !linkedKpsRef.current.find((l) => l.id === kp.id)));
    }, 200);
    return () => clearTimeout(t);
  }, [kpSearch, subject]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (kpRef.current && !kpRef.current.contains(e.target as Node)) {
        setKpOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const addKp = useCallback((kp: KnowledgePoint) => {
    setLinkedKps((prev) => [...prev, kp]);
    setKpSearch("");
    setKpOpen(false);
  }, []);

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

  const insertDrawing = useCallback((dataUrl: string) => {
    setContent((prev) => prev + `\n\n![手写草稿](${dataUrl})\n`);
    setShowDrawing(false);
  }, []);

  const subjectColor = SUBJECTS.find((s) => s.key === subject)?.color || "var(--accent)";

  return (
    <div style={{ flex: 1, maxWidth: 720, margin: "0 auto", padding: "0 16px 40px" }}>
      {/* 顶栏 */}
      <header style={st.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/notes" style={{ color: "var(--text-secondary)", textDecoration: "none", fontSize: 14, padding: 4 }}>
            <LucideIcon name="arrow-left" size={18} />
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
              className="btn btn-secondary"
              style={{ fontSize: 12, padding: "7px 14px" }}
            >
              <LucideIcon name="sparkles" size={14} />
              AI 标签
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="btn btn-primary"
            style={{ fontSize: 13, padding: "7px 20px" }}
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
        style={st.titleInput}
      />

      {/* 工具栏 */}
      <div style={st.toolbar}>
        {SUBJECTS.map((s) => (
          <button
            key={s.key}
            onClick={() => setSubject(s.key)}
            style={{
              padding: "5px 12px",
              borderRadius: 20,
              border: subject === s.key ? `1.5px solid ${s.color}` : "1px solid var(--border)",
              background: subject === s.key ? `${s.color}15` : "transparent",
              color: subject === s.key ? s.color : "var(--text-secondary)",
              fontSize: 12,
              fontWeight: subject === s.key ? 600 : 400,
              cursor: "pointer",
              fontFamily: "var(--font-sans)",
              transition: "all 0.15s",
            }}
          >
            {s.label}
          </button>
        ))}

        <div className="divider" />

        <button
          onClick={() => setIsPinned(!isPinned)}
          title="置顶"
          style={{
            ...st.toolBtn,
            background: isPinned ? `${subjectColor}15` : "transparent",
            color: isPinned ? subjectColor : "var(--text-secondary)",
          }}
        >
          <LucideIcon name="pin" size={14} />
          {isPinned ? "已置顶" : "置顶"}
        </button>

        <button
          onClick={() => setShowDrawing(!showDrawing)}
          style={{
            ...st.toolBtn,
            background: showDrawing ? `${subjectColor}15` : "transparent",
            color: showDrawing ? subjectColor : "var(--text-secondary)",
          }}
        >
          <LucideIcon name="pen" size={14} />
          手写
        </button>

        <button
          onClick={() => setPreview(!preview)}
          style={{
            ...st.toolBtn,
            background: preview ? `${subjectColor}15` : "transparent",
            color: preview ? subjectColor : "var(--text-secondary)",
            marginLeft: "auto",
          }}
        >
          <LucideIcon name={preview ? "edit-3" : "eye"} style={{ width: 14, height: 14 }} />
          {preview ? "编辑" : "预览"}
        </button>
      </div>

      {/* 知识点关联 */}
      <div ref={kpRef} style={{ position: "relative", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: linkedKps.length > 0 ? 8 : 0 }}>
          {linkedKps.map((kp) => (
            <span
              key={kp.id}
              className="tag"
              style={{ background: `${subjectColor}18`, color: subjectColor, gap: 4, display: "inline-flex", alignItems: "center" }}
            >
              {kp.name}
              <button
                onClick={() => removeKp(kp.id)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: subjectColor, fontSize: 14, padding: 0,
                  lineHeight: 1, opacity: 0.6,
                }}
              >
                <LucideIcon name="x" size={12} />
              </button>
            </span>
          ))}
        </div>
        <input
          type="text"
          placeholder="关联知识点（搜索添加）..."
          value={kpSearch}
          onChange={(e) => { setKpSearch(e.target.value); setKpOpen(true); }}
          onFocus={() => setKpOpen(true)}
          className="input"
          style={{ padding: "8px 12px", fontSize: 13 }}
        />
        {kpOpen && kpSearch.trim() && kpResults.length > 0 && (
          <div style={st.dropdown}>
            {kpResults.map((kp) => (
              <button
                key={kp.id}
                onClick={() => addKp(kp)}
                style={st.dropdownItem}
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
        <div className="card" style={{ minHeight: 300, padding: 20 }}>
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
          className="card"
          style={st.textarea}
        />
      )}

      {/* 底部提示 */}
      <p style={st.footerHint}>
        使用 <code>$</code> 包裹行内公式 · <code>$$</code> 块级公式 · <code>\ce{}</code> 化学方程式
      </p>
    </div>
  );
}

const st: Record<string, React.CSSProperties> = {
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "20px 0 16px",
  },
  titleInput: {
    width: "100%",
    padding: "12px 0",
    fontSize: 24,
    fontWeight: 700,
    border: "none",
    outline: "none",
    background: "transparent",
    color: "var(--text)",
    marginBottom: 12,
    fontFamily: "var(--font-sans)",
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  toolBtn: {
    padding: "5px 12px",
    borderRadius: 20,
    border: "1px solid var(--border)",
    background: "transparent",
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "var(--font-sans)",
    display: "flex",
    alignItems: "center",
    gap: 5,
    transition: "all 0.15s",
  },
  dropdown: {
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
    boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
  },
  dropdownItem: {
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
    fontFamily: "var(--font-sans)",
  },
  textarea: {
    width: "100%",
    minHeight: 360,
    padding: "16px",
    fontSize: 15,
    lineHeight: 1.7,
    resize: "vertical",
    outline: "none",
    fontFamily: "var(--font-mono)",
    background: "var(--surface)",
    color: "var(--text)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    boxSizing: "border-box",
  },
  footerHint: {
    fontSize: 11,
    color: "var(--text-muted)",
    marginTop: 12,
    textAlign: "center",
  },
};
