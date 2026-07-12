/**
 * 知识图谱 Canvas 渲染器
 * 力导向布局 + 缩放/平移 + 拖拽 + 选中
 */
"use client";

import { useRef, useEffect, useCallback, useState, useImperativeHandle, forwardRef } from "react";

// ── 类型 ──
export interface GraphNode {
  id: string;
  name: string;
  subject: string;
  level: string;
  masteryLevel: number;
  wrongQuestionCount: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export interface GraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  label: string;
  type: string;
  weight: number;
}

interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export interface GraphHandle {
  resetLayout: () => void;
  getSelectedId: () => string | null;
}

interface Props {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onSelectNode?: (id: string | null) => void;
  onDropNode?: (id: string, x: number, y: number) => void;
  onCreateRelation?: (sourceId: string, targetId: string) => void;
  relationMode?: boolean;
  relationSourceId?: string | null;
  onRelationCreated?: () => void;
  subjectFilter?: string;
}

const SUBJECT_COLORS: Record<string, string> = {
  biology: "#51cf66",
  chemistry: "#4dabf7",
  english: "#ffd43b",
  chinese: "#ff6b6b",
};

const LEVEL_RADII: Record<string, number> = {
  chapter: 26,
  section: 18,
  topic: 13,
  detail: 8,
};

function masteryColor(level: number, base: string): string {
  if (level >= 80) return base;
  if (level >= 50) return "#ffd43b";
  if (level >= 20) return "#ff922b";
  return "#ff6b6b";
}

