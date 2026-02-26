import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { goalId, title } = body;

    if (!goalId || !title || !title.trim()) {
      return NextResponse.json(
        { error: "Doel ID en titel zijn verplicht" },
        { status: 400 }
      );
    }

    const goal = await prisma.goal.findFirst({
      where: { id: goalId, userId: session.userId },
    });
    if (!goal) {
      return NextResponse.json(
        { error: "Doel niet gevonden" },
        { status: 404 }
      );
    }

    const maxSort = await prisma.goalMilestone.aggregate({
      where: { goalId },
      _max: { sortOrder: true },
    });

    const milestone = await prisma.goalMilestone.create({
      data: {
        goalId,
        title: title.trim(),
        sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
      },
    });

    return NextResponse.json({ milestone }, { status: 201 });
  } catch (err) {
    console.error("POST /api/goals/milestones error:", err);
    return NextResponse.json(
      { error: "Mijlpaal aanmaken mislukt" },
      { status: 500 }
    );
  }
}
