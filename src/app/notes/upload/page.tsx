/**
 * 笔记上传页 —— AI 分析笔记照片/文件
 * 双模式：自动（直接保存）/ 预览（确认后保存）
 */
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LucideIcon } from "@/components/lucide-icon";

interface AnalysisResult {
  title: string;
  content: string;
  summary: string;
  tags: string[];
  subject: string;
  knowledgePoints: { name: string; level: string; description?: string }[];
  relations: { source: string; target: string; type: string; label: string }[];
}

const SUBJECTS = [
  { key: "biology", label: "生物", color: "#81C995" },
  { key: "chemistry", label: "化学", color: "#8AB4F8" },
  { key: "english", label: "英语", color: "#FDD663" },
  { key: "chinese", label: "语文", color: "#F28B82" },
];

export default function UploadNotePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [compressedFile, setCompressedFile] = useState<File | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mode, setMode] = useState<"auto" | "preview">("auto");
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  // 预览模式的编辑状态
  const [editTitle, setEditTitle] = useState("");
  const [editSubject, setEditSubject] = useState("biology");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editKps, setEditKps] = useState<AnalysisResult["knowledgePoints"]>([]);
  const [editRels, setEditRels] = useState<AnalysisResult["relations"]>([]);
  const [newKpName, setNewKpName] = useState("");

  useEffect(() => {
    if (result) {
      setEditTitle(result.title);
      setEditSubject(result.subject);
      setEditTags([...result.tags]);
      setEditKps([...result.knowledgePoints]);
      setEditRels([...result.relations]);
    }
  }, [result]);

  /** 自动压缩图片（Canvas resize → JPEG） */
  const autoCompress = async (f: File): Promise<File> => {
    if (!f.type.startsWith("image/")) return f;
    if (f.size < 800 * 1024) return f; // 小于 800KB 不压

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        // 限制最大分辨率 1600px，保持比例
        const maxDim = 1600;
        let w = img.width, h = img.height;
        if (w > maxDim || h > maxDim) {
          const ratio = Math.min(maxDim / w, maxDim / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(new File([blob], f.name, { type: "image/jpeg" }));
            } else {
              resolve(f);
            }
          },
          "image/jpeg",
          0.85, // JPEG 质量 85%
        );
      };
      img.onerror = () => resolve(f);
      img.src = URL.createObjectURL(f);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setCompressedFile(null);
    setStatus("idle");
    setErrorMsg("");
    setResult(null);
    setSavedId(null);

    // 预览
    if (f.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => setPreviewUrl(reader.result as string);
      reader.readAsDataURL(f);
    } else {
      setPreviewUrl(null);
    }

    // 后台自动压缩
    if (f.type.startsWith("image/") && f.size > 800 * 1024) {
      setCompressing(true);
      autoCompress(f).then((cf) => {
        setCompressedFile(cf);
        setCompressing(false);
      });
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) {
      setFile(f);
      setCompressedFile(null);
      if (f.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = () => setPreviewUrl(reader.result as string);
        reader.readAsDataURL(f);
        if (f.size > 800 * 1024) {
          setCompressing(true);
          autoCompress(f).then((cf) => { setCompressedFile(cf); setCompressing(false); });
        }
      }
    }
  };

  const handleAnalyze = useCallback(async () => {
    if (!file) return;
    setStatus("uploading");
    setErrorMsg("");

    const uploadFile = compressedFile || file; // 有压缩版就用压缩版
    const formData = new FormData();
    formData.append("file", uploadFile);
    formData.append("mode", mode);

    try {
      const res = await fetch("/api/notes/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "分析失败");
        setStatus("error");
        return;
      }

      if (data.mode === "auto" && data.id) {
        setSavedId(data.id);
        setResult(data.result);
        setStatus("done");
        router.push(`/notes/${data.id}`);
      } else if (data.mode === "preview") {
        setResult(data.result);
        setStatus("done");
      }
    } catch {
      setErrorMsg("网络错误，请重试");
      setStatus("error");
    }
  }, [file, mode, router]);

  const handleSavePreview = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          content: result?.content || "",
          subject: editSubject,
          aiTags: JSON.stringify(editTags),
          aiSummary: result?.summary || "",
          source: "ai-generated",
          knowledgePointIds: [], // Will be linked via upload API
        }),
      });
      const data = await res.json();
      if (data.id) {
        router.push(`/notes/${data.id}`);
      }
    } catch {
      setErrorMsg("保存失败");
      setSaving(false);
    }
  };

  const subjectColor = SUBJECTS.find((s) => st.key === editSubject)?.color || "var(--accent)";
  const formatSize = (bytes: number) =>
    bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)}MB` : `${(bytes / 1024).toFixed(0)}KB`;

  return (
    <div style={st.wrapper}>
      {/* 顶栏 */}
      <header style={st.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/notes" style={{ color: "var(--text-secondary)", display: "flex" }}>
            <LucideIcon name="arrow-left" size={20} />
          </Link>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>上传分析</h2>
        </div>
        {/* 模式切换 */}
        <div style={{ display: "flex", gap: 1, borderRadius: 10, overflow: "hidden", border: "1px solid var(--border)" }}>
          <button onClick={() => setMode("auto")} style={{ ...st.modeBtn, background: mode === "auto" ? "var(--accent)" : "transparent", color: mode === "auto" ? "#121212" : "var(--text-secondary)", fontWeight: mode === "auto" ? 600 : 400 }}>
            自动
          </button>
          <button onClick={() => setMode("preview")} style={{ ...st.modeBtn, background: mode === "preview" ? "var(--accent)" : "transparent", color: mode === "preview" ? "#121212" : "var(--text-secondary)", fontWeight: mode === "preview" ? 600 : 400 }}>
            预览
          </button>
        </div>
      </header>

      {/* 上传区域 */}
      <div
        style={{ ...st.dropZone, borderColor: file ? `${subjectColor}50` : "var(--border)" }}
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        {previewUrl ? (
          <img src={previewUrl} alt="Preview" style={st.preview} />
        ) : file ? (
          <div style={st.fileInfo}>
            <LucideIcon name="file-text" size={36} color="var(--text-muted)" style={{ opacity: 0.5 }} />
            <span style={{ fontSize: 14, color: "var(--text)", fontWeight: 500 }}>{file.name}</span>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {formatSize(file.size)}
              {compressing && <span style={{ marginLeft: 6, color: "var(--yellow)" }}>压缩中...</span>}
              {compressedFile && <span style={{ marginLeft: 6, color: "var(--green)" }}>→ {formatSize(compressedFile.size)}</span>}
            </span>
          </div>
        ) : (
          <div style={st.placeholder}>
            <LucideIcon name="upload" size={40} color="var(--text-muted)" style={{ opacity: 0.5 }} />
            <span style={{ color: "var(--text-secondary)", marginTop: 8 }}>点击或拖拽上传笔记照片/文件</span>
            <span style={st.hint}>支持 JPG/PNG/WebP/PDF（含扫描版）/DOCX/TXT/MD · 最大 4MB</span>
          </div>
        )}
        <input ref={fileInputRef} type="file" accept="image/*,.txt,.md,.csv,.json,.pdf,.docx" onChange={handleFileChange} style={{ display: "none" }} />
      </div>

      {/* 所选文件 + 分析按钮 */}
      {file && (
        <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10, justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, color: "var(--text)" }}>{file.name}</span>
            <button onClick={() => { setFile(null); setPreviewUrl(null); }} style={st.clearBtn}>
              <LucideIcon name="x" size={14} />
            </button>
          </div>
          <button onClick={handleAnalyze} disabled={status === "uploading"} className="btn btn-primary" style={{ fontSize: 14, padding: "10px 24px" }}>
            {status === "uploading" ? (
              <>分析中...</>
            ) : mode === "auto" ? (
              <>分析并保存</>
            ) : (
              <>开始分析</>
            )}
          </button>
        </div>
      )}

      {/* 错误 */}
      {errorMsg && (
        <div style={st.error}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <LucideIcon name="alert-circle" size={18} color="var(--red)" style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>分析失败</div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, wordBreak: "break-word", whiteSpace: "pre-wrap" }}>{errorMsg}</div>
            </div>
          </div>
        </div>
      )}

      {/* ── 预览模式：编辑结果 ── */}
      {mode === "preview" && status === "done" && result && (
        <div style={st.previewPanel}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px" }}>AI 分析结果</h3>

          {/* 标题 */}
          <label style={st.label}>标题</label>
          <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="input" style={{ marginBottom: 12 }} />

          {/* 学科 */}
          <label style={st.label}>学科</label>
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            {SUBJECTS.map((sub) => (
              <button key={sub.key} onClick={() => setEditSubject(sub.key)}
                style={{ ...st.tagBtn, borderColor: editSubject === sub.key ? sub.color : "var(--border)", background: editSubject === sub.key ? `${sub.color}18` : "transparent", color: editSubject === sub.key ? sub.color : "var(--text-secondary)" }}>
                {sub.label}
              </button>
            ))}
          </div>

          {/* 摘要 */}
          <label style={st.label}>摘要</label>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "0 0 12px" }}>{result.summary}</p>

          {/* 标签 */}
          <label style={st.label}>标签</label>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
            {editTags.map((t, i) => (
              <span key={i} className="tag" style={{ background: `${subjectColor}18`, color: subjectColor, display: "inline-flex", alignItems: "center", gap: 4 }}>
                {t}
                <button onClick={() => setEditTags(editTags.filter((_, j) => j !== i))} style={st.xBtn}><LucideIcon name="x" size={11} /></button>
              </span>
            ))}
            <button onClick={() => { const t = prompt("新标签:"); if (t) setEditTags([...editTags, t]); }}
              style={{ ...st.addBtn, borderColor: subjectColor, color: subjectColor }}>
              <LucideIcon name="plus" size={12} /> 添加
            </button>
          </div>

          {/* 知识点 */}
          <label style={st.label}>知识点</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 16 }}>
            {editKps.map((kp, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                <span style={{ color: "var(--text)" }}>{kp.name}</span>
                <span className="tag" style={{ background: "rgba(255,255,255,0.04)" }}>{kp.level}</span>
                {kp.description && <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{kp.description}</span>}
                <button onClick={() => setEditKps(editKps.filter((_, j) => j !== i))} style={st.xBtn}><LucideIcon name="x" size={11} /></button>
              </div>
            ))}
            <div style={{ display: "flex", gap: 4 }}>
              <input placeholder="新增知识点..." value={newKpName} onChange={(e) => setNewKpName(e.target.value)}
                className="input" style={{ flex: 1, padding: "5px 10px", fontSize: 12 }} />
              <button onClick={() => { if (newKpName.trim()) { setEditKps([...editKps, { name: newKpName.trim(), level: "topic" }]); setNewKpName(""); } }}
                className="btn btn-secondary" style={{ fontSize: 11, padding: "5px 10px" }}>添加</button>
            </div>
          </div>

          {/* 关系 */}
          {editRels.length > 0 && (
            <>
              <label style={st.label}>关系（{editRels.length} 条）</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 16, fontSize: 12 }}>
                {editRels.map((r, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--text-muted)" }}>
                    <span style={{ color: "var(--accent)" }}>{r.source}</span> → <span style={{ color: "var(--accent)" }}>{r.target}</span>
                    <span className="tag" style={{ background: "rgba(255,255,255,0.04)" }}>{r.type}</span>
                    <span>{r.label}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          <button onClick={handleSavePreview} disabled={saving} className="btn btn-primary" style={{ width: "100%", padding: "12px 0", fontSize: 15, fontWeight: 600 }}>
            {saving ? "保存中..." : "确认保存"}
          </button>
        </div>
      )}
    </div>
  );
}

const st: Record<string, React.CSSProperties> = {
  wrapper: { flex: 1, maxWidth: 640, margin: "0 auto", padding: "24px 16px 40px" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  modeBtn: { padding: "6px 16px", border: "none", fontSize: 12, cursor: "pointer", fontFamily: "var(--font-sans)", transition: "all 0.15s" },
  dropZone: {
    minHeight: 220, borderRadius: 16, border: "2px dashed var(--border)", display: "flex",
    alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "hidden",
    background: "var(--surface)", transition: "border-color 0.2s",
  },
  placeholder: { display: "flex", flexDirection: "column", alignItems: "center", gap: 4 },
  hint: { fontSize: 12, color: "var(--text-muted)", opacity: 0.5 },
  fileInfo: { display: "flex", flexDirection: "column", alignItems: "center", gap: 6 },
  preview: { width: "100%", maxHeight: 360, objectFit: "contain" },
  clearBtn: { background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 2, opacity: 0.4 },
  error: { marginTop: 12, padding: "12px 16px", borderRadius: 12, border: "1px solid var(--red)", color: "var(--red)", fontSize: 14, display: "flex", alignItems: "center", gap: 8 },
  previewPanel: { marginTop: 24, padding: 24, borderRadius: 16, background: "var(--surface)", border: "1px solid var(--border)" },
  label: { fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: 1, display: "block", marginBottom: 6 },
  tagBtn: { padding: "5px 12px", borderRadius: 16, border: "1px solid", fontSize: 12, cursor: "pointer", fontFamily: "var(--font-sans)", transition: "all 0.15s" },
  xBtn: { background: "none", border: "none", cursor: "pointer", padding: 0, opacity: 0.5, color: "var(--text-muted)" },
  addBtn: { padding: "4px 10px", borderRadius: 16, border: "1px dashed", fontSize: 11, cursor: "pointer", fontFamily: "var(--font-sans)", background: "transparent" },
};
