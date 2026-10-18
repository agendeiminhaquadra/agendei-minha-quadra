import "server-only";
import { createHmac } from "node:crypto";
import { prisma } from "@/lib/prisma";

const WINDOW_MS = 15 * 60 * 1000;
const RECORD_TTL_MS = 24 * 60 * 60 * 1000;

function digest(namespace: "email" | "ip", value: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET não está configurado corretamente.");
  return createHmac("sha256", secret).update(`${namespace}:${value}`).digest("hex");
}

export async function consumeLoginAttempt(
  namespace: "email" | "ip",
  value: string,
  limit: number,
) {
  const now = new Date();
  const key = digest(namespace, value);
  const rows = await prisma.$queryRaw<Array<{ attempts: number }>>`
    INSERT INTO "AuthRateLimit" ("key", "attempts", "windowStartedAt", "expiresAt", "updatedAt")
    VALUES (${key}, 1, ${now}, ${new Date(now.getTime() + WINDOW_MS)}, ${now})
    ON CONFLICT ("key") DO UPDATE SET
      "attempts" = CASE
        WHEN "AuthRateLimit"."windowStartedAt" <= ${new Date(now.getTime() - WINDOW_MS)} THEN 1
        ELSE "AuthRateLimit"."attempts" + 1
      END,
      "windowStartedAt" = CASE
        WHEN "AuthRateLimit"."windowStartedAt" <= ${new Date(now.getTime() - WINDOW_MS)} THEN ${now}
        ELSE "AuthRateLimit"."windowStartedAt"
      END,
      "expiresAt" = ${new Date(now.getTime() + RECORD_TTL_MS)},
      "updatedAt" = ${now}
    RETURNING "attempts"
  `;

  // Opportunistically remove expired digests so arbitrary addresses cannot grow this table forever.
  if (Math.random() < 0.01) {
    await prisma.authRateLimit.deleteMany({ where: { expiresAt: { lt: now } } });
  }

  const attempts = Number(rows[0]?.attempts ?? limit + 1);
  return { allowed: attempts <= limit, attempts };
}

export async function clearEmailLoginAttempts(email: string) {
  await prisma.authRateLimit.deleteMany({ where: { key: digest("email", email) } });
}
