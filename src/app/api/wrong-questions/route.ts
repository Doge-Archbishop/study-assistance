/**
 * POST /api/wrong-questions
 * 拍照上传错题 → AI 解析 → 存入数据库
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { analyzeWrongQuestionWithFallback } from "@/lib/ai";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get("image") as File | null;

    if (!imageFile) {
      return NextResponse.json({ error: "未提供图片" }, { status: 400 });
    }

    // 校验类型和大小
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(imageFile.type)) {
      return NextResponse.json(
        { error: "仅支持 JPG/PNG/WebP 格式" },
        { status: 400 },
      );
    }
    const MAX_SIZE = 4 * 1024 * 1024; // 4MB（Vercel 免费版限制 4.5MB）
    if (imageFile.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "图片大小不能超过 10MB" },
        { status: 400 },
      );
    }

    // 1. 图片转 base64
    const buffer = Buffer.from(await imageFile.arrayBuffer());
    const base64 = `data:${imageFile.type};base64,${buffer.toString("base64")}`;

    // 2. AI 解析
    const result = await analyzeWrongQuestionWithFallback(base64);

    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: result.error || "AI 解析失败" },
        { status: 422 },
      );
    }

    const analysis = result.data;

    // 3. 上传图片到 R2（暂存 base64 到数据库，R2 配置好后再迁移）
    // TODO: 替换为 R2 上传 → const imageUrl = await uploadToR2(buffer, ...)
    const imageUrl = base64; // 临时：直接存 base64（仅开发阶段）

    // 4. 创建错题记录
    const question = await prisma.wrongQuestion.create({
      data: {
        images: JSON.stringify([imageUrl]),
        subject: analysis.subject,
        questionText: analysis.questionText,
        answerText: analysis.answerText,
        correctAnswer: analysis.correctAnswer,
        analysis: analysis.analysis,
        errorType: analysis.errorType,
        difficulty: analysis.difficulty,
      },
    });

    // 5. 处理知识点关联（查找已有或创建新的）
    for (const kpName of analysis.knowledgePoints) {
      let kp = await prisma.knowledgePoint.findFirst({
        where: { name: kpName, subject: analysis.subject },
      });

      if (!kp) {
        kp = await prisma.knowledgePoint.create({
          data: {
            name: kpName,
            subject: analysis.subject,
            level: "topic",
          },
        });
      }

      // 关联错题 ↔ 知识点
      await prisma.wrongQuestionKnowledgePoint.create({
        data: {
          wrongQuestionId: question.id,
          knowledgePointId: kp.id,
        },
      });

      // 更新知识点统计
      await prisma.knowledgePoint.update({
        where: { id: kp.id },
        data: {
          wrongQuestionCount: { increment: 1 },
        },
      });
    }

    return NextResponse.json({ success: true, id: question.id });
  } catch (err) {
    console.error("错题上传失败:", err);
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "服务器错误" : (err instanceof Error ? err.message : "服务器错误") },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subject = searchParams.get("subject");

    const questions = await prisma.wrongQuestion.findMany({
      where: subject ? { subject } : undefined,
      include: {
        knowledgePoints: {
          include: { knowledgePoint: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(questions);
  } catch (err) {
    console.error("获取错题列表失败:", err);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
