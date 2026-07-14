/**
 * POST /api/notes/upload
 * 上传笔记照片/文件 → AI 分析 → 自动创建笔记 + 知识点 + 关系
 *
 * 支持: JPG/PNG/WebP (图片OCR) | PDF (文本提取 + 扫描版OCR) | DOCX (转换) | TXT/MD (文本)
 *
 * mode=auto: 直接保存并返回 { id, ...result }
 * mode=preview: 仅返回分析结果，不保存
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { analyzeNoteImage, analyzeNoteText } from "@/lib/ai";
import type { NoteAnalysisResult } from "@/lib/ai";

const MAX_SIZE = 4 * 1024 * 1024; // 4MB（Vercel 免费版限制 4.5MB）

/** 根据文件名后缀判断类型（MIME 可能不可靠） */
function detectType(name: string, mime: string): string {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf" || ext === "pdf") return "pdf";
  if (mime.includes("wordprocessing") || mime.includes("officedocument") || ext === "docx" || ext === "doc") return "docx";
  if (mime.startsWith("text/") || ["md", "txt", "csv", "json", "html"].includes(ext)) return "text";
  if (mime === "application/json") return "text";
  return "unknown";
}

/** 从 PDF Buffer 提取文本（使用 pdfjs-dist） */
async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
    let fullText = "";
    const maxPages = Math.min(doc.numPages, 20); // 最多处理 20 页
    for (let i = 1; i <= maxPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .filter((item: any) => "str" in item)
        .map((item: any) => (item as any).str)
        .join(" ");
      fullText += pageText + "\n";
      // 足够内容就停止
      if (fullText.length > 10000) break;
    }
    return fullText.trim();
  } catch {
    return "";
  }
}

/** 从 DOCX Buffer 提取 Markdown */
async function extractDocxMarkdown(buffer: Buffer): Promise<string> {
  try {
    const mammoth = await import("mammoth");
    const result = await (mammoth as any).default.convertToMarkdown({ buffer });
    return result.value || "";
  } catch {
    return "";
  }
}

