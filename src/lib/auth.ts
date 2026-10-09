import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

const AUTH_SECRET = process.env.AUTH_SECRET || "minha-quadra-dev-secret-change-me-please-2026";
const SESSION_COOKIE = "mq_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 dias

export type SessionPayload = {
  userId: string;
  companyId: string;
  iat: number;
  exp: number;
};

let secretKeyCache: CryptoKey | null = null;

async function getSecretKey(): Promise<CryptoKey> {
  if (secretKeyCache) return secretKeyCache;
  const enc = new TextEncoder();
  secretKeyCache = await crypto.subtle.importKey(
    "raw",
    enc.encode(AUTH_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  return secretKeyCache;
}

function base64UrlEncode(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(str: string): Uint8Array {
  const pad = "=".repeat((4 - (str.length % 4)) % 4);
  const base64 = (str + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(base64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function signPayload(payloadB64: string): Promise<string> {
  const key = await getSecretKey();
  const enc = new TextEncoder();
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payloadB64));
  return base64UrlEncode(sig);
}

async function verifyPayload(payloadB64: string, signatureB64: string): Promise<boolean> {
  try {
    const key = await getSecretKey();
    const enc = new TextEncoder();
    const sigBytesSrc = base64UrlDecode(signatureB64);
    const sigBytes = new Uint8Array(sigBytesSrc.length);
    sigBytes.set(sigBytesSrc);
    return crypto.subtle.verify("HMAC", key, sigBytes, enc.encode(payloadB64));
  } catch {
    return false;
  }
}

export async function createSessionToken(userId: string, companyId: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    userId,
    companyId,
    iat: now,
    exp: now + SESSION_MAX_AGE,
  };
  const enc = new TextEncoder();
  const payloadB64 = base64UrlEncode(enc.encode(JSON.stringify(payload)).buffer);
  const signature = await signPayload(payloadB64);
  return `${payloadB64}.${signature}`;
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const [payloadB64, signature] = token.split(".");
    if (!payloadB64 || !signature) return null;
    const ok = await verifyPayload(payloadB64, signature);
    if (!ok) return null;
    const payloadBytes = base64UrlDecode(payloadB64);
    const payload = JSON.parse(new TextDecoder().decode(payloadBytes)) as SessionPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function setSessionCookie(token: string) {
  const c = cookies();
  c.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export function deleteSessionCookie() {
  const c = cookies();
  c.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<{ userId: string; companyId: string } | null> {
  const c = cookies();
  const token = c.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifySessionToken(token);
  if (!payload) {
    deleteSessionCookie();
    return null;
  }
  return { userId: payload.userId, companyId: payload.companyId };
}

export async function getCurrentUser() {
  const s = await getSession();
  if (!s) return null;
  return prisma.user.findUnique({
    where: { id: s.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      companyId: true,
      company: { select: { id: true, name: true, slug: true, logo: true } },
    },
  });
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function slugify(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}
