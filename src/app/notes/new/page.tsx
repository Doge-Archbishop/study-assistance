/**
 * 新建笔记页面
 * 复用 NoteEditor 组件，无 initial 数据
 */
import NoteEditor from "@/components/note-editor";

export const dynamic = "force-dynamic";

export default function NewNotePage() {
  return <NoteEditor />;
}
