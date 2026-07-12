/**
 * GET /api/wrong-questions/[id]  → 获取错题详情（含知识点+复习记录）
 * PUT /api/wrong-questions/[id]  → 更新错题字段 / 知识点关联
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const q = await prisma.wrongQuestion.findUnique({
    where: { id },
    include: {
      knowledgePoints: { include: { knowledgePoint: true } },
      reviewLogs: { orderBy: { createdAt: "desc" }, take: 20 },
      linkedNotes: { include: { note: { select: { id: true, title: true } } } },
    },
  });
  if (!q) return NextResponse.json({ error: "不存在" }, { status: 404 });
  return NextResponse.json(q);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const data = await request.json();

  // 更新本体字段
  const q = await prisma.wrongQuestion.update({
    where: { id },
    data: {
      ...(data.subject !== undefined && { subject: data.subject }),
      ...(data.questionText !== undefined && { questionText: data.questionText }),
      ...(data.correctAnswer !== undefined && { correctAnswer: data.correctAnswer }),
      ...(data.analysis !== undefined && { analysis: data.analysis }),
      ...(data.errorType !== undefined && { errorType: data.errorType }),
      ...(data.difficulty !== undefined && { difficulty: data.difficulty }),
      ...(data.sourceLabel !== undefined && { sourceLabel: data.sourceLabel }),
      ...(data.userNote !== undefined && { userNote: data.userNote }),
    },
  });

  // 更新知识点关联（全量替换）
  if (data.knowledgePointIds !== undefined) {
    await prisma.wrongQuestionKnowledgePoint.deleteMany({ where: { wrongQuestionId: id } });
    if (data.knowledgePointIds.length > 0) {
      await prisma.wrongQuestionKnowledgePoint.createMany({
        data: data.knowledgePointIds.map((kpId: string) => ({
          wrongQuestionId: id,
          knowledgePointId: kpId,
        })),
      });
    }
    // 重新统计关联知识点的错误数
    const allKps = await prisma.wrongQuestionKnowledgePoint.findMany({
      where: { wrongQuestionId: id },
      select: { knowledgePointId: true },
    });
    for (const { knowledgePointId } of allKps) {
      const count = await prisma.wrongQuestionKnowledgePoint.count({
        where: { knowledgePointId },
      });
      await prisma.knowledgePoint.update({
        where: { id: knowledgePointId },
        data: { wrongQuestionCount: count },
      });
    }
  }

  return NextResponse.json({ success: true, id: q.id });
}
