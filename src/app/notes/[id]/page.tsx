/**
 * 编辑笔记页面
 * 服务端直查数据库，客户端渲染编辑器
 */
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import NoteEditor from "@/components/note-editor";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditNotePage({ params }: Props) {
  const { id } = await params;

  const note = await prisma.note.findUnique({
    where: { id },
    include: {
      knowledgePoints: {
        include: { knowledgePoint: true },
      },
    },
  });

  if (!note) {
    notFound();
  }

  const initial = {
    id: note.id,
    title: note.title,
    content: note.content,
    subject: note.subject,
    isPinned: note.isPinned,
    images: note.images as string | null,
    knowledgePoints: note.knowledgePoints as { knowledgePoint: { id: string; name: string; subject: string; level: string } }[],
  };

  return <NoteEditor initial={initial} />;
}
