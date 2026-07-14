/**
 * AI Provider 工厂 —— 智能路由
 *
 * OCR：GLM-4.6V-Flash → GLM-4V-Flash → Qwen-VL-Plus
 * 结构化：DeepSeek V4 Pro → DeepSeek V4 Flash → 智谱 GLM-4.7-Flash 文本
 * 单阶段兜底：GLM-4.6V-Flash → Qwen-VL-Plus（图片直接 → JSON）
 */

import type { AIProvider, NoteAnalysisResult } from "./types";
import { ZhipuProvider } from "./zhipu";
import { QwenProvider } from "./qwen";
import { DeepSeekProvider, type DeepSeekTask } from "./deepseek";
import { NOTE_IMAGE_PROMPT, NOTE_TEXT_PROMPT, OCR_IMAGE_PROMPT } from "./prompts";

let _zhipu: AIProvider | null = null;
let _qwen: AIProvider | null = null;
let _deepseek: AIProvider | null = null;

// ── 图片分析 ──
export function getPrimaryProvider(): AIProvider {
  if (!_zhipu) {
    const apiKey = process.env.ZHIPU_API_KEY;
    if (!apiKey || apiKey === "your-zhipu-api-key") {
      throw new Error("ZHIPU_API_KEY 未配置");
    }
    _zhipu = new ZhipuProvider(apiKey);
  }
  return _zhipu;
}

export function getFallbackProvider(): AIProvider {
  if (!_qwen) {
    const apiKey = process.env.QWEN_API_KEY;
    if (!apiKey || apiKey === "your-qwen-api-key") {
      throw new Error("QWEN_API_KEY 未配置");
    }
    _qwen = new QwenProvider(apiKey);
  }
  return _qwen;
}

/**
 * 分析错题图片：GLM-4.6V-Flash → Qwen-VL-Plus
 * 返回 { success, data } 或 { success: false, error: "原因" }
 */
