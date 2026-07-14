/**
 * POST /api/vocabulary/batch → 批量导入单词
 * 支持格式
 *   行模式: 每行 "word  meaning" 或 "word, meaning"
 *   JSON模式: [{word, meaning, ...}, ...]
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items, raw } = body;

    let words: { word: string; pronunciation?: string; partOfSpeech?: string; meaning: string; example?: string }[] = [];

    if (Array.isArray(items)) {
      words = items;
    } else if (raw) {
      // 逐行解析: "word - meaning" 或 "word\tmeaning" 或 "word,meaning"
      const lines = raw.split("\n").filter((l: string) => l.trim());
      for (const line of lines) {
        const match = line.match(/^(.+?)[\t,，\s-]+(.+)$/);
        if (match) {
          words.push({ word: match[1].trim(), meaning: match[2].trim() });
        }
      }
    }

    if (words.length === 0) {
      return NextResponse.json({ error: "未解析到有效单词" }, { status: 400 });
    }

    // 去重：批量查出现有单词
    const wordList = [...new Set(words.map((w) => w.word?.trim()).filter(Boolean))];
    const existing = await prisma.vocabulary.findMany({
      where: { word: { in: wordList } },
      select: { word: true },
    });
    const existingSet = new Set(existing.map((e) => e.word));

    // 筛选出新单词
    const toCreate = words.filter((w) => {
      if (!w.word || !w.meaning) return false;
      return !existingSet.has(w.word.trim());
    });

    if (toCreate.length > 0) {
      await prisma.vocabulary.createMany({
        data: toCreate.map((w) => ({
          word: w.word.trim(),
          pronunciation: w.pronunciation || null,
          partOfSpeech: w.partOfSpeech || null,
          meaning: w.meaning.trim(),
          example: w.example || null,
        })),
      });
    }

    const skipped = words.length - toCreate.length;

    return NextResponse.json({ success: true, created: toCreate.length, skipped });
  } catch (err) {
    console.error("批量导入失败:", err);
    return NextResponse.json({ error: "导入失败" }, { status: 500 });
  }
}
