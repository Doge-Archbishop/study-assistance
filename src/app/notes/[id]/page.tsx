/**
 * 编辑笔记页面 —— 服务端直查数据库，客户端渲染编辑器
 */
import { prisma } from "@/lib/prisma";
import NoteEditor from "@/components/note-editor";

export default async function EditNotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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
    return (
      <div style={{ flex: 1, textAlign: "center", padding: 60, color: "var(--text-muted)" }}>
        <p>笔记不存在或已被删除</p>
      </div>
    );
  }

  return (
    <NoteEditor
      initial={{
        id: note.id,
        title: note.title,
        content: note.content,
        subject: note.subject,
        isPinned: note.isPinned,
        images: note.images,
        knowledgePoints: note.knowledgePoints.map((k) => ({
          knowledgePoint: k.knowledgePoint,
        })),
      }}
    />
  );
}
