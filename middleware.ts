import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "mq_session";

async function verifySessionToken(token: string): Promise<boolean> {
  try {
    const AUTH_SECRET = process.env.AUTH_SECRET || "minha-quadra-dev-secret-change-me-please-2026";
    const [payloadB64, signatureB64] = token.split(".");
    if (!payloadB64 || !signatureB64) return false;

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(AUTH_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );

    const pad = "=".repeat((4 - (signatureB64.length % 4)) % 4);
    const sigBase64 = (signatureB64 + pad).replace(/-/g, "+").replace(/_/g, "/");
    const sigBin = atob(sigBase64);
    const sigBytes = new Uint8Array(sigBin.length);
    for (let i = 0; i < sigBin.length; i++) sigBytes[i] = sigBin.charCodeAt(i);

    const ok = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes,
      new TextEncoder().encode(payloadB64),
    );

    if (!ok) return false;

    const padPayload = "=".repeat((4 - (payloadB64.length % 4)) % 4);
    const payloadBase64 = (payloadB64 + padPayload).replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(payloadBase64));
    return payload.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const isLoggedIn = token ? await verifySessionToken(token) : false;

  const isAdmin = pathname.startsWith("/admin");
  const isLogin = pathname === "/login";
  const isRegistrar = pathname === "/registrar";

  if (isAdmin && !isLoggedIn) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", "/admin");
    return NextResponse.redirect(url);
  }

  if ((isLogin || isRegistrar) && isLoggedIn) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/login", "/registrar"],
};
