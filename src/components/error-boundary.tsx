/**
 * 全局 Error Boundary —— 捕获渲染错误，防止全应用白屏
 */
"use client";

import { Component, type ReactNode } from "react";
import { LucideIcon } from "@/components/lucide-icon";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("ErrorBoundary caught:", error.message, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div style={s.wrapper}>
          <LucideIcon name="alert-triangle" size={48} color="var(--red)" />
          <h2 style={s.title}>页面出错了</h2>
          <p style={s.message}>
            {this.state.error?.message || "未知错误"}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            style={s.button}
          >
            重新加载
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const s: Record<string, React.CSSProperties> = {
  wrapper: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 40,
    color: "var(--text)",
  },
  title: {
    margin: 0,
    fontSize: 20,
    fontWeight: 700,
  },
  message: {
    margin: 0,
    fontSize: 14,
    color: "var(--text-secondary)",
    textAlign: "center",
    maxWidth: 400,
  },
  button: {
    marginTop: 12,
    padding: "10px 24px",
    borderRadius: 10,
    border: "none",
    background: "var(--accent)",
    color: "#121212",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "var(--font-sans)",
  },
};
