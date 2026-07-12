/**
 * PUT    /api/vocabulary/[id]  → 更新单词
 * DELETE /api/vocabulary/[id]  → 删除单词
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const data = await request.json();

  const v = await prisma.vocabulary.update({
    where: { id },
    data: {
      ...(data.word !== undefined && { word: data.word }),
      ...(data.pronunciation !== undefined && { pronunciation: data.pronunciation }),
      ...(data.partOfSpeech !== undefined && { partOfSpeech: data.partOfSpeech }),
      ...(data.meaning !== undefined && { meaning: data.meaning }),
      ...(data.example !== undefined && { example: data.example }),
    },
  });

  return NextResponse.json({ success: true, id: v.id });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await prisma.vocabulary.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
