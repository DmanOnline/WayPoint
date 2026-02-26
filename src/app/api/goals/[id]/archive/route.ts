import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const goal = await prisma.goal.findFirst({
      where: { id, userId: session.userId },
    });
    if (!goal) {
      return NextResponse.json(
        { error: "Doel niet gevonden" },
        { status: 404 }
      );
    }

    const updated = await prisma.goal.update({
      where: { id },
      data: { isArchived: !goal.isArchived },
      include: {
        category: true,
        milestones: { orderBy: { sortOrder: "asc" } },
      },
    });

    return NextResponse.json({ goal: updated });
  } catch (err) {
    console.error("PUT /api/goals/[id]/archive error:", err);
    return NextResponse.json(
      { error: "Archiveren mislukt" },
      { status: 500 }
    );
  }
}
