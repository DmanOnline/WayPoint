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
    const includeArchived = searchParams.get("includeArchived") === "true";
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { userId: session.userId };

    if (!includeArchived) {
      where.isArchived = false;
    }
    if (categoryId) {
      where.categoryId = categoryId === "none" ? null : categoryId;
    }

    // Build completions date filter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const completionsWhere: any = {};
    if (from) completionsWhere.completedAt = { gte: new Date(from) };
    if (to) {
      completionsWhere.completedAt = {
        ...completionsWhere.completedAt,
        lte: new Date(to + "T23:59:59.999Z"),
      };
    }

    const habits = await prisma.habit.findMany({
      where,
      include: {
        category: true,
        completions: {
          where: Object.keys(completionsWhere).length > 0 ? completionsWhere : undefined,
          orderBy: { completedAt: "desc" },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ habits });
  } catch (err) {
    console.error("GET /api/habits error:", err);
    return NextResponse.json(
      { error: "Habits ophalen mislukt" },
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
    const {
      name,
      description,
      color,
      icon,
      categoryId,
      frequencyType,
      frequencyTarget,
      frequencyPeriod,
      frequencyDays,
      frequencyInterval,
      startDate,
      reminderTime,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Naam is verplicht" },
        { status: 400 }
      );
    }

    if (categoryId) {
      const category = await prisma.habitCategory.findFirst({
        where: { id: categoryId, userId: session.userId },
      });
      if (!category) {
        return NextResponse.json(
          { error: "Categorie niet gevonden" },
          { status: 404 }
        );
      }
    }

    const maxSort = await prisma.habit.aggregate({
      where: { userId: session.userId },
      _max: { sortOrder: true },
    });

    const habit = await prisma.habit.create({
      data: {
        userId: session.userId,
        name: name.trim(),
        description: description || null,
        color: color || "#6C63FF",
        icon: icon || null,
        categoryId: categoryId || null,
        frequencyType: frequencyType || "daily",
        frequencyTarget: frequencyTarget || 1,
        frequencyPeriod: frequencyPeriod || "day",
        frequencyInterval: frequencyInterval || 1,
        frequencyDays: frequencyDays ? JSON.stringify(frequencyDays) : null,
        startDate: startDate ? new Date(startDate + "T00:00:00.000Z") : new Date(),
        reminderTime: reminderTime || null,
        sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
      },
      include: { category: true, completions: true },
    });

    return NextResponse.json({ habit }, { status: 201 });
  } catch (err) {
    console.error("POST /api/habits error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Habit aanmaken mislukt", detail: message },
      { status: 500 }
    );
  }
}
