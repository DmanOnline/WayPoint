import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
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
      include: {
        category: true,
        milestones: { orderBy: { sortOrder: "asc" } },
      },
    });
    if (!goal) {
      return NextResponse.json(
        { error: "Doel niet gevonden" },
        { status: 404 }
      );
    }

    return NextResponse.json({ goal });
  } catch (err) {
    console.error("GET /api/goals/[id] error:", err);
    return NextResponse.json(
      { error: "Doel ophalen mislukt" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();

    const goal = await prisma.goal.findFirst({
      where: { id, userId: session.userId },
    });
    if (!goal) {
      return NextResponse.json(
        { error: "Doel niet gevonden" },
        { status: 404 }
      );
    }

    if (body.categoryId) {
      const category = await prisma.goalCategory.findFirst({
        where: { id: body.categoryId, userId: session.userId },
      });
      if (!category) {
        return NextResponse.json(
          { error: "Categorie niet gevonden" },
          { status: 404 }
        );
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {};
    if (body.title !== undefined) data.title = body.title.trim();
    if (body.description !== undefined) data.description = body.description || null;
    if (body.priority !== undefined) data.priority = body.priority;
    if (body.color !== undefined) data.color = body.color;
    if (body.categoryId !== undefined) data.categoryId = body.categoryId || null;
    if (body.targetDate !== undefined) {
      data.targetDate = body.targetDate ? new Date(body.targetDate + "T00:00:00.000Z") : null;
    }
    if (body.manualProgress !== undefined) {
      data.manualProgress = body.manualProgress !== null
        ? Math.max(0, Math.min(100, Math.round(body.manualProgress)))
        : null;
    }
    if (body.isArchived !== undefined) data.isArchived = body.isArchived;
    if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;

    if (body.status !== undefined) {
      data.status = body.status;
      if (body.status === "completed" && goal.status !== "completed") {
        data.completedAt = new Date();
      } else if (body.status !== "completed" && goal.status === "completed") {
        data.completedAt = null;
      }
    }

    const updated = await prisma.goal.update({
      where: { id },
      data,
      include: {
        category: true,
        milestones: { orderBy: { sortOrder: "asc" } },
      },
    });

    return NextResponse.json({ goal: updated });
  } catch (err) {
    console.error("PUT /api/goals/[id] error:", err);
    return NextResponse.json(
      { error: "Doel bijwerken mislukt" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    await prisma.goal.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/goals/[id] error:", err);
    return NextResponse.json(
      { error: "Doel verwijderen mislukt" },
      { status: 500 }
    );
  }
}
