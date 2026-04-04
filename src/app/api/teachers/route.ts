import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/client";

// GET: 교사 목록 (역할 필터 지원)
export const GET = withAuth(
  ["admin", "sub_admin"],
  async (req, user) => {
    const { searchParams } = new URL(req.url);
    const roleFilter = searchParams.get("role");

    const where: { roles?: { some: { role: Role } } } = {};

    if (roleFilter) {
      const validRoles: Role[] = ["admin", "supervisor", "homeroom"];
      if (validRoles.includes(roleFilter as Role)) {
        where.roles = {
          some: { role: roleFilter as Role },
        };
      }
    }

    const teachers = await prisma.teacher.findMany({
      where,
      select: {
        id: true,
        name: true,
        roles: {
          select: {
            role: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const result = teachers.map((t) => ({
      id: t.id,
      name: t.name,
      roles: t.roles.map((r) => r.role),
    }));

    return NextResponse.json({ teachers: result });
  }
);
