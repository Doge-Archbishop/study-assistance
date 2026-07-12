/**
 * AI Provider 工厂
 * 根据环境变量自动选择主力/备用模型
 */

import type { AIProvider } from "./types";
import { ZhipuProvider } from "./zhipu";
import { QwenProvider } from "./qwen";

let _primary: AIProvider | null = null;
let _fallback: AIProvider | null = null;

export function getPrimaryProvider(): AIProvider {
  if (!_primary) {
    const apiKey = process.env.ZHIPU_API_KEY;
    if (!apiKey || apiKey === "your-zhipu-api-key") {
      throw new Error("ZHIPU_API_KEY 未配置，请在 .env 中设置");
    }
    _primary = new ZhipuProvider(apiKey);
  }
  return _primary;
}

export function getFallbackProvider(): AIProvider {
  if (!_fallback) {
    const apiKey = process.env.QWEN_API_KEY;
    if (!apiKey || apiKey === "your-qwen-api-key") {
      throw new Error("QWEN_API_KEY 未配置，请在 .env 中设置");
    }
    _fallback = new QwenProvider(apiKey);
  }
  return _fallback;
}

/**
 * 分析错题图片：主力模型失败时自动 fallback
 */
export async function analyzeWrongQuestionWithFallback(
  imageBase64: string,
) {
  try {
    return await getPrimaryProvider().analyzeWrongQuestion(imageBase64);
  } catch {
    console.warn("主力模型失败，切换到备用模型");
    return getFallbackProvider().analyzeWrongQuestion(imageBase64);
  }
}

export type { AIProvider, AIImageAnalysisResult, WrongQuestionAnalysis, Subject } from "./types";
