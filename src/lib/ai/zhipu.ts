/**
 * 智谱 GLM-4-Flash Provider
 * 免费主力：文本分析、题目生成、作文素材整理
 *
 * API 文档: https://open.bigmodel.cn/dev/api/normal-model/glm-4
 */

import type { AIProvider, AIImageAnalysisResult, WrongQuestionAnalysis } from "./types";

const BASE_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions";

export class ZhipuProvider implements AIProvider {
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
          model: "glm-4-flash",
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

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        return { success: false, error: "AI 未返回内容" };
      }

      // 提取 JSON（智谱有时会在 JSON 外包 markdown 代码块）
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
        model: "glm-4-flash",
        messages,
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

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
- errorType 根据实际错误判断：概念不清选 concept_unclear，计算错选 calculation_error，粗心选 careless，遗忘选 memory_forget
- knowledgePoints 尽量拆分到最细粒度的知识点（如"有氧呼吸第三阶段"而非"细胞呼吸"）`;
