/**
 * GET  /api/knowledge-points?search=&subject= → 知识点头部搜索/列表
 * POST /api/knowledge-points                     → 新建知识点
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const subject = searchParams.get("subject") || "";

  const where: Record<string, unknown> = {};
  if (subject) where.subject = subject;
  if (search) where.name = { contains: search };

  const points = await prisma.knowledgePoint.findMany({
    where: Object.keys(where).length > 0 ? where : { name: { not: "" } },
    select: {
      id: true, name: true, description: true, subject: true, level: true,
      positionX: true, positionY: true, masteryLevel: true,
      wrongQuestionCount: true, customNote: true,
    },
    orderBy: { name: "asc" },
    take: 200,
  });

  return NextResponse.json(points);
}

export async function POST(request: NextRequest) {
  try {
    const { name, description, subject, level, parentId, customNote } = await request.json();
    if (!name || !subject) {
      return NextResponse.json({ error: "名称和学科为必填" }, { status: 400 });
    }

    const kp = await prisma.knowledgePoint.create({
      data: {
        name,
        description: description || null,
        subject,
        level: level || "topic",
        parentId: parentId || null,
        customNote: customNote || null,
        positionX: (Math.random() - 0.5) * 200,
        positionY: (Math.random() - 0.5) * 200,
      },
    });

    return NextResponse.json({ success: true, id: kp.id }, { status: 201 });
  } catch (err) {
    console.error("创建知识点失败:", err);
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}
