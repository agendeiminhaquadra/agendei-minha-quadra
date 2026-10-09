"use server";
import { prisma } from "@/lib/prisma";
import { hashPassword, slugify, createSessionToken, setSessionCookie } from "@/lib/auth";

export type RegistrarResult = {
  ok: boolean;
  error?: string;
  fieldErrors?: {
    ownerName?: string;
    companyName?: string;
    city?: string;
    email?: string;
    phone?: string;
    password?: string;
  };
};

async function gerarSlugUnico(base: string): Promise<string> {
  let slug = slugify(base).slice(0, 48) || "arena";
  let tentativas = 0;
  while (tentativas < 50) {
    const existe = await prisma.company.findUnique({ where: { slug }, select: { id: true } });
    if (!existe) return slug;
    const sufixo = Math.random().toString(36).slice(2, 6);
    slug = `${slugify(base).slice(0, 40)}-${sufixo}`;
    tentativas++;
  }
  return `${slug}-${Date.now().toString(36)}`;
}

export async function registrarAction(
  prev: RegistrarResult,
  formData: FormData,
): Promise<RegistrarResult> {
  const ownerName = String(formData.get("ownerName") || "").trim();
  const companyName = String(formData.get("companyName") || "").trim();
  const city = String(formData.get("city") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const phone = String(formData.get("phone") || "").trim();
  const password = String(formData.get("password") || "");

  const fieldErrors: RegistrarResult["fieldErrors"] = {};
  if (ownerName.length < 3) fieldErrors.ownerName = "Informe seu nome completo";
  if (companyName.length < 2) fieldErrors.companyName = "Informe o nome do complexo";
  if (city.length < 3) fieldErrors.city = "Informe sua cidade";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fieldErrors.email = "Informe um e-mail válido";
  }
  if (phone.replace(/\D/g, "").length < 11) fieldErrors.phone = "Informe DDD + número com 9 dígitos";
  if (!password || password.length < 6) fieldErrors.password = "A senha deve ter pelo menos 6 caracteres";

  if (Object.keys(fieldErrors).length) {
    return { ok: false, fieldErrors };
  }

  try {
    const emailJaExiste = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (emailJaExiste) {
      return {
        ok: false,
        error: "Este e-mail já possui cadastro. Faça login para acessar.",
      };
    }

    const slug = await gerarSlugUnico(companyName);
    const passwordHash = await hashPassword(password);
    const apenasNumeros = (v: string) => v.replace(/\D/g, "");

    const company = await prisma.company.create({
      data: {
        name: companyName,
        slug,
        email,
        phone: apenasNumeros(phone),
        city,
      },
      select: { id: true },
    });

    const user = await prisma.user.create({
      data: {
        email,
        name: ownerName,
        phone: apenasNumeros(phone),
        passwordHash,
        role: "ADMIN",
        isActive: true,
        companyId: company.id,
      },
      select: { id: true, companyId: true },
    });

    const token = await createSessionToken(user.id, user.companyId);
    setSessionCookie(token);

    return { ok: true };
  } catch (e) {
    console.error("[registrarAction]", e);
    return {
      ok: false,
      error: "Erro ao criar conta. Tente novamente ou contate o suporte.",
    };
  }
}
