/**
 * Prisma Client 单例
 *
 * Prisma 7 + libSQL 适配器 —— 同时支持本地 SQLite 和远程 Turso。
 * 生产环境优先使用 Turso（HTTP 连接），本地开发兜底用 file: 协议。
 *
 * 缓存策略：开发模式下把实例挂在 globalThis 上，避免 hot reload 创建多个连接池。
 */
// Prisma Client 单例（Prisma 7 + libSQL/SQLite + Turso）
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  // 生产环境：Turso libsql
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;
  if (tursoUrl && tursoToken) {
    const adapter = new PrismaLibSql({ url: tursoUrl, authToken: tursoToken });
    return new PrismaClient({ adapter });
  }

  // 本地 / 兜底：DATABASE_URL
  const url = process.env.DATABASE_URL || "file:./dev.db";
  const adapter = new PrismaLibSql({ url });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
