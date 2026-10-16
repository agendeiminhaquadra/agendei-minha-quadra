import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "mq_session";
const IDLE_TIMEOUT_SECONDS = 60 * 30;

type SessionPayload = {
  userId: string;
  companyId: string;
  iat: number;
  exp: number;
  idleExp?: number;
};

function decodeBase64Url(value: string): Uint8Array {
  const pad = "=".repeat((4 - (value.length % 4)) % 4);
  const decoded = atob((value + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(decoded, (char) => char.charCodeAt(0));
}

function encodeBase64Url(value: ArrayBuffer): string {
  const bytes = new Uint8Array(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function signPayload(payloadB64: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return encodeBase64Url(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64)));
}

async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const AUTH_SECRET = process.env.AUTH_SECRET;
    if (!AUTH_SECRET || AUTH_SECRET.length < 32) return null;
    const [payloadB64, signatureB64] = token.split(".");
    if (!payloadB64 || !signatureB64) return null;

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(AUTH_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );

    const signatureBytes = decodeBase64Url(signatureB64);
    const signature = new Uint8Array(signatureBytes.length);
    signature.set(signatureBytes);
    const ok = await crypto.subtle.verify(
      "HMAC",
      key,
      signature,
      new TextEncoder().encode(payloadB64),
    );

    if (!ok) return null;

    const payload = JSON.parse(new TextDecoder().decode(decodeBase64Url(payloadB64))) as SessionPayload;
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp <= now || (payload.idleExp !== undefined && payload.idleExp <= now)) return null;
    return payload;
  } catch {
    return null;
  }
}

async function refreshSessionCookie(response: NextResponse, payload: SessionPayload) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return;
  const now = Math.floor(Date.now() / 1000);
  const refreshed = { ...payload, idleExp: now + IDLE_TIMEOUT_SECONDS };
  const payloadB64 = encodeBase64Url(new TextEncoder().encode(JSON.stringify(refreshed)).buffer);
  const signature = await signPayload(payloadB64, secret);
  response.cookies.set(SESSION_COOKIE, `${payloadB64}.${signature}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.min(IDLE_TIMEOUT_SECONDS, refreshed.exp - now),
  });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  const isLoggedIn = Boolean(session);

  const isAdmin = pathname.startsWith("/admin");
  const isSuperAdmin = pathname.startsWith("/superadmin");
  const isLogin = pathname === "/login";
  const isRegistrar = pathname === "/registrar";

  if ((isAdmin || isSuperAdmin) && !isLoggedIn) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    const response = NextResponse.redirect(url);
    response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  if ((isLogin || isRegistrar) && isLoggedIn) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    const response = NextResponse.redirect(url);
    if (session) await refreshSessionCookie(response, session);
    return response;
  }

  const response = NextResponse.next();
  if (session) await refreshSessionCookie(response, session);
  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/superadmin/:path*", "/login", "/registrar"],
};