/** 渲染 PDF 页面为 base64 图片（扫描型 PDF OCR） */
async function renderPdfPagesToImages(
  buffer: Buffer,
  maxPages = 3,
): Promise<string[]> {
  const images: string[] = [];

  // 尝试加载 canvas 原生模块
  let createCanvas: (w: number, h: number) => any;
  try {
    // serverExternalPackages 配置后不会被 bundler 处理，但运行时 module resolution 可能不同
    // 使用 createRequire 从 node_modules 正确解析
    const { createRequire } = await import("node:module");
    // 从项目根目录解析
    const projectRoot = process.cwd();
    const req = createRequire(`${projectRoot}/placeholder.js`);
    const canvasMod = req("@napi-rs/canvas");
    createCanvas = canvasMod.createCanvas;
  } catch (e) {
    console.warn("@napi-rs/canvas 加载失败:", String(e));
    return [];
  }
  if (!createCanvas) return [];

  try {
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
    const pages = Math.min(doc.numPages, maxPages);

    for (let i = 1; i <= pages; i++) {
      const page = await doc.getPage(i);
      const viewport = page.getViewport({ scale: 1.5 });

      const canvas = createCanvas(viewport.width, viewport.height);
      const ctx = canvas.getContext("2d")!;

      await page.render({ canvasContext: ctx as any, viewport }).promise;

      const pngBuffer = canvas.toBuffer("image/png");
      const base64 = `data:image/png;base64,${Buffer.from(pngBuffer).toString("base64")}`;
      images.push(base64);
    }
  } catch (e) {
    console.error("PDF 页面渲染失败:", e);
  }
  return images;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const mode = (formData.get("mode") as string) || "auto";

    if (!file) {
      return NextResponse.json({ error: "未提供文件" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "文件大小不能超过 50MB" }, { status: 400 });
    }

    const type = detectType(file.name, file.type);
    let result: NoteAnalysisResult | null = null;

    // ── 图片 ──
    if (type === "image") {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        return NextResponse.json({ error: "仅支持 JPG/PNG/WebP 图片" }, { status: 400 });
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;
      try {
        result = await analyzeNoteImage(base64);
      } catch (e) {
        console.error("图片 AI 分析失败:", e instanceof Error ? e.message : String(e));
        return NextResponse.json(
          { error: e instanceof Error ? e.message : "图片 AI 分析失败" },
          { status: 422 },
        );
      }
    }

    // ── PDF ──
    else if (type === "pdf") {
      const buffer = Buffer.from(await file.arrayBuffer());
      const text = await extractPdfText(buffer);

      if (text.trim().length > 0) {
        // 文本型 PDF：走文本分析
        try {
          result = await analyzeNoteText(text);
        } catch (e) {
          console.error("PDF 文本分析失败:", e instanceof Error ? e.message : String(e));
          return NextResponse.json(
            { error: `PDF 文本分析失败: ${e instanceof Error ? e.message : String(e)}` },
            { status: 422 },
          );
        }
      } else {
        // 扫描型 PDF：渲染页面为图片 → OCR
        const pageImages = await renderPdfPagesToImages(buffer, 3);
        if (pageImages.length === 0) {
          return NextResponse.json(
            { error: "无法解析此 PDF，请转换为 JPG/PNG 图片后上传" },
            { status: 422 },
          );
        }
        // 每页独立 OCR，合并结果
        try {
          result = await analyzeNoteImage(pageImages[0]);
          // 多页时用文本分析补充
          if (pageImages.length > 1) {
            const fullContent: string[] = [result.content];
            for (let i = 1; i < pageImages.length; i++) {
              const pageResult = await analyzeNoteImage(pageImages[i]);
              fullContent.push(pageResult.content);
            }
            result.content = fullContent.join("\n\n---\n\n");
          }
        } catch (e) {
          console.error("PDF 图片分析失败:", e instanceof Error ? e.message : String(e));
          return NextResponse.json(
            { error: `PDF 图片分析失败: ${e instanceof Error ? e.message : String(e)}` },
            { status: 422 },
          );
        }
      }
    }

    // ── DOCX ──
    else if (type === "docx") {
      const buffer = Buffer.from(await file.arrayBuffer());
      const markdown = await extractDocxMarkdown(buffer);

      if (!markdown.trim()) {
        return NextResponse.json({ error: "无法从 DOCX 中提取内容" }, { status: 422 });
      }
      try {
        result = await analyzeNoteText(markdown);
      } catch (e) {
        console.error("DOCX 分析失败:", e instanceof Error ? e.message : String(e));
        return NextResponse.json(
          { error: `DOCX 分析失败: ${e instanceof Error ? e.message : String(e)}` },
          { status: 422 },
        );
      }
    }

    // ── 纯文本 ──
    else if (type === "text") {
      const text = await file.text();
      if (!text.trim()) {
        return NextResponse.json({ error: "文件内容为空" }, { status: 400 });
      }
      try {
        result = await analyzeNoteText(text);
      } catch (e) {
        console.error("文本分析失败:", e instanceof Error ? e.message : String(e));
        return NextResponse.json(
          { error: `文本分析失败: ${e instanceof Error ? e.message : String(e)}` },
          { status: 422 },
        );
      }
    }

    // ── 未知 ──
    else {
      return NextResponse.json(
        { error: `不支持的文件格式（${file.type || file.name.split(".").pop()}），支持: JPG/PNG/WebP/PDF/DOCX/TXT/MD` },
        { status: 400 },
      );
    }

    // （analyzeNoteText / analyzeNoteImage 现在 throw 而非返回 null，错误已在各分支处理）

    // ── Preview 模式：直接返回 ──
    if (mode === "preview") {
      return NextResponse.json({ mode: "preview", result });
    }

    // ── Auto 模式：创建笔记 + 知识点 + 关系 ──

    const kpIds: string[] = [];
    for (const kp of result.knowledgePoints) {
      let existing = await prisma.knowledgePoint.findFirst({
        where: { name: kp.name, subject: result.subject },
      });
      if (!existing) {
        existing = await prisma.knowledgePoint.create({
          data: {
            name: kp.name,
            subject: result.subject,
            level: kp.level || "topic",
            description: kp.description || null,
            positionX: (Math.random() - 0.5) * 200,
            positionY: (Math.random() - 0.5) * 200,
          },
        });
      }
      kpIds.push(existing.id);
    }

    for (const rel of result.relations) {
      const sourceKp = await prisma.knowledgePoint.findFirst({
        where: { name: rel.source, subject: result.subject },
      });
      const targetKp = await prisma.knowledgePoint.findFirst({
        where: { name: rel.target, subject: result.subject },
      });
      if (sourceKp && targetKp && sourceKp.id !== targetKp.id) {
        try {
          await prisma.knowledgeRelation.create({
            data: {
              sourceId: sourceKp.id,
              targetId: targetKp.id,
              label: rel.label || "关联",
              type: rel.type || "related",
              weight: 0.5,
            },
          });
        } catch { /* 忽略重复 */ }
      }
    }

    const note = await prisma.note.create({
      data: {
        title: result.title || "未命名笔记",
        content: result.content || "",
        subject: result.subject,
        aiTags: JSON.stringify(result.tags || []),
        aiSummary: result.summary || null,
        source: "ai-generated",
      },
    });

    if (kpIds.length > 0) {
      await prisma.noteKnowledgePoint.createMany({
        data: kpIds.map((kpId) => ({ noteId: note.id, knowledgePointId: kpId })),
      });
    }

    return NextResponse.json({ mode: "auto", id: note.id, result });
  } catch (err) {
    console.error("笔记上传失败:", err);
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "服务器错误" : (err instanceof Error ? err.message : "未知错误") },
      { status: 500 },
    );
  }
}
