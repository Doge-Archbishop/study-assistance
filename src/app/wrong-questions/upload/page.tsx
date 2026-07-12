"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

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

    // 前端压缩预览
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
    <div style={styles.wrapper}>
      <header style={styles.header}>
        <h1 style={styles.title}>拍照上传错题</h1>
        <p style={styles.desc}>
          拍摄或选择错题照片，AI 将自动识别题目、分析错误原因、关联知识点
        </p>
      </header>

      {/* 上传区域 */}
      <div
        style={styles.dropZone}
        onClick={() => fileInputRef.current?.click()}
      >
        {preview ? (
          <img src={preview} alt="Preview" style={styles.preview} />
        ) : (
          <div style={styles.placeholder}>
            <span style={styles.placeholderIcon}>📷</span>
            <span>点击选择错题照片</span>
            <span style={styles.hint}>支持 JPG/PNG/WebP</span>
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

      {/* 结果 */}
      {result && (
        <div
          style={{
            ...styles.result,
            borderColor: result.success ? "var(--green)" : "var(--red)",
          }}
        >
          {result.message}
        </div>
      )}

      {/* 按钮 */}
      <button
        onClick={handleUpload}
        disabled={!preview || uploading}
        style={{
          ...styles.btn,
          opacity: preview && !uploading ? 1 : 0.4,
        }}
      >
        {uploading ? "AI 正在解析..." : "上传并分析"}
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    flex: 1,
    maxWidth: 500,
    margin: "0 auto",
    padding: "20px 16px",
  },
  header: { marginBottom: 24 },
  title: { fontSize: 22, fontWeight: 700, margin: "0 0 8px" },
  desc: { fontSize: 14, color: "var(--text-muted)", margin: 0, lineHeight: 1.6 },
  dropZone: {
    width: "100%",
    minHeight: 260,
    borderRadius: 14,
    border: "2px dashed var(--border)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    overflow: "hidden",
    background: "var(--surface)",
    marginBottom: 16,
  },
  placeholder: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: 8,
    color: "var(--text-muted)",
  },
  placeholderIcon: { fontSize: 40 },
  hint: { fontSize: 12, opacity: 0.6 },
  preview: { width: "100%", height: "auto", objectFit: "contain" as const },
  result: {
    padding: "12px 16px",
    borderRadius: 10,
    border: "1px solid",
    fontSize: 14,
    marginBottom: 12,
    background: "var(--surface)",
  },
  btn: {
    width: "100%",
    padding: "14px 0",
    borderRadius: 12,
    border: "none",
    background: "var(--accent)",
    color: "#fff",
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
  },
};
