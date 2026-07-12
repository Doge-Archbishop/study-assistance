// Prisma 7 配置
// 本地开发用 SQLite 文件 → 生产用 Turso libsql
import { defineConfig } from "prisma/config";

const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN;

// Turso 需要将 authToken 拼入连接串（供 CLI db push 使用）
const databaseUrl = tursoUrl && tursoToken
  ? `${tursoUrl}?authToken=${tursoToken}`
  : process.env.DATABASE_URL || "file:./dev.db";

export default defineConfig({
  schema: "./prisma/schema.prisma",
  migrations: {
    path: "./prisma/migrations",
  },
  datasource: {
    url: databaseUrl,
  },
});
