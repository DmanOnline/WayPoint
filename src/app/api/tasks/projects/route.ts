import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/tasks/projects
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const projects = await prisma.project.findMany({
    where: { userId: session.userId },
    include: {
      _count: {
        select: { tasks: { where: { status: { not: "done" } } } },
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json({ projects });
}

// POST /api/tasks/projects
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const body = await request.json();
  const { name, color } = body;

  if (!name || !name.trim()) {
    return NextResponse.json(
      { error: "Naam is verplicht" },
      { status: 400 }
    );
  }

  // Check for duplicate name
  const existing = await prisma.project.findFirst({
    where: { userId: session.userId, name: name.trim() },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Er bestaat al een project met deze naam" },
      { status: 400 }
    );
  }

  const maxSort = await prisma.project.aggregate({
    where: { userId: session.userId },
    _max: { sortOrder: true },
  });

  const project = await prisma.project.create({
    data: {
      userId: session.userId,
      name: name.trim(),
      color: color || "#6C63FF",
      sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
    },
    include: {
      _count: {
        select: { tasks: { where: { status: { not: "done" } } } },
      },
    },
  });

  return NextResponse.json({ project }, { status: 201 });
}
