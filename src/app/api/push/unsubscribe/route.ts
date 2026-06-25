import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-auth";

export const POST = withAuth(["teacher"], async (req) => {
  const body = await req.json().catch(() => null);
  const endpoint = body?.endpoint;

  if (typeof endpoint !== "string") {
    return NextResponse.json({ error: "endpoint가 필요합니다." }, { status: 400 });
  }

  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
  return NextResponse.json({ ok: true });
});