export async function analyzeWrongQuestionWithFallback(
  imageBase64: string,
) {
  // 1. GLM-4V-Flash（主力）
  try {
    const result = await getPrimaryProvider().analyzeWrongQuestion(imageBase64);
    if (result.success) return result;
    console.warn("智谱错题分析失败，切换到 Qwen:", result.error);
  } catch (e) {
    console.warn("智谱错题分析异常，切换到 Qwen:", e);
  }

  // 2. Qwen-VL-Plus（备用）
  try {
    return await getFallbackProvider().analyzeWrongQuestion(imageBase64);
  } catch (e) {
    return {
      success: false as const,
      error: `所有 AI 模型均失败（智谱 API → Qwen API）。请检查 API Key 是否有效。最后错误: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

// ── 文本推理（新增） ──
export function getDeepSeekProvider(): DeepSeekProvider {
  if (!_deepseek) {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey || apiKey === "your-deepseek-api-key") {
      throw new Error("DEEPSEEK_API_KEY 未配置，文本推理将使用智谱兜底");
    }
    _deepseek = new DeepSeekProvider(apiKey);
  }
  return _deepseek as DeepSeekProvider;
}

/**
 * 文本推理（笔记 AI 标签等轻量任务）
 * DeepSeek V4 Pro/Flash → 智谱 GLM-4.7-Flash 兜底
 * @param task 任务类型，决定用 Pro 还是 Flash
 */
export async function chatWithFallback(
  messages: { role: string; content: string }[],
  task?: DeepSeekTask,
): Promise<string> {
  // 1. 尝试 DeepSeek
  try {
    const ds = getDeepSeekProvider();
    return await ds.chat(messages, { task });
  } catch (err) {
    console.warn("DeepSeek 不可用，降级到智谱 GLM-4V-Flash：", err);
  }

  // 2. 降级到智谱（免费聊天接口）
  try {
    const zp = getPrimaryProvider();
    return await zp.chat(messages);
  } catch (err) {
    console.error("智谱同样失败：", err);
    throw new Error("所有 AI 模型不可用，请检查网络和 API Key");
  }
}

export type { AIProvider, AIImageAnalysisResult, WrongQuestionAnalysis, NoteAnalysisResult, Subject } from "./types";
export type { DeepSeekTask };

/** 检测 OCR 结果是否为 AI 的"诊断报告"而非实际内容 */
function looksLikeDiagnostic(text: string): boolean {
  const lower = text.toLowerCase();
  const diagPatterns = [
    "图像识别失败", "图片模糊", "无法识别", "图像清晰度",
    "问题原因", "解决方案", "提供清晰图片",
    "unable to recognize", "image is blurry", "too blurry",
  ];
  const matchCount = diagPatterns.filter((p) => lower.includes(p)).length;
  // 命中 ≥2 个诊断关键词且总字数 < 100 → 很可能是诊断文本
  return matchCount >= 2 && text.length < 100;
}

/** 解析 AI 返回的 JSON（兼容 markdown 代码块包裹 + LaTeX 反斜杠 + 截断） */
function parseAIJson(raw: string): Record<string, unknown> | null {
  // 1. 去掉 markdown 代码块包裹
  let json = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/, "")
    .replace(/\s*```$/, "")
    .trim();

  // 2. 定位 JSON 对象边界（AI 有时在 JSON 前后加说明文字）
  if (!json.startsWith("{")) {
    const start = json.indexOf("{");
    const end = json.lastIndexOf("}");
    if (start !== -1 && end > start) {
      json = json.slice(start, end + 1);
    }
  }

  // 3. 修复 AI 常见 JSON 错误
  // 3a. 末尾多余逗号 → {"a":1,} → {"a":1}
  json = json.replace(/,(\s*[}\]])/g, "$1");
  // 3b. LaTeX/代码中的非法转义 → \c → \\c（JSON 只认 \\ \/ \" \b \f \n \r \t \u）
  json = json.replace(/\\(?!["\\/bfnrtu])/g, "\\\\");

  try {
    return JSON.parse(json);
  } catch (e) {
    const errMsg = e instanceof SyntaxError ? e.message : String(e);
    console.error("JSON 解析失败:", errMsg, "| 末尾100字:", json.slice(-100));
    return null;
  }
}

/**
 * 图片笔记分析 —— 两阶段流水线 + 单阶段兜底
 *
 *   主线：纯 OCR（视觉模型）→ 文本结构化（DeepSeek/智谱）
 *   兜底：GLM-4.6V-Flash 一步完成（图片直接 → 结构化 JSON）
 *   最后：Qwen-VL-Plus 一步完成
 *
 * @throws Error 包含详细的失败原因
 */
export async function analyzeNoteImage(
  imageBase64: string,
): Promise<NoteAnalysisResult> {
  // ── 主线：两阶段流水线 ──
  try {
    const ocrText = await ocrImage(imageBase64);
    // 验证：OCR 结果不能是 AI 的"诊断报告"（如图像模糊分析）
    if (looksLikeDiagnostic(ocrText)) {
      throw new Error("OCR 识别到的不是笔记内容（可能是图片太模糊，AI 返回了诊断文本而非原文）。请使用更清晰的图片重试。");
    }
    if (ocrText.trim().length > 5) {
      return await analyzeNoteText(ocrText);
    }
  } catch (e) {
    // 两阶段失败，继续尝试单阶段兜底
    console.warn("两阶段流水线失败，降级到单阶段:", e instanceof Error ? e.message : String(e));
  }

  // ── 兜底1：GLM-4.6V-Flash 单阶段（图片直接 → JSON） ──
  const zhipu = getPrimaryProvider() as ZhipuProvider;
  try {
    const raw = await zhipu.analyzeImageWithPrompt(imageBase64, NOTE_IMAGE_PROMPT);
    if (raw) {
      const parsed = parseAIJson(raw);
      if (parsed) return parsed as unknown as NoteAnalysisResult;
      console.warn("GLM-4.6V 单阶段 JSON 解析失败，尝试 Qwen 兜底");
    }
  } catch (e) {
    console.warn("GLM-4.6V 单阶段异常:", e instanceof Error ? e.message : String(e));
  }

  // ── 兜底2：Qwen-VL-Plus 单阶段 ──
  const qwen = getFallbackProvider() as QwenProvider;
  try {
    const raw = await qwen.analyzeImageWithPrompt(imageBase64, NOTE_IMAGE_PROMPT);
    if (raw) {
      const parsed = parseAIJson(raw);
      if (parsed) return parsed as unknown as NoteAnalysisResult;
    }
  } catch (e) {
    console.warn("Qwen 单阶段异常:", e instanceof Error ? e.message : String(e));
  }

  throw new Error("图片 AI 分析完全失败——两阶段流水线和单阶段兜底均未成功，请重试或更换图片");
}

/**
 * 纯 OCR（视觉模型 → 文字，不做结构化）
 * 尝试顺序：GLM-4.6V-Flash → GLM-4V-Flash → Qwen-VL-Plus
 */
async function ocrImage(imageBase64: string): Promise<string> {
  const errors: string[] = [];
  const zhipu = getPrimaryProvider() as ZhipuProvider;

  // GLM-4.6V-Flash（新模型，32K 输出，偶发 429）
  try {
    const text = await zhipu.analyzeImageWithPrompt(imageBase64, OCR_IMAGE_PROMPT);
    if (text.trim()) return text;
    errors.push("智谱 GLM-4.6V 返回空内容");
  } catch (e) {
    errors.push(`智谱 GLM-4.6V: ${e instanceof Error ? e.message : String(e)}`);
  }

  // GLM-4V-Flash（旧模型，稳定，仅 1024 tokens — OCR 够用）
  try {
    const text = await zhipu.analyzeImageWithModel(imageBase64, OCR_IMAGE_PROMPT, "glm-4v-flash", 1024);
    if (text.trim()) return text;
    errors.push("智谱 GLM-4V 返回空内容");
  } catch (e) {
    errors.push(`智谱 GLM-4V: ${e instanceof Error ? e.message : String(e)}`);
  }

  // Qwen-VL-Plus（最终兜底）
  const qwen = getFallbackProvider() as QwenProvider;
  try {
    const text = await qwen.analyzeImageWithPrompt(imageBase64, OCR_IMAGE_PROMPT);
    if (text.trim()) return text;
    errors.push("Qwen 返回空内容");
  } catch (e) {
    errors.push(`Qwen: ${e instanceof Error ? e.message : String(e)}`);
  }

  throw new Error(`图片 OCR 全部失败 — ${errors.join(" | ")}`);
}

/**
 * 文本笔记分析：DeepSeek V4 Pro → DeepSeek V4 Flash → 智谱文本兜底
 *
 * @throws Error 包含具体失败原因
 */
export async function analyzeNoteText(
  text: string,
): Promise<NoteAnalysisResult> {
  const prompt = NOTE_TEXT_PROMPT + "\n" + text.slice(0, 12000);
  const errors: string[] = [];

  // 1. DeepSeek V4 Pro（主力）
  let dsAuthFailed = false;
  try {
    const ds = getDeepSeekProvider();
    const result = await ds.chat([{ role: "user", content: prompt }], { task: "analysis" });
    if (result) {
      const parsed = parseAIJson(result);
      if (parsed) return parsed as unknown as NoteAnalysisResult;
      errors.push(`DeepSeek Pro 返回了 ${result.length} 字符但 JSON 解析失败，末尾: ${result.slice(-100)}`);
    } else {
      errors.push("DeepSeek Pro 返回了空内容");
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    errors.push(`DeepSeek Pro: ${msg}`);
    // 401/403 → Key 无效，跳过 Flash（同一 Key 同样失败）
    if (msg.includes("401") || msg.includes("403") || msg.includes("Authentication")) {
      dsAuthFailed = true;
    }
  }

  // 2. DeepSeek V4 Flash（降级——仅当非认证错误时尝试）
  if (!dsAuthFailed) {
    try {
      const ds = getDeepSeekProvider();
      const result = await ds.chat([{ role: "user", content: prompt }], { task: "tag" });
      if (result) {
        const parsed = parseAIJson(result);
        if (parsed) return parsed as unknown as NoteAnalysisResult;
        errors.push(`DeepSeek Flash 返回了 ${result.length} 字符但 JSON 解析失败`);
      } else {
        errors.push("DeepSeek Flash 返回了空内容");
      }
    } catch (e) {
      errors.push(`DeepSeek Flash: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // 3. 智谱文本兜底
  try {
    const zp = getPrimaryProvider();
    const result = await zp.chat([{ role: "user", content: prompt }]);
    if (result) {
      const parsed = parseAIJson(result);
      if (parsed) return parsed as unknown as NoteAnalysisResult;
      errors.push(`智谱文本返回了 ${result.length} 字符但 JSON 解析失败`);
    } else {
      errors.push("智谱文本返回了空内容");
    }
  } catch (e) {
    errors.push(`智谱文本: ${e instanceof Error ? e.message : String(e)}`);
  }

  throw new Error(`文本结构化全部失败 — ${errors.join(" | ")}`);
}

