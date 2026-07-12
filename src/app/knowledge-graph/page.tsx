/**
 * 知识图谱页面
 * Canvas 力导向图 + 工具栏 + 详情面板 + 节点/关系管理
 */
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import KnowledgeGraphCanvas, { type GraphNode, type GraphEdge, type GraphHandle } from "@/components/canvas/knowledge-graph";

interface KPDetail {
  id: string;
  name: string;
  description: string | null;
  subject: string;
  level: string;
  masteryLevel: number;
  wrongQuestionCount: number;
  customNote: string | null;
  notes: { note: { id: string; title: string } }[];
  wrongQuestions: { wrongQuestion: { id: string } }[];
  sourceRelations: { id: string; targetId: string; target: { id: string; name: string }; label: string }[];
  targetRelations: { id: string; sourceId: string; source: { id: string; name: string }; label: string }[];
}

const SUBJECTS = [
  { key: "", label: "全部" },
  { key: "biology", label: "生物" },
  { key: "chemistry", label: "化学" },
  { key: "english", label: "英语" },
  { key: "chinese", label: "语文" },
];

const SUBJECT_COLORS: Record<string, string> = {
  biology: "#51cf66", chemistry: "#4dabf7", english: "#ffd43b", chinese: "#ff6b6b",
};

export default function KnowledgeGraphPage() {
  const graphRef = useRef<GraphHandle>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<KPDetail | null>(null);
  const [subjectFilter, setSubjectFilter] = useState("");
  const [relationMode, setRelationMode] = useState(false);
  const [relationSourceId, setRelationSourceId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSubject, setNewSubject] = useState("biology");
  const [newLevel, setNewLevel] = useState("topic");

  const loadData = useCallback(async () => {
    const [ptsRes, relRes] = await Promise.all([
      fetch("/api/knowledge-points"), fetch("/api/knowledge-relations"),
    ]);
    const pts = await ptsRes.json();
    const rels = await relRes.json();
    setNodes(pts.map((p: Record<string,unknown>) => ({
      id: p.id, name: p.name, subject: p.subject, level: p.level,
      masteryLevel: p.masteryLevel as number, wrongQuestionCount: p.wrongQuestionCount as number,
      x: (p.positionX as number) !== 0 ? (p.positionX as number) : (Math.random()-0.5)*400,
      y: (p.positionY as number) !== 0 ? (p.positionY as number) : (Math.random()-0.5)*300,
      vx: 0, vy: 0,
      radius: (p.level as string)==="chapter"?26:(p.level as string)==="section"?18:(p.level as string)==="topic"?13:8,
    })));
    setEdges(rels.map((r: Record<string,unknown>) => ({
      id: r.id, sourceId: r.sourceId, targetId: r.targetId,
      label: r.label as string, type: r.type as string, weight: r.weight as number,
    })));
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSelectNode = useCallback(async (id: string|null) => {
    setSelectedId(id);
    if (!id) { setDetail(null); return; }
    if (relationMode && !relationSourceId) { setRelationSourceId(id); return; }
    try {
      const res = await fetch(`/api/knowledge-points/${id}`);
      if (!res.ok) { setDetail(null); return; }
      const raw = await res.json();
      setDetail({
        id:raw.id, name:raw.name, description:raw.description,
        subject:raw.subject, level:raw.level, masteryLevel:raw.masteryLevel,
        wrongQuestionCount:raw.wrongQuestionCount, customNote:raw.customNote,
        notes:raw.notes||[], wrongQuestions:raw.wrongQuestions||[],
        sourceRelations:raw.sourceRelations||[], targetRelations:raw.targetRelations||[],
      });
    } catch { setDetail(null); }
  }, [relationMode, relationSourceId]);

  const handleDropNode = useCallback(async (id: string, x: number, y: number) => {
    await fetch(`/api/knowledge-points/${id}`, { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify({positionX:Math.round(x), positionY:Math.round(y)}) });
  }, []);

  const handleCreateRelation = useCallback(async (sourceId: string, targetId: string) => {
    await fetch("/api/knowledge-relations", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({sourceId, targetId, label:"关联", type:"related", weight:0.5}) });
    await loadData();
    setRelationMode(false); setRelationSourceId(null);
  }, [loadData]);

  const handleDeleteRelation = useCallback(async (relId: string) => {
    await fetch(`/api/knowledge-relations/${relId}`, { method:"DELETE" });
    await loadData();
  }, [loadData]);

  const handleAddNode = useCallback(async () => {
    if (!newName.trim()) return;
    await fetch("/api/knowledge-points", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({name:newName.trim(), subject:newSubject, level:newLevel}) });
    setNewName(""); setShowAddForm(false);
    await loadData();
  }, [newName, newSubject, newLevel, loadData]);

  const handleReset = () => graphRef.current?.resetLayout();
  const toggleRelationMode = () => {
    if (relationMode) { setRelationMode(false); setRelationSourceId(null); }
    else { setRelationMode(true); setRelationSourceId(null); setSelectedId(null); }
  };

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", height:"100%", position:"relative" }}>
      {/* 工具栏 */}
      <div style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 12px", borderBottom:"1px solid var(--border)", flexShrink:0, flexWrap:"wrap", background:"rgba(10,10,15,0.95)", zIndex:20 }}>
        <Link href="/" style={{ color:"var(--accent)", textDecoration:"none", fontSize:13, marginRight:4 }}>←</Link>
        <span style={{ fontSize:14, fontWeight:700, marginRight:8 }}>知识图谱</span>
        {SUBJECTS.map((s) => (
          <button key={s.key} onClick={() => setSubjectFilter(s.key)}
            style={{ padding:"3px 10px", borderRadius:16, border:"1px solid var(--border)", background:subjectFilter===s.key?`${SUBJECT_COLORS[s.key]||"var(--accent)"}20`:"transparent", color:subjectFilter===s.key?(SUBJECT_COLORS[s.key]||"var(--accent)"):"var(--text-muted)", fontSize:11, cursor:"pointer", fontWeight:subjectFilter===s.key?600:400 }}>
            {s.label}
          </button>
        ))}
        <div style={{ width:1, height:18, background:"var(--border)", margin:"0 4px" }} />
        <button onClick={() => setShowAddForm(!showAddForm)} style={{ padding:"4px 10px", borderRadius:6, border:"1px solid var(--border)", background:"transparent", color:"var(--text-muted)", fontSize:11, cursor:"pointer" }}>+ 节点</button>
        <button onClick={toggleRelationMode} style={{ padding:"4px 10px", borderRadius:6, border:"1px solid var(--border)", background:relationMode?"rgba(108,92,231,0.2)":"transparent", color:relationMode?"var(--accent)":"var(--text-muted)", fontSize:11, cursor:"pointer" }}>🔗 连线</button>
        <button onClick={handleReset} style={{ padding:"4px 10px", borderRadius:6, border:"1px solid var(--border)", background:"transparent", color:"var(--text-muted)", fontSize:11, cursor:"pointer" }}>重置布局</button>
        {relationMode && <span style={{ fontSize:11, color:"var(--accent)", marginLeft:4 }}>{relationSourceId?"点击另一个节点完成连线":"点击起点节点"}</span>}
      </div>

      {/* 新建节点浮层 */}
      {showAddForm && (
        <div style={{ position:"absolute", top:50, left:12, zIndex:30, background:"var(--surface)", border:"1px solid var(--border)", borderRadius:12, padding:16, width:240, boxShadow:"0 8px 32px rgba(0,0,0,0.4)" }}>
          <h3 style={{ margin:"0 0 12px", fontSize:14 }}>新建知识点</h3>
          <input type="text" placeholder="知识点名称" value={newName} onChange={(e)=>setNewName(e.target.value)} style={inputStyle} />
          <select value={newSubject} onChange={(e)=>setNewSubject(e.target.value)} style={{ ...inputStyle, marginBottom:8 }}>
            {SUBJECTS.filter(s=>s.key).map(s=><option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <select value={newLevel} onChange={(e)=>setNewLevel(e.target.value)} style={{ ...inputStyle, marginBottom:12 }}>
            <option value="chapter">章节</option><option value="section">小节</option><option value="topic">考点</option><option value="detail">细节</option>
          </select>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={handleAddNode} style={{ flex:1, padding:"8px 0", borderRadius:6, border:"none", background:"var(--accent)", color:"#fff", fontSize:13, cursor:"pointer" }}>创建</button>
            <button onClick={()=>setShowAddForm(false)} style={{ flex:1, padding:"8px 0", borderRadius:6, border:"1px solid var(--border)", background:"transparent", color:"var(--text-muted)", fontSize:13, cursor:"pointer" }}>取消</button>
          </div>
        </div>
      )}

      {/* Canvas */}
      <div style={{ flex:1, position:"relative", overflow:"hidden" }}>
        {loading ? (
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", color:"var(--text-muted)" }}>加载中...</div>
        ) : nodes.length===0 ? (
          <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:12 }}>
            <p style={{ color:"var(--text-muted)", margin:0 }}>还没有知识点数据</p>
            <p style={{ color:"var(--text-muted)", fontSize:13, margin:0 }}>上传错题后 AI 会自动提取，或手动创建</p>
            <button onClick={()=>setShowAddForm(true)} style={{ marginTop:8, padding:"8px 16px", borderRadius:8, border:"none", background:"var(--accent)", color:"#fff", fontSize:13, cursor:"pointer" }}>创建第一个知识点</button>
          </div>
        ) : (
          <KnowledgeGraphCanvas ref={graphRef} nodes={nodes} edges={edges} onSelectNode={handleSelectNode} onDropNode={handleDropNode} onCreateRelation={handleCreateRelation} onRelationCreated={()=>{setRelationMode(false);setRelationSourceId(null);loadData();}} relationMode={relationMode} relationSourceId={relationSourceId} subjectFilter={subjectFilter} />
        )}
      </div>

      {/* 图例 */}
      <div style={{ position:"absolute", bottom:12, left:12, zIndex:10, background:"rgba(19,19,32,0.9)", borderRadius:8, border:"1px solid var(--border)", padding:"8px 12px", fontSize:10, color:"var(--text-muted)", display:"flex", gap:10 }}>
        {Object.entries(SUBJECT_COLORS).map(([subj,color])=>(
          <span key={subj} style={{ display:"flex", alignItems:"center", gap:4 }}><span style={{ width:8,height:8,borderRadius:"50%",background:color }}/>{subj==="biology"?"生物":subj==="chemistry"?"化学":subj==="english"?"英语":"语文"}</span>
        ))}
        <span style={{ display:"flex", alignItems:"center", gap:4 }}><span style={{ width:8,height:8,borderRadius:"50%",background:"#ff6b6b" }}/>薄弱</span>
      </div>

      {/* 详情面板 */}
      {detail && (
        <div style={{ position:"absolute", top:0, right:0, bottom:0, width:300, zIndex:25, background:"rgba(13,13,28,0.98)", borderLeft:"1px solid var(--border)", padding:"20px 16px", overflowY:"auto", boxShadow:"-4px 0 20px rgba(0,0,0,0.3)" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
            <h3 style={{ margin:0, fontSize:16, fontWeight:700 }}>{detail.name}</h3>
            <button onClick={()=>{setSelectedId(null);setDetail(null);}} style={{ background:"none", border:"none", color:"var(--text-muted)", cursor:"pointer", fontSize:18 }}>×</button>
          </div>

          <div style={{ marginBottom:16 }}>
            <span style={{ display:"inline-block", padding:"2px 10px", borderRadius:12, fontSize:11, background:`${SUBJECT_COLORS[detail.subject]||"var(--accent)"}20`, color:SUBJECT_COLORS[detail.subject]||"var(--accent)" }}>
              {SUBJECTS.find(s=>s.key===detail.subject)?.label} · {detail.level==="chapter"?"章节":detail.level==="section"?"小节":"考点"}
            </span>
          </div>

          <div style={{ marginBottom:20 }}>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:4 }}><span style={{ color:"var(--text-muted)" }}>掌握程度</span><span style={{ fontWeight:600 }}>{Math.round(detail.masteryLevel)}%</span></div>
            <div style={{ height:4, borderRadius:2, background:"var(--border)", overflow:"hidden" }}><div style={{ height:"100%", borderRadius:2, width:`${detail.masteryLevel}%`, background:detail.masteryLevel>=80?SUBJECT_COLORS[detail.subject]:detail.masteryLevel>=50?"#ffd43b":detail.masteryLevel>=20?"#ff922b":"#ff6b6b" }}/></div>
          </div>

          <p style={{ fontSize:13, color:"var(--text-muted)", margin:"0 0 20px" }}>关联错题：{detail.wrongQuestionCount} 道</p>

          {detail.description && (
            <div style={{ marginBottom:20 }}><h4 style={{ fontSize:12, fontWeight:600, color:"var(--text-muted)", margin:"0 0 6px" }}>知识点解释</h4><p style={{ fontSize:13, lineHeight:1.7, margin:0, color:"var(--text)" }}>{detail.description}</p></div>
          )}

          {detail.customNote && (
            <div style={{ marginBottom:20, padding:10, borderRadius:8, background:"rgba(108,92,231,0.08)", border:"1px solid var(--border)" }}><h4 style={{ fontSize:12, fontWeight:600, color:"var(--accent)", margin:"0 0 4px" }}>📝 你的理解</h4><p style={{ fontSize:13, margin:0, color:"var(--text)" }}>{detail.customNote}</p></div>
          )}

          {(detail.sourceRelations.length>0 || detail.targetRelations.length>0) && (
            <div style={{ marginBottom:20 }}>
              <h4 style={{ fontSize:12, fontWeight:600, color:"var(--text-muted)", margin:"0 0 8px" }}>关联的知识点</h4>
              {/* targetRelations: 别人 → 我（incoming: source → this） */}
              {detail.targetRelations.map((r)=>(
                <div key={r.id} style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4, fontSize:12 }}>
                  <span style={{ color:"var(--text-muted)" }}>←</span>
                  <span style={{ color:"var(--text)", flex:1 }}>{r.source.name}</span>
                  <span style={{ color:"var(--text-muted)", fontSize:10 }}>{r.label}</span>
                  <button onClick={()=>handleDeleteRelation(r.id)} style={{ background:"none",border:"none",color:"var(--text-muted)",cursor:"pointer",fontSize:12,opacity:0.3 }}>×</button>
                </div>
              ))}
              {/* sourceRelations: 我 → 别人（outgoing: this → target） */}
              {detail.sourceRelations.map((r)=>(
                <div key={r.id} style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4, fontSize:12 }}>
                  <span style={{ color:"var(--accent)" }}>→</span>
                  <span style={{ color:"var(--text)", flex:1 }}>{r.target.name}</span>
                  <span style={{ color:"var(--text-muted)", fontSize:10 }}>{r.label}</span>
                  <button onClick={()=>handleDeleteRelation(r.id)} style={{ background:"none",border:"none",color:"var(--text-muted)",cursor:"pointer",fontSize:12,opacity:0.3 }}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width:"100%", padding:8, borderRadius:6, border:"1px solid var(--border)",
  background:"var(--bg)", color:"var(--text)", fontSize:13, marginBottom:8, boxSizing:"border-box",
};
