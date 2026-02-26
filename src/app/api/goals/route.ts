import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const categoryId = searchParams.get("categoryId");
    const status = searchParams.get("status");
    const includeArchived = searchParams.get("includeArchived") === "true";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { userId: session.userId };

    if (!includeArchived) {
      where.isArchived = false;
    }
    if (status) {
      where.status = status;
    }
    if (categoryId) {
      where.categoryId = categoryId === "none" ? null : categoryId;
    }

    const goals = await prisma.goal.findMany({
      where,
      include: {
        category: true,
        milestones: { orderBy: { sortOrder: "asc" } },
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ goals });
  } catch (err) {
    console.error("GET /api/goals error:", err);
    return NextResponse.json(
      { error: "Doelen ophalen mislukt" },
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
    const { title, description, priority, color, categoryId, targetDate } = body;

    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: "Titel is verplicht" },
        { status: 400 }
      );
    }

    if (categoryId) {
      const category = await prisma.goalCategory.findFirst({
        where: { id: categoryId, userId: session.userId },
      });
      if (!category) {
        return NextResponse.json(
          { error: "Categorie niet gevonden" },
          { status: 404 }
        );
      }
    }

    const maxSort = await prisma.goal.aggregate({
      where: { userId: session.userId },
      _max: { sortOrder: true },
    });

    const goal = await prisma.goal.create({
      data: {
        userId: session.userId,
        title: title.trim(),
        description: description || null,
        priority: priority || "medium",
        color: color || "#6C63FF",
        categoryId: categoryId || null,
        targetDate: targetDate ? new Date(targetDate + "T00:00:00.000Z") : null,
        sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
      },
      include: {
        category: true,
        milestones: { orderBy: { sortOrder: "asc" } },
      },
    });

    return NextResponse.json({ goal }, { status: 201 });
  } catch (err) {
    console.error("POST /api/goals error:", err);
    return NextResponse.json(
      { error: "Doel aanmaken mislukt" },
      { status: 500 }
    );
  }
}
