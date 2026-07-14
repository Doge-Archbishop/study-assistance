/**
 * GET    /api/vocabulary/[id]  → 获取单个单词
 * PUT    /api/vocabulary/[id]  → 更新单词
 * DELETE /api/vocabulary/[id]  → 删除单词
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const v = await prisma.vocabulary.findUnique({ where: { id } });
    if (!v) return NextResponse.json({ error: "单词不存在" }, { status: 404 });
    return NextResponse.json(v);
  } catch (err) {
    console.error("获取单词失败:", err);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const existing = await prisma.vocabulary.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "单词不存在" }, { status: 404 });

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
  } catch (err) {
    console.error("更新单词失败:", err);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const existing = await prisma.vocabulary.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "单词不存在" }, { status: 404 });
    await prisma.vocabulary.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("删除单词失败:", err);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
