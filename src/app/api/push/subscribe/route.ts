import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-auth";

export const POST = withAuth(["teacher"], async (req, user) => {
  const body = await req.json().catch(() => null);
  const endpoint = body?.endpoint;
  const p256dh = body?.keys?.p256dh;
  const auth = body?.keys?.auth;
  const userAgent =
    typeof body?.userAgent === "string" ? body.userAgent.slice(0, 255) : null;

  if (
    typeof endpoint !== "string" ||
    typeof p256dh !== "string" ||
    typeof auth !== "string"
  ) {
    return NextResponse.json(
      { error: "잘못된 구독 정보입니다." },
      { status: 400 }
    );
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { teacherId: user.userId, p256dh, auth, userAgent },
    create: { teacherId: user.userId, endpoint, p256dh, auth, userAgent },
  });

  return NextResponse.json({ ok: true });
});
