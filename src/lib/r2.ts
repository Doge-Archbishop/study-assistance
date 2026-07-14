/**
 * Cloudflare R2 图片存储工具
 *
 * 使用 S3 兼容 API 上传/删除图片。
 * 签名实现基于 Cloudflare R2 的 S3 SigV4 规范——R2 要求所有写操作必须签名。
 *
 * 安全注意：R2_ACCESS_KEY_ID 和 R2_SECRET_ACCESS_KEY 是 S3 Token（非主账户 Key），
 * 仅授予单个 Bucket 的读写权限，遵循最小权限原则。
 *
 * @依赖 Web Crypto API（Node 18+ / Edge Runtime 原生支持）
 */
const R2_ENDPOINT = process.env.R2_ENDPOINT!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME!;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL!;
const R2_REGION = process.env.R2_REGION || "auto";

/**
 * 对 ArrayBuffer 做 SHA-256 哈希，返回小写 hex 字符串
 */
async function sha256(data: ArrayBuffer | string): Promise<string> {
  const buf = typeof data === "string" ? new TextEncoder().encode(data) : data;
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * HMAC-SHA256 签名
 */
async function hmacSha256(key: ArrayBuffer, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw", key,
    { name: "HMAC", hash: "SHA-256" },
    false, ["sign"],
  );
  return crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
}

/**
 * 生成 AWS SigV4 签名
 * 参考：https://docs.aws.amazon.com/AmazonS3/latest/API/sig-v4-authenticating-requests.html
 */
async function signRequest(
  method: string,
  path: string,
  headers: Record<string, string>,
  region: string,
  service: string,
): Promise<string> {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);

  // 1. Canonical Request
  const signedHeaders = Object.keys(headers).sort().join(";");
  const canonicalHeaders = Object.keys(headers).sort()
    .map((k) => `${k}:${headers[k]}`).join("\n");
  const payloadHash = await sha256("");
  const canonicalRequest = [
    method, path, "", canonicalHeaders, "", signedHeaders, payloadHash,
  ].join("\n");

  // 2. String to Sign
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256", amzDate, credentialScope,
    await sha256(canonicalRequest),
  ].join("\n");

  // 3. Signing Key（逐级派生）
  const kDate = await hmacSha256(
    new TextEncoder().encode("AWS4" + R2_SECRET_ACCESS_KEY).buffer as ArrayBuffer, dateStamp,
  );
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  const kSigning = await hmacSha256(kService, "aws4_request");

  // 4. Signature
  const signature = await sha256(await hmacSha256(kSigning, stringToSign));

  return `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY_ID}/${credentialScope},SignedHeaders=${signedHeaders},Signature=${signature}`;
}

/**
 * 上传图片到 R2
 * @param buffer     - 图片二进制数据
 * @param filename   - 文件名（如 "wrong-question/2026-07-12/abc123.webp"）
 * @param contentType - MIME 类型
 * @returns 公开访问 URL
 */
export async function uploadToR2(
  buffer: ArrayBuffer,
  filename: string,
  contentType: string,
): Promise<string> {
  const path = `/${R2_BUCKET_NAME}/${filename}`;
  const url = `${R2_ENDPOINT}${path}`;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");

  const headers: Record<string, string> = {
    "Content-Type": contentType,
    "x-amz-content-sha256": await sha256(buffer),
    "x-amz-date": amzDate,
    "host": new URL(R2_ENDPOINT).host,
  };

  const authorization = await signRequest("PUT", path, headers, R2_REGION, "s3");

  const response = await fetch(url, {
    method: "PUT",
    headers: { ...headers, Authorization: authorization },
    body: buffer,
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`R2 上传失败: ${response.status} ${errText}`);
  }

  return `${R2_PUBLIC_URL}/${filename}`;
}

/**
 * 从 R2 删除图片
 */
export async function deleteFromR2(filename: string): Promise<void> {
  const path = `/${R2_BUCKET_NAME}/${filename}`;
  const url = `${R2_ENDPOINT}${path}`;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");

  const headers: Record<string, string> = {
    "x-amz-content-sha256": await sha256(""),
    "x-amz-date": amzDate,
    "host": new URL(R2_ENDPOINT).host,
  };

  const authorization = await signRequest("DELETE", path, headers, R2_REGION, "s3");

  const response = await fetch(url, {
    method: "DELETE",
    headers: { ...headers, Authorization: authorization },
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`R2 删除失败: ${response.status} ${errText}`);
  }
}

/**
 * 从完整 URL 中提取 R2 key（去掉公开域名前缀）
 */
export function extractR2Key(url: string): string {
  return url.replace(`${R2_PUBLIC_URL}/`, "");
}