const KnowledgeGraphCanvas = forwardRef<GraphHandle, Props>(function KnowledgeGraphCanvas(
  { nodes, edges, onSelectNode, onDropNode, onCreateRelation, relationMode, relationSourceId, onRelationCreated, subjectFilter },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<GraphNode[]>(nodes);
  const edgesRef = useRef<GraphEdge[]>(edges);
  const camera = useRef<Camera>({ x: 0, y: 0, zoom: 0.8 });
  const selectedId = useRef<string | null>(null);
  const hoveredId = useRef<string | null>(null);
  const animFrame = useRef(0);

  // 拖拽状态
  const drag = useRef<{ type: "node" | "pan"; nodeId?: string; sx: number; sy: number; nx: number; ny: number } | null>(null);

  // 同步 props
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { edgesRef.current = edges; }, [edges]);

  // ── 坐标变换 ──
  const toScreen = useCallback((wx: number, wy: number) => {
    const c = camera.current;
    const cw = canvasRef.current?.offsetWidth ?? 800;
    const ch = canvasRef.current?.offsetHeight ?? 600;
    return { x: (wx - c.x) * c.zoom + cw / 2, y: (wy - c.y) * c.zoom + ch / 2 };
  }, []);

  const toWorld = useCallback((sx: number, sy: number) => {
    const c = camera.current;
    const cw = canvasRef.current?.offsetWidth ?? 800;
    const ch = canvasRef.current?.offsetHeight ?? 600;
    return { x: (sx - cw / 2) / c.zoom + c.x, y: (sy - ch / 2) / c.zoom + c.y };
  }, []);

  // ── 力导向模拟 ──
  const simulate = useCallback(() => {
    const ns = nodesRef.current;
    const es = edgesRef.current;
    const cw = canvasRef.current?.offsetWidth ?? 800;
    const ch = canvasRef.current?.offsetHeight ?? 600;
    const cx = cw / 2 / camera.current.zoom + camera.current.x;
    const cy = ch / 2 / camera.current.zoom + camera.current.y;

    // 斥力
    for (let i = 0; i < ns.length; i++) {
      for (let j = i + 1; j < ns.length; j++) {
        const dx = ns[j].x - ns[i].x;
        const dy = ns[j].y - ns[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const minDist = ns[i].radius + ns[j].radius + 40;
        if (dist < minDist * 3) {
          const force = 600 / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          ns[i].vx -= fx; ns[i].vy -= fy;
          ns[j].vx += fx; ns[j].vy += fy;
        }
      }
    }

    // 边引力
    for (const e of es) {
      const s = ns.find((n) => n.id === e.sourceId);
      const t = ns.find((n) => n.id === e.targetId);
      if (!s || !t) continue;
      const dx = t.x - s.x;
      const dy = t.y - s.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const rest = (s.radius + t.radius + 60) * (1 + e.weight);
      const force = (dist - rest) * 0.003 * e.weight;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      s.vx += fx; s.vy += fy;
      t.vx -= fx; t.vy -= fy;
    }

    // 中心引力
    for (const n of ns) {
      n.vx += (cx - n.x) * 0.0005;
      n.vy += (cy - n.y) * 0.0005;
    }

    // 更新 + 阻尼
    for (const n of ns) {
      if (drag.current?.type === "node" && drag.current.nodeId === n.id) continue;
      n.x += n.vx;
      n.y += n.vy;
      n.vx *= 0.8;
      n.vy *= 0.8;
    }
  }, []);

  // ── 渲染 ──
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // 背景
    ctx.fillStyle = "#0a0a0f";
    ctx.fillRect(0, 0, w, h);

    // 网格
    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    ctx.lineWidth = 1;
    const gridSize = 80 * camera.current.zoom;
    const ox = (camera.current.x * camera.current.zoom - w / 2) % gridSize;
    const oy = (camera.current.y * camera.current.zoom - h / 2) % gridSize;
    for (let x = ox; x < w; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = oy; y < h; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    const ns = nodesRef.current;
    const es = edgesRef.current;
    const selId = selectedId.current;
    const hovId = hoveredId.current;
    const relSrcId = relationSourceId;

    // ── 边 ──
    for (const e of es) {
      const s = ns.find((n) => n.id === e.sourceId);
      const t = ns.find((n) => n.id === e.targetId);
      if (!s || !t) continue;

      // 科目筛选：边两端都不在筛选范围内则淡化
      const filtered = subjectFilter && s.subject !== subjectFilter && t.subject !== subjectFilter;
      const highlighted = selId === s.id || selId === t.id || hovId === s.id || hovId === t.id;
      const alpha = filtered ? 0.05 : highlighted ? 0.7 : 0.12 + e.weight * 0.12;

      const sp = toScreen(s.x, s.y);
      const tp = toScreen(t.x, t.y);

      // 边线（沿方向做微小缩进，不画进圆内）
      const dx = tp.x - sp.x;
      const dy = tp.y - sp.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const sr = s.radius * camera.current.zoom + 2;
      const tr = t.radius * camera.current.zoom + 2;
      const sx = sp.x + (dx / dist) * sr;
      const sy = sp.y + (dy / dist) * sr;
      const tx = tp.x - (dx / dist) * tr;
      const ty = tp.y - (dy / dist) * tr;

      // 箭头（小三角形）
      if (highlighted) {
        const arrowSize = 8;
        const angle = Math.atan2(ty - sy, tx - sx);
        ctx.beginPath();
        ctx.moveTo(tx - arrowSize * Math.cos(angle - 0.5), ty - arrowSize * Math.sin(angle - 0.5));
        ctx.lineTo(tx, ty);
        ctx.lineTo(tx - arrowSize * Math.cos(angle + 0.5), ty - arrowSize * Math.sin(angle + 0.5));
        ctx.fillStyle = `rgba(108,92,231,${alpha})`;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(tx, ty);
      ctx.strokeStyle = highlighted
        ? `rgba(108,92,231,${alpha})`
        : `rgba(119,119,160,${alpha})`;
      ctx.lineWidth = highlighted ? 2 : 0.6 + e.weight * 1.8;
      ctx.stroke();

      // 标签
      if (highlighted && camera.current.zoom > 0.4) {
        const mx = (sx + tx) / 2;
        const my = (sy + ty) / 2;
        ctx.fillStyle = "rgba(200,200,220,0.8)";
        ctx.font = `${Math.max(9, 10 * camera.current.zoom)}px sans-serif`;
        ctx.textAlign = "center";
        const text = e.type === "prerequisite" ? `前置:${e.label}` : e.label;
        ctx.fillText(text, mx, my - 4);
      }
    }

    // 关系模式：连线跟随鼠标
    if (relationMode && relSrcId && drag.current?.type === "node" === false && canvasRef.current) {
      const sn = ns.find((n) => n.id === relSrcId);
      if (sn) {
        const sp = toScreen(sn.x, sn.y);
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(sp.x, sp.y);
        ctx.lineTo(hovId ? toScreen(ns.find((n) => n.id === hovId)!.x, ns.find((n) => n.id === hovId)!.y).x : sp.x, hovId ? toScreen(ns.find((n) => n.id === hovId)!.x, ns.find((n) => n.id === hovId)!.y).y : sp.y);
        ctx.strokeStyle = "rgba(108,92,231,0.6)";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // ── 节点 ──
    for (const n of ns) {
      const isSel = selId === n.id;
      const isHov = hovId === n.id;
      const isRelSrc = relSrcId === n.id;
      const filtered = subjectFilter && n.subject !== subjectFilter;
      const alpha = filtered ? 0.2 : 1;
      const pos = toScreen(n.x, n.y);
      const r = n.radius * camera.current.zoom;
      const color = SUBJECT_COLORS[n.subject] || "#6c5ce7";
      const fill = masteryColor(n.masteryLevel, color);

      ctx.save();
      ctx.globalAlpha = alpha;

      // 选中光晕
      if (isSel || isRelSrc) {
        const glow = ctx.createRadialGradient(pos.x, pos.y, r, pos.x, pos.y, r + 16);
        glow.addColorStop(0, "rgba(108,92,231,0.4)");
        glow.addColorStop(1, "rgba(108,92,231,0)");
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r + 16, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();
      }

      // 圆形主体
      const grad = ctx.createRadialGradient(pos.x - r * 0.3, pos.y - r * 0.3, r * 0.1, pos.x, pos.y, r);
      grad.addColorStop(0, fill);
      grad.addColorStop(1, "rgba(0,0,0,0.4)");
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = isSel ? "#fff" : isHov ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.15)";
      ctx.lineWidth = isSel ? 2.5 : 1;
      ctx.stroke();

      // 掌握度环
      if (n.masteryLevel > 0 && !filtered) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r + 4, -Math.PI / 2, -Math.PI / 2 + (n.masteryLevel / 100) * Math.PI * 2);
        ctx.strokeStyle = "rgba(255,255,255,0.3)";
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }

      // 错题数量指示（小点）
      if (n.wrongQuestionCount > 0 && !filtered && r > 10) {
        ctx.beginPath();
        ctx.arc(pos.x + r * 0.7, pos.y - r * 0.7, Math.min(4, r * 0.3), 0, Math.PI * 2);
        ctx.fillStyle = "#ff6b6b";
        ctx.fill();
        ctx.font = `${Math.max(8, 9 * camera.current.zoom)}px sans-serif`;
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        if (n.wrongQuestionCount < 100) ctx.fillText(String(n.wrongQuestionCount), pos.x + r * 0.7, pos.y - r * 0.7 + 3);
      }

      // 标签
      ctx.fillStyle = isSel ? "#fff" : "rgba(220,220,240,0.9)";
      ctx.font = `${isSel ? "600 " : ""}${Math.max(10, isSel ? 13 : 11)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(n.name, pos.x, pos.y - r - 8);

      ctx.restore();
    }

    // 关系模式提示
    if (relationMode) {
      ctx.fillStyle = "rgba(108,92,231,0.9)";
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(relSrcId ? "点击目标节点完成连线" : "点击一个节点作为关系起点", w / 2, 36);
    }
  }, [edges, toScreen, subjectFilter, relationMode, relationSourceId]);

  // ── 动画循环 ──
  useEffect(() => {
    let running = true;
    let frameCount = 0;
    const loop = () => {
      if (!running) return;
      frameCount++;
      if (frameCount % 2 === 0) simulate(); // 每两帧模拟一次
      draw();
      animFrame.current = requestAnimationFrame(loop);
    };
    loop();
    return () => { running = false; cancelAnimationFrame(animFrame.current); };
  }, [simulate, draw]);

  // ── 命中检测 ──
  const hitTest = useCallback((sx: number, sy: number) => {
    const wp = toWorld(sx, sy);
    const ns = nodesRef.current;
    // 反序查找（上层节点先命中）
    for (let i = ns.length - 1; i >= 0; i--) {
      const n = ns[i];
      const dx = wp.x - n.x;
      const dy = wp.y - n.y;
      if (Math.sqrt(dx * dx + dy * dy) < n.radius + 6 / camera.current.zoom) {
        return n;
      }
    }
    return null;
  }, [toWorld]);

  // ── 鼠标事件 ──
  const getPos = (e: React.MouseEvent | React.Touch) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const pos = getPos(e);
    const node = hitTest(pos.x, pos.y);

    // 中键 = 平移
    if (e.button === 1) {
      drag.current = { type: "pan", sx: pos.x, sy: pos.y, nx: camera.current.x, ny: camera.current.y };
      return;
    }

    // 关系模式
    if (relationMode && e.button === 0) {
      if (node) {
        if (!relationSourceId) {
          onSelectNode?.(node.id);
        } else if (node.id !== relationSourceId && onCreateRelation) {
          onCreateRelation(relationSourceId, node.id);
          onRelationCreated?.();
        }
      }
      return;
    }

    // 左键选择/拖拽
    if (e.button === 0) {
      if (node) {
        drag.current = { type: "node", nodeId: node.id, sx: pos.x, sy: pos.y, nx: node.x, ny: node.y };
        selectedId.current = node.id;
        onSelectNode?.(node.id);
      } else {
        // 空白处：取消选中，开始平移
        selectedId.current = null;
        onSelectNode?.(null);
        drag.current = { type: "pan", sx: pos.x, sy: pos.y, nx: camera.current.x, ny: camera.current.y };
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const pos = getPos(e);

    // hover 检测
    const node = hitTest(pos.x, pos.y);
    hoveredId.current = node?.id ?? null;
    if (canvasRef.current) {
      canvasRef.current.style.cursor = node
        ? relationMode && relationSourceId && node.id !== relationSourceId
          ? "pointer"
          : "grab"
        : drag.current
          ? "grabbing"
          : relationMode
            ? "crosshair"
            : "default";
    }

    if (!drag.current) return;

    if (drag.current.type === "node") {
      const n = nodesRef.current.find((n) => n.id === drag.current!.nodeId);
      if (n) {
        const wp = toWorld(pos.x, pos.y);
        const origWp = toWorld(drag.current.sx, drag.current.sy);
        n.x = drag.current.nx + (wp.x - origWp.x);
        n.y = drag.current.ny + (wp.y - origWp.y);
      }
    } else if (drag.current.type === "pan") {
      camera.current.x = drag.current.nx - (pos.x - drag.current.sx) / camera.current.zoom;
      camera.current.y = drag.current.ny - (pos.y - drag.current.sy) / camera.current.zoom;
    }
  };

  const handleMouseUp = () => {
    if (drag.current?.type === "node") {
      const n = nodesRef.current.find((n) => n.id === drag.current!.nodeId);
      if (n && onDropNode) onDropNode(n.id, n.x, n.y);
    }
    drag.current = null;
  };

  // ── 滚轮缩放 ──
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.15, Math.min(3, camera.current.zoom * factor));

    // 以鼠标位置为中心缩放
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const wp = toWorld(mx, my);

    camera.current.zoom = newZoom;
    const newWp = toWorld(mx, my);
    camera.current.x += wp.x - newWp.x;
    camera.current.y += wp.y - newWp.y;
  }, [toWorld]);

  // ── 触摸支持 ──
  const touchStartDist = useRef(0);
  const touchStartZoom = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchStartDist.current = Math.sqrt(dx * dx + dy * dy);
      touchStartZoom.current = camera.current.zoom;
      drag.current = null;
      return;
    }
    if (e.touches.length === 1) {
      const pos = getPos(e.touches[0]);
      const node = hitTest(pos.x, pos.y);
      if (node) {
        drag.current = { type: "node", nodeId: node.id, sx: pos.x, sy: pos.y, nx: node.x, ny: node.y };
        selectedId.current = node.id;
        onSelectNode?.(node.id);
      } else {
        drag.current = { type: "pan", sx: pos.x, sy: pos.y, nx: camera.current.x, ny: camera.current.y };
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (touchStartDist.current > 0) {
        camera.current.zoom = Math.max(0.15, Math.min(3, touchStartZoom.current * (dist / touchStartDist.current)));
      }
      return;
    }
    if (!drag.current || e.touches.length !== 1) return;
    const pos = getPos(e.touches[0]);

    if (drag.current.type === "node") {
      const n = nodesRef.current.find((n) => n.id === drag.current!.nodeId);
      if (n) {
        const wp = toWorld(pos.x, pos.y);
        const origWp = toWorld(drag.current.sx, drag.current.sy);
        n.x = drag.current.nx + (wp.x - origWp.x);
        n.y = drag.current.ny + (wp.y - origWp.y);
      }
    } else if (drag.current.type === "pan") {
      camera.current.x = drag.current.nx - (pos.x - drag.current.sx) / camera.current.zoom;
      camera.current.y = drag.current.ny - (pos.y - drag.current.sy) / camera.current.zoom;
    }
  };

  const handleTouchEnd = () => {
    if (drag.current?.type === "node") {
      const n = nodesRef.current.find((n) => n.id === drag.current!.nodeId);
      if (n && onDropNode) onDropNode(n.id, n.x, n.y);
    }
    drag.current = null;
    touchStartDist.current = 0;
  };

  // ── 暴露方法 ──
  useImperativeHandle(ref, () => ({
    resetLayout: () => {
      const ns = nodesRef.current;
      ns.forEach((n) => {
        n.x = (Math.random() - 0.5) * 400;
        n.y = (Math.random() - 0.5) * 300;
        n.vx = 0; n.vy = 0;
      });
      camera.current = { x: 0, y: 0, zoom: 0.8 };
    },
    getSelectedId: () => selectedId.current,
  }));

  return (
    <canvas
      ref={canvasRef}
      style={{ display: "block", width: "100%", height: "100%", touchAction: "none" }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onContextMenu={(e) => e.preventDefault()}
    />
  );
});

export default KnowledgeGraphCanvas;
