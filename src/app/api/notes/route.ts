/**
 * GET  /api/notes      → 笔记列表（支持学科筛选、搜索、分页）
 * POST /api/notes      → 创建笔记
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const subject = searchParams.get("subject");
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = 30;

  const where: Record<string, unknown> = {};
  if (subject) where.subject = subject;
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { content: { contains: search } },
    ];
  }

  const [notes, total] = await Promise.all([
    prisma.note.findMany({
      where,
      include: {
        knowledgePoints: {
          include: { knowledgePoint: true },
        },
      },
      orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.note.count({ where }),
  ]);

  return NextResponse.json({ notes, total, page, pageSize });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content, subject, images, isPinned, knowledgePointIds } = body;

    if (!title || !subject) {
      return NextResponse.json(
        { error: "标题和学科为必填项" },
        { status: 400 },
      );
    }

    const note = await prisma.note.create({
      data: {
        title,
        content: content || "",
        subject,
        images: images || null,
        isPinned: isPinned || false,
      },
    });

    // 关联知识点
    if (knowledgePointIds && knowledgePointIds.length > 0) {
      await prisma.noteKnowledgePoint.createMany({
        data: knowledgePointIds.map((kpId: string) => ({
          noteId: note.id,
          knowledgePointId: kpId,
        })),
      });
    }

    return NextResponse.json({ success: true, id: note.id }, { status: 201 });
  } catch (err) {
    console.error("创建笔记失败:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "服务器错误" },
      { status: 500 },
    );
  }
}
