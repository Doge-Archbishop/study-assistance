/**
 * POST /api/review — 记录一次复习行为，更新 SM-2 状态
 * GET  /api/review?type=due — 获取今日待复习列表
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sm2 } from "@/lib/sm2";

// ---- 记录复习 ----
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { itemType, itemId, quality, timeSpent } = body as {
      itemType: "wrong_question" | "vocabulary" | "knowledge_point";
      itemId: string;
      quality: number;
      timeSpent?: number;
    };

    if (!itemType || !itemId || quality == null) {
      return NextResponse.json({ error: "缺少参数" }, { status: 400 });
    }

    // 1. 查询当前 SM-2 状态
    let currentState: {
      sm2Repetitions: number;
      sm2EaseFactor: number;
      sm2Interval: number;
    };

    if (itemType === "wrong_question") {
      const item = await prisma.wrongQuestion.findUnique({
        where: { id: itemId },
      });
      if (!item) return NextResponse.json({ error: "错题不存在" }, { status: 404 });
      currentState = {
        sm2Repetitions: item.sm2Repetitions,
        sm2EaseFactor: item.sm2EaseFactor,
        sm2Interval: item.sm2Interval,
      };
    } else if (itemType === "vocabulary") {
      const item = await prisma.vocabulary.findUnique({
        where: { id: itemId },
      });
      if (!item) return NextResponse.json({ error: "单词不存在" }, { status: 404 });
      currentState = {
        sm2Repetitions: item.sm2Repetitions,
        sm2EaseFactor: item.sm2EaseFactor,
        sm2Interval: item.sm2Interval,
      };
    } else {
      // knowledge_point: 仅记录复习日志，不做 SM-2
      await prisma.reviewLog.create({
        data: { itemType, knowledgePointId: itemId, quality, timeSpent },
      });
      await prisma.knowledgePoint.update({
        where: { id: itemId },
        data: { totalReviews: { increment: 1 }, lastReviewedAt: new Date() },
      });
      return NextResponse.json({ success: true });
    }

    // 2. 计算新的 SM-2 状态
    const next = sm2(
      quality,
      currentState.sm2Repetitions,
      currentState.sm2EaseFactor,
      currentState.sm2Interval,
    );

    // 3. 更新 + 记录日志
    if (itemType === "wrong_question") {
      await prisma.wrongQuestion.update({
        where: { id: itemId },
        data: {
          sm2Repetitions: next.repetitions,
          sm2EaseFactor: next.easeFactor,
          sm2Interval: next.interval,
          sm2NextReviewDate: next.nextReviewDate,
          reviewCount: { increment: 1 },
          lastReviewDate: new Date(),
        },
      });
      await prisma.reviewLog.create({
        data: { itemType, wrongQuestionId: itemId, quality, timeSpent },
      });
    } else {
      await prisma.vocabulary.update({
        where: { id: itemId },
        data: {
          sm2Repetitions: next.repetitions,
          sm2EaseFactor: next.easeFactor,
          sm2Interval: next.interval,
          sm2NextReviewDate: next.nextReviewDate,
          reviewCount: { increment: 1 },
          lastReviewDate: new Date(),
        },
      });
      await prisma.reviewLog.create({
        data: { itemType, vocabularyId: itemId, quality, timeSpent },
      });
    }

    return NextResponse.json({ success: true, next });
  } catch (err) {
    console.error("复习记录失败:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "服务器错误" },
      { status: 500 },
    );
  }
}

// ---- 获取今日待复习 ----
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode") || "due";
  const now = new Date();

  if (mode === "due") {
    const [questions, vocabularies] = await Promise.all([
      prisma.wrongQuestion.findMany({
        where: { sm2NextReviewDate: { lte: now } },
        include: { knowledgePoints: { include: { knowledgePoint: true } } },
        orderBy: { sm2NextReviewDate: "asc" },
      }),
      prisma.vocabulary.findMany({
        where: { sm2NextReviewDate: { lte: now } },
        orderBy: { sm2NextReviewDate: "asc" },
      }),
    ]);

    return NextResponse.json({
      questions: questions.map((q) => ({
        id: q.id,
        subject: q.subject,
        questionText: q.questionText,
        images: JSON.parse(q.images),
        difficulty: q.difficulty,
        knowledgePoints: q.knowledgePoints.map((k) => k.knowledgePoint.name),
        sm2: {
          repetitions: q.sm2Repetitions,
          easeFactor: q.sm2EaseFactor,
          interval: q.sm2Interval,
          nextReviewDate: q.sm2NextReviewDate,
        },
        reviewCount: q.reviewCount,
        masteryLevel: q.masteryLevel,
      })),
      vocabularies: vocabularies.map((v) => ({
        id: v.id,
        word: v.word,
        meaning: v.meaning,
        pronunciation: v.pronunciation,
        sm2: {
          repetitions: v.sm2Repetitions,
          easeFactor: v.sm2EaseFactor,
          interval: v.sm2Interval,
          nextReviewDate: v.sm2NextReviewDate,
        },
      })),
    });
  }

  return NextResponse.json({ error: "未知模式" }, { status: 400 });
}
