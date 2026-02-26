import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  try {
    const categories = await prisma.goalCategory.findMany({
      where: { userId: session.userId },
      include: { _count: { select: { goals: true } } },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({ categories });
  } catch (err) {
    console.error("GET /api/goals/categories error:", err);
    return NextResponse.json(
      { error: "Categorieën ophalen mislukt" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, color, icon } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Naam is verplicht" },
        { status: 400 }
      );
    }

    const existing = await prisma.goalCategory.findFirst({
      where: { userId: session.userId, name: name.trim() },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Categorie bestaat al" },
        { status: 409 }
      );
    }

    const maxSort = await prisma.goalCategory.aggregate({
      where: { userId: session.userId },
      _max: { sortOrder: true },
    });

    const category = await prisma.goalCategory.create({
      data: {
        userId: session.userId,
        name: name.trim(),
        color: color || "#6C63FF",
        icon: icon || null,
        sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
      },
      include: { _count: { select: { goals: true } } },
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (err) {
    console.error("POST /api/goals/categories error:", err);
    return NextResponse.json(
      { error: "Categorie aanmaken mislukt" },
      { status: 500 }
    );
  }
}
