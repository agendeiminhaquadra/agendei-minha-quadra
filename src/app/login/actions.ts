"use server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSessionToken, setSessionCookie, verifyPassword } from "@/lib/auth";

export type LoginResult = {
  ok: boolean;
  error?: string;
  fieldErrors?: { email?: string; password?: string };
};

export async function loginAction(
  prev: LoginResult,
  formData: FormData,
): Promise<LoginResult> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  const fieldErrors: LoginResult["fieldErrors"] = {};
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fieldErrors.email = "Informe um e-mail válido";
  }
  if (!password || password.length < 6) {
    fieldErrors.password = "A senha deve ter pelo menos 6 caracteres";
  }
  if (Object.keys(fieldErrors).length) {
    return { ok: false, fieldErrors };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true, companyId: true, isActive: true },
  });

  if (!user || !user.passwordHash) {
    return { ok: false, error: "E-mail ou senha incorretos." };
  }

  if (!user.isActive) {
    return { ok: false, error: "Esta conta está inativa. Contate o suporte." };
  }

  const pwOk = await verifyPassword(password, user.passwordHash);
  if (!pwOk) {
    return { ok: false, error: "E-mail ou senha incorretos." };
  }

  const token = await createSessionToken(user.id, user.companyId);
  setSessionCookie(token);

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
  } catch {}

  return { ok: true };
}
