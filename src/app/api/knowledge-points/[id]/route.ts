/**
 * GET /api/knowledge-points/[id] → 获取知识点详情（含关联笔记+错题+关系）
 * PUT /api/knowledge-points/[id] → 更新知识点（位置/笔记等）
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const kp = await prisma.knowledgePoint.findUnique({
    where: { id },
    include: {
      notes: { include: { note: { select: { id: true, title: true } } } },
      wrongQuestions: { include: { wrongQuestion: { select: { id: true } } } },
      sourceRelations: { include: { target: { select: { id: true, name: true } } } },
      targetRelations: { include: { source: { select: { id: true, name: true } } } },
    },
  });

  if (!kp) return NextResponse.json({ error: "不存在" }, { status: 404 });
  return NextResponse.json(kp);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const data = await request.json();

  const kp = await prisma.knowledgePoint.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.subject !== undefined && { subject: data.subject }),
      ...(data.level !== undefined && { level: data.level }),
      ...(data.positionX !== undefined && { positionX: data.positionX }),
      ...(data.positionY !== undefined && { positionY: data.positionY }),
      ...(data.customNote !== undefined && { customNote: data.customNote }),
    },
  });

  return NextResponse.json({ success: true, id: kp.id });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await prisma.knowledgePoint.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
