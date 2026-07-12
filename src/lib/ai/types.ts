/** AI Provider 统一接口 */

export type Subject = "biology" | "chemistry" | "english" | "chinese";

export interface WrongQuestionAnalysis {
  subject: Subject;
  questionText: string;
  answerText: string;
  correctAnswer: string;
  analysis: string;
  errorType: string;
  difficulty: number; // 1~5
  knowledgePoints: string[]; // 关联的知识点名称列表
}

export interface AIImageAnalysisResult {
  success: boolean;
  data?: WrongQuestionAnalysis;
  error?: string;
}

export interface AIProvider {
  /** 分析错题图片，返回结构化解析结果 */
  analyzeWrongQuestion(
    imageBase64: string,
  ): Promise<AIImageAnalysisResult>;

  /** 通用文本对话 */
  chat(messages: { role: string; content: string }[]): Promise<string>;
}
