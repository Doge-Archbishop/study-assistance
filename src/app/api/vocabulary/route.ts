/**
 * GET  /api/vocabulary?search=&page=1     → 单词列表
 * POST /api/vocabulary                      → 添加单个单词
 * POST /api/vocabulary/batch                → 批量导入
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = 50;

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { word: { contains: search } },
      { meaning: { contains: search } },
    ];
  }

  const [words, total] = await Promise.all([
    prisma.vocabulary.findMany({
      where,
      orderBy: [{ masteryLevel: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.vocabulary.count({ where }),
  ]);

  return NextResponse.json({ words, total, page, pageSize });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { word, pronunciation, partOfSpeech, meaning, example } = body;

    if (!word || !meaning) {
      return NextResponse.json({ error: "单词和释义为必填" }, { status: 400 });
    }

    const v = await prisma.vocabulary.create({
      data: {
        word: word.trim(),
        pronunciation: pronunciation || null,
        partOfSpeech: partOfSpeech || null,
        meaning: meaning.trim(),
        example: example || null,
      },
    });

    return NextResponse.json({ success: true, id: v.id }, { status: 201 });
  } catch (err) {
    console.error("添加单词失败:", err);
    return NextResponse.json({ error: "添加失败" }, { status: 500 });
  }
}
