/**
 * GET    /api/notes/[id]        → 获取单篇笔记
 * PUT    /api/notes/[id]        → 更新笔记
 * DELETE /api/notes/[id]        → 删除笔记
 * POST   /api/notes/[id]/ai-tags → AI 生成标签和摘要
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPrimaryProvider } from "@/lib/ai";

// ── 获取单篇笔记 ──
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const note = await prisma.note.findUnique({
    where: { id },
    include: {
      knowledgePoints: { include: { knowledgePoint: true } },
      linkedWrongQuestions: { include: { wrongQuestion: true } },
    },
  });

  if (!note) {
    return NextResponse.json({ error: "笔记不存在" }, { status: 404 });
  }
  return NextResponse.json(note);
}

// ── 更新笔记 ──
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, content, subject, images, isPinned, knowledgePointIds } = body;

    // 更新笔记本体
    const note = await prisma.note.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(subject !== undefined && { subject }),
        ...(images !== undefined && { images }),
        ...(isPinned !== undefined && { isPinned }),
      },
    });

    // 更新知识点关联（全量替换策略：删旧 + 建新）
    if (knowledgePointIds !== undefined) {
      await prisma.noteKnowledgePoint.deleteMany({ where: { noteId: id } });
      if (knowledgePointIds.length > 0) {
        await prisma.noteKnowledgePoint.createMany({
          data: knowledgePointIds.map((kpId: string) => ({
            noteId: id,
            knowledgePointId: kpId,
          })),
        });
      }
    }

    return NextResponse.json({ success: true, id: note.id });
  } catch (err) {
    console.error("更新笔记失败:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "服务器错误" },
      { status: 500 },
    );
  }
}

// ── 删除笔记 ──
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await prisma.note.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

// ── AI 标签/摘要 ──
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const note = await prisma.note.findUnique({ where: { id } });
    if (!note) {
      return NextResponse.json({ error: "笔记不存在" }, { status: 404 });
    }

    const provider = getPrimaryProvider();
    const prompt = `你是一位高三复习助手。分析以下笔记，返回 JSON：
{
  "tags": ["标签1", "标签2", "标签3"],
  "summary": "一句话摘要，不超过50字"
}

笔记标题：${note.title}
笔记内容：${note.content.slice(0, 3000)}`;

    const result = await provider.chat([
      { role: "user", content: prompt },
    ]);

    // 提取 JSON
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "AI 返回格式异常" }, { status: 422 });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const tags = Array.isArray(parsed.tags) ? parsed.tags : [];
    const summary = typeof parsed.summary === "string" ? parsed.summary : "";

    await prisma.note.update({
      where: { id },
      data: {
        aiTags: JSON.stringify(tags),
        aiSummary: summary,
      },
    });

    return NextResponse.json({ tags, summary });
  } catch (err) {
    console.error("AI 标签生成失败:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI 标签失败" },
      { status: 500 },
    );
  }
}
