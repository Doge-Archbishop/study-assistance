"use client";
import { LucideIcon } from "@/components/lucide-icon";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    id?: string;
  } | null>(null);


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/wrong-questions", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setResult({ success: true, message: "解析成功！", id: data.id });
        setTimeout(() => router.push(`/wrong-questions`), 1500);
      } else {
        setResult({ success: false, message: data.error || "解析失败" });
      }
    } catch {
      setResult({ success: false, message: "网络错误" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={s.wrapper}>
      <header style={s.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <Link href="/wrong-questions" style={{ color: "var(--text-secondary)", textDecoration: "none", display: "flex" }}>
            <LucideIcon name="arrow-left" size={20} />
          </Link>
          <h1 style={s.title}>拍照上传错题</h1>
        </div>
        <p style={s.desc}>
          拍摄或选择错题照片，AI 将自动识别题目、分析错误原因、关联知识点
        </p>
      </header>

      {/* 上传区域 */}
      <div style={s.dropZone} onClick={() => fileInputRef.current?.click()}>
        {preview ? (
          <img src={preview} alt="Preview" style={s.preview} />
        ) : (
          <div style={s.placeholder}>
            <LucideIcon name="camera" size={44} />
            <span style={{ color: "var(--text-secondary)", marginTop: 8 }}>点击选择错题照片</span>
            <span style={s.hint}>支持 JPG/PNG/WebP</span>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
      </div>

      {/* 结果提示 */}
      {result && (
        <div
          style={{
            ...s.result,
            borderColor: result.success ? "var(--green)" : "var(--red)",
            color: result.success ? "var(--green)" : "var(--red)",
            wordBreak: "break-word",
            whiteSpace: "pre-wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <LucideIcon name={result.success ? "check-circle" : "alert-circle"} style={{ width: 16, height: 16, flexShrink: 0, marginTop: 1 }} />
            <span style={{ lineHeight: 1.6 }}>{result.message}</span>
          </div>
        </div>
      )}

      {/* 上传按钮 */}
      <button
        onClick={handleUpload}
        disabled={!preview || uploading}
        className="btn btn-primary"
        style={{
          width: "100%",
          padding: "14px 0",
          fontSize: 15,
          fontWeight: 600,
          opacity: preview && !uploading ? 1 : 0.4,
          transition: "opacity 0.2s",
        }}
      >
        {uploading ? (
          <>
            <LucideIcon name="loader-2" size={16} />
            AI 正在解析...
          </>
        ) : (
          "上传并分析"
        )}
      </button>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  wrapper: { flex: 1, maxWidth: 500, margin: "0 auto", padding: "24px 16px 40px" },
  header: { marginBottom: 24 },
  title: { fontSize: 22, fontWeight: 700, margin: 0 },
  desc: { fontSize: 14, color: "var(--text-secondary)", margin: 0, lineHeight: 1.6 },
  dropZone: {
    width: "100%",
    minHeight: 260,
    borderRadius: 16,
    border: "2px dashed var(--border)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    overflow: "hidden",
    background: "var(--surface)",
    marginBottom: 16,
    transition: "border-color 0.2s",
  },
  placeholder: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
  },
  hint: { fontSize: 12, color: "var(--text-muted)", opacity: 0.6 },
  preview: { width: "100%", height: "auto", objectFit: "contain" },
  result: {
    padding: "12px 16px",
    borderRadius: 12,
    border: "1px solid",
    fontSize: 14,
    marginBottom: 16,
    background: "var(--surface)",
  },
};
