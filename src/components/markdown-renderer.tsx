/**
 * Markdown 渲染器 —— 支持 KaTeX 数学公式 + mhchem 化学方程式
 */
"use client";

import { useMemo } from "react";
import { marked, type Token, type Tokens } from "marked";
import katex from "katex";

interface Props {
  content: string;
}

/** 自定义渲染器：拦截行内/块级公式 + 化学式 */
function renderMarkdown(raw: string): string {
  let source = raw;

  // 1. 提取并保护块级公式 $$...$$
  const blocks: string[] = [];
  source = source.replace(/\$\$([\s\S]*?)\$\$/g, (_, formula: string) => {
    try {
      blocks.push(
        katex.renderToString(formula.trim(), {
          displayMode: true,
          throwOnError: false,
          trust: true,
        }),
      );
    } catch {
      blocks.push(`<code>${formula}</code>`);
    }
    return `%%BLOCK_${blocks.length - 1}%%`;
  });

  // 2. 提取并保护行内公式 $...$
  const inlines: string[] = [];
  source = source.replace(/\$(.*?)\$/g, (_, formula: string) => {
    try {
      inlines.push(
        katex.renderToString(formula.trim(), {
          displayMode: false,
          throwOnError: false,
          trust: true,
        }),
      );
    } catch {
      inlines.push(`<code>${formula}</code>`);
    }
    return `%%INLINE_${inlines.length - 1}%%`;
  });

  // 3. Markdown → HTML
  const html = marked.parse(source, { async: false }) as string;

  // 4. 还原公式占位
  let result = html;
  blocks.forEach((b, i) => {
    result = result.replace(`%%BLOCK_${i}%%`, b);
  });
  inlines.forEach((b, i) => {
    result = result.replace(`%%INLINE_${i}%%`, b);
  });

  return result;
}

export default function MarkdownRenderer({ content }: Props) {
  const html = useMemo(() => renderMarkdown(content), [content]);

  return (
    <div
      className="markdown-body"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
