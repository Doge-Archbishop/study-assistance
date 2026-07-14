/**
 * DeepSeek V4 Provider —— Pro/Flash 自动切换
 *
 * 策略：
 *  - 简单任务（标记、摘要）         → deepseek-v4-flash ($0.14/M input)
 *  - 复杂任务（深度解析、长文本）     → deepseek-v4-pro  ($0.435/M input)
 *  - 任一失败                        → 切换另一个
 *  - 全部失败                        → 抛异常给上层 fallback
 *
 * API 文档: https://api-docs.deepseek.com/
 */

import type { AIProvider } from "./types";

const BASE_URL = "https://api.deepseek.com/v1/chat/completions";

const MODEL_PRO = "deepseek-v4-pro";
const MODEL_FLASH = "deepseek-v4-flash";

export type DeepSeekTask = "tag" | "summary" | "analysis" | "generate";

/**
 * 根据任务类型 + 输入长度判断用什么模型
 */
function pickModel(task: DeepSeekTask, inputLength: number): string {
  // 简单任务 → Flash
  if (task === "tag") return MODEL_FLASH;
  // 长输入 → Flush（Pro 太贵）
  if (inputLength > 8000) return MODEL_FLASH;
  // 复杂任务且短输入 → Pro
  if (task === "analysis") return MODEL_PRO;
  if (task === "generate") return MODEL_PRO;
  // 默认 Flash
  return MODEL_FLASH;
}

export class DeepSeekProvider implements AIProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /** 不支持图片——错题图片仍用智谱/Qwen */
  async analyzeWrongQuestion(): Promise<any> {
    throw new Error("DeepSeek 不支持图片分析，请使用智谱或 Qwen");
  }

  /**
   * 文本对话 —— Pro/Flash 自动切换 + 重试
   */
  async chat(
    messages: { role: string; content: string }[],
    options?: { task?: DeepSeekTask },
  ): Promise<string> {
    const task = options?.task || "analysis";
    const inputLength = messages.reduce(
      (sum, m) => sum + (typeof m.content === "string" ? m.content.length : 0),
      0,
    );

    const model = pickModel(task, inputLength);
    const fallback = model === MODEL_PRO ? MODEL_FLASH : MODEL_PRO;

    // 先试主模型
    try {
      return await this.callModel(model, messages);
    } catch (err) {
      console.warn(`DeepSeek ${model} 失败，尝试 ${fallback}：`, err);
    }

    // 再试备用
    return this.callModel(fallback, messages);
  }

  private async callModel(
    model: string,
    messages: { role: string; content: string }[],
  ): Promise<string> {
    const response = await fetch(BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: model === MODEL_PRO ? 0.3 : 0.1,
        max_tokens: model === MODEL_PRO ? 4096 : 2048,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`DeepSeek API ${response.status}: ${errText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content ?? "";
  }
}
