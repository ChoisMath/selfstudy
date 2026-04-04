import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { auth } from "@/lib/auth";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const results: Record<string, unknown> = {};

  // 1. Check env vars
  results.envVars = {
    hasAuthSecret: !!process.env.AUTH_SECRET,
    hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
    authSecretLen: process.env.AUTH_SECRET?.length,
    nextAuthSecretLen: process.env.NEXTAUTH_SECRET?.length,
  };

  // 2. Check cookies
  const cookieHeader = req.headers.get("cookie") || "";
  const cookieNames = cookieHeader
    .split(";")
    .map((c) => c.trim().split("=")[0])
    .filter(Boolean);
  results.cookies = cookieNames;

  // 3. Try auth()
  try {
    const session = await auth();
    results.authSession = session ? { user: session.user } : null;
  } catch (e: unknown) {
    results.authError = String(e);
  }

  // 4. Try getToken with various salt/cookie combinations
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  const combos = [
    { label: "secure-authjs", cookieName: "__Secure-authjs.session-token", salt: "__Secure-authjs.session-token" },
    { label: "plain-authjs", cookieName: "authjs.session-token", salt: "authjs.session-token" },
    { label: "secure-next-auth", cookieName: "__Secure-next-auth.session-token", salt: "__Secure-next-auth.session-token" },
    { label: "plain-next-auth", cookieName: "next-auth.session-token", salt: "next-auth.session-token" },
  ];

  results.getTokenResults = {};
  for (const combo of combos) {
    try {
      const token = await getToken({
        req,
        secret: secret!,
        salt: combo.salt,
        cookieName: combo.cookieName,
      });
      (results.getTokenResults as Record<string, unknown>)[combo.label] = token
        ? { found: true, userType: token.userType, userId: token.userId }
        : { found: false };
    } catch (e: unknown) {
      (results.getTokenResults as Record<string, unknown>)[combo.label] = { error: String(e) };
    }
  }

  // 5. Try raw token read
  try {
    const rawToken = await getToken({
      req,
      raw: true,
      cookieName: "__Secure-authjs.session-token",
    });
    results.rawTokenPresent = !!rawToken;
    results.rawTokenLen = rawToken?.length;
  } catch (e: unknown) {
    results.rawTokenError = String(e);
  }

  return NextResponse.json(results, { status: 200 });
}
