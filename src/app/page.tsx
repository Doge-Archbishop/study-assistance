/**
 * 仪表盘页面（服务端组件）
 *
 * 并行加载四项统计数据：
 *   待复习错题 | 待复习单词 | 知识点总数 | 笔记总数
 * 然后将数据传给客户端 DashboardClient 渲染。
 *
 * dynamic = "force-dynamic" 确保每次请求都实时查询，不缓存。
 */
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { DashboardClient } from "@/components/dashboard-client";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const now = new Date();
  const [dueQuestions, dueVocab, totalPoints, totalNotes] = await Promise.all([
    prisma.wrongQuestion.count({
      where: { sm2NextReviewDate: { lte: now } },
    }),
    prisma.vocabulary.count({
      where: { sm2NextReviewDate: { lte: now } },
    }),
    prisma.knowledgePoint.count(),
    prisma.note.count(),
  ]);

  const subjectStats = await prisma.wrongQuestion.groupBy({
    by: ["subject"],
    _count: { id: true },
    where: { subject: { not: null } },
  });

  const stats = {
    dueQuestions,
    dueVocab,
    totalPoints,
    totalNotes,
    subjectStats: subjectStats.map((s) => ({
      subject: s.subject ?? "",
      count: s._count.id,
    })),
  };

  return <DashboardClient stats={stats} />;
}
