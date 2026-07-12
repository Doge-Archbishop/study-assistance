/**
 * Cloudflare R2 图片存储工具
 *
 * R2 兼容 S3 API，这里用 fetch + R2 原生 API。
 * 生产环境建议用 @aws-sdk/client-s3。
 */

const R2_ENDPOINT = process.env.R2_ENDPOINT!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME!;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL!;

/**
 * 上传图片到 R2
 * @param buffer   - 图片二进制数据
 * @param filename - 文件名（如 "wrong-question/2026-07-12/abc123.webp"）
 * @param contentType - MIME 类型
 * @returns 公开访问 URL
 */
export async function uploadToR2(
  buffer: ArrayBuffer,
  filename: string,
  contentType: string,
): Promise<string> {
  // 简单的签名实现（生产环境建议用 aws-sdk）
  const url = `${R2_ENDPOINT}/${R2_BUCKET_NAME}/${filename}`;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
      "X-Amz-Content-Sha256": "UNSIGNED-PAYLOAD",
    },
    body: buffer,
  });

  if (!response.ok) {
    throw new Error(`R2 upload failed: ${response.status}`);
  }

  return `${R2_PUBLIC_URL}/${filename}`;
}

/**
 * 从 R2 删除图片
 */
export async function deleteFromR2(filename: string): Promise<void> {
  const url = `${R2_ENDPOINT}/${R2_BUCKET_NAME}/${filename}`;
  const response = await fetch(url, { method: "DELETE" });
  if (!response.ok) {
    throw new Error(`R2 delete failed: ${response.status}`);
  }
}

/**
 * 从完整 URL 中提取 R2 key
 */
export function extractR2Key(url: string): string {
  return url.replace(`${R2_PUBLIC_URL}/`, "");
}
