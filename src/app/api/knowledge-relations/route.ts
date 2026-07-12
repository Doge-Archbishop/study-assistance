/**
 * POST /api/knowledge-relations  → 创建知识点关系
 * GET  /api/knowledge-relations?from=xxx&to=xxx → 查询关系
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { sourceId, targetId, label, type, weight } = await request.json();
    if (!sourceId || !targetId) {
      return NextResponse.json({ error: "sourceId 和 targetId 为必填" }, { status: 400 });
    }

    const rel = await prisma.knowledgeRelation.create({
      data: {
        sourceId,
        targetId,
        label: label || "关联",
        type: type || "related",
        weight: weight || 0.5,
      },
    });

    return NextResponse.json({ success: true, id: rel.id }, { status: 201 });
  } catch (err) {
    console.error("创建关系失败:", err);
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}

export async function GET() {
  const relations = await prisma.knowledgeRelation.findMany();
  return NextResponse.json(relations);
}
