/**
 * Canvas 手写画板 —— 嵌入笔记底部，自由绘制
 */
"use client";

import { useRef, useEffect, useState, useCallback } from "react";

interface Props {
  onSave?: (dataUrl: string) => void;
  initial?: string;
  height?: number;
}

export default function DrawingPad({ onSave, initial, height = 280 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  // 初始化画布 DPR 缩放 + 恢复已有绘图（初挂载 + initial 变化时重设）
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    // 重置变换矩阵后再设尺寸和缩放，防止 scale() 叠加
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    c.width = c.offsetWidth * dpr;
    c.height = height * dpr;
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = "#e0e0e0";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // 恢复已有绘图（onload 中异步 setState，不属于同步调用）
    if (initial) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, c.offsetWidth, height);
        ctx.drawImage(img, 0, 0, c.offsetWidth, height);
        setHasContent(true);
      };
      img.src = initial;
    }
  }, [initial, height]);

  const getPos = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const c = canvasRef.current!;
      const rect = c.getBoundingClientRect();
      const clientX =
        "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY =
        "touches" in e ? e.touches[0].clientY : e.clientY;
      return { x: clientX - rect.left, y: clientY - rect.top };
    },
    [],
  );

  const startDraw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      setIsDrawing(true);
      lastPos.current = getPos(e);
    },
    [getPos],
  );

  const draw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing || !lastPos.current) return;
      e.preventDefault();
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;
      const { x, y } = getPos(e);
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();
      lastPos.current = { x, y };
      setHasContent(true);
    },
    [isDrawing, getPos],
  );

  const stopDraw = useCallback(() => {
    setIsDrawing(false);
    lastPos.current = null;
  }, []);

  const handleClear = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, c.offsetWidth, height);
    setHasContent(false);
  }, [height]);

  const handleSave = useCallback(() => {
    const dataUrl = canvasRef.current?.toDataURL("image/png");
    if (dataUrl && onSave) onSave(dataUrl);
  }, [onSave]);

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 10,
        overflow: "hidden",
        background: "var(--surface)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 10px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
          ✍️ 手写草稿
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={handleClear}
            style={{
              fontSize: 11,
              padding: "3px 10px",
              borderRadius: 6,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text-muted)",
              cursor: "pointer",
            }}
          >
            清除
          </button>
          {onSave && (
            <button
              onClick={handleSave}
              disabled={!hasContent}
              style={{
                fontSize: 11,
                padding: "3px 10px",
                borderRadius: 6,
                border: "none",
                background: hasContent ? "var(--accent)" : "var(--border)",
                color: hasContent ? "#fff" : "var(--text-muted)",
                cursor: hasContent ? "pointer" : "default",
              }}
            >
              插入笔记
            </button>
          )}
        </div>
      </div>
      <canvas
        ref={canvasRef}
        style={{
          display: "block",
          width: "100%",
          height,
          cursor: "crosshair",
          touchAction: "none",
        }}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={stopDraw}
        onMouseLeave={stopDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={stopDraw}
      />
    </div>
  );
}
