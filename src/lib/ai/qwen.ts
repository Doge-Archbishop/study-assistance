/**
 * 阿里 Qwen-VL-Plus Provider
 * 付费备用：视觉理解能力更强，适合复杂图表/方程式识别
 *
 * API 文档: https://help.aliyun.com/zh/model-studio/
 */

import type { AIProvider, AIImageAnalysisResult, WrongQuestionAnalysis } from "./types";

const BASE_URL =
  "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";

export class QwenProvider implements AIProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async analyzeWrongQuestion(
    imageBase64: string,
  ): Promise<AIImageAnalysisResult> {
    try {
      const response = await fetch(BASE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: "qwen-vl-plus",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: { url: imageBase64 },
                },
                {
                  type: "text",
                  text: WRONG_QUESTION_PROMPT,
                },
              ],
            },
          ],
          temperature: 0.1,
          max_tokens: 2048,
        }),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        return { success: false, error: `Qwen API ${response.status}: ${errText.slice(0, 200)}` };
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        return { success: false, error: "Qwen AI 未返回内容——API 返回了空 choices" };
      }

      const json = content.replace(/```json\n?/g, "").replace(/```/g, "").trim();
      const parsed: WrongQuestionAnalysis = JSON.parse(json);

      return { success: true, data: parsed };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "未知错误",
      };
    }
  }

  async chat(
    messages: { role: string; content: string }[],
  ): Promise<string> {
    const response = await fetch(BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: "qwen-plus",
        messages,
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(`Qwen API ${response.status}: ${errText.slice(0, 300)}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content ?? "";
  }

  /** 通用图片分析（自定义 prompt）—— 给笔记分析等场景复用 */
  async analyzeImageWithPrompt(
    imageBase64: string,
    prompt: string,
  ): Promise<string> {
    const response = await fetch(BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: "qwen-vl-plus",
        messages: [
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: imageBase64 } },
              { type: "text", text: prompt },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 8192, // Qwen-VL-Plus 最大支持 8192，笔记分析 JSON 需 3K-5K
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(`Qwen API ${response.status}: ${errText.slice(0, 300)}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content ?? "";
  }
}

const WRONG_QUESTION_PROMPT = `你是一位高三辅导老师。请分析这张错题照片，返回严格的 JSON 格式（不要包含其他文字）：

{
  "subject": "biology" | "chemistry" | "english" | "chinese",
  "questionText": "题目原文（OCR 识别）",
  "answerText": "学生写的错误答案",
  "correctAnswer": "正确答案",
  "analysis": "详细解析：为什么错、涉及的知识点、正确思路是什么",
  "errorType": "concept_unclear" | "calculation_error" | "careless" | "memory_forget" | "other",
  "difficulty": 1-5 的整数（1=基础, 5=难题）,
  "knowledgePoints": ["关联的知识点1", "知识点2"]
}

注意：
- 如果照片中题目不完整或看不清，questionText 写"无法完整识别"
- errorType 根据实际错误判断
- knowledgePoints 尽量拆分到最细粒度的知识点`;
