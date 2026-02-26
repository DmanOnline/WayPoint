import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    const milestone = await prisma.goalMilestone.findUnique({
      where: { id },
      include: { goal: true },
    });
    if (!milestone || milestone.goal.userId !== session.userId) {
      return NextResponse.json(
        { error: "Mijlpaal niet gevonden" },
        { status: 404 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {};
    if (body.title !== undefined) data.title = body.title.trim();
    if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;

    const updated = await prisma.goalMilestone.update({
      where: { id },
      data,
    });

    return NextResponse.json({ milestone: updated });
  } catch (err) {
    console.error("PUT /api/goals/milestones/[id] error:", err);
    return NextResponse.json(
      { error: "Mijlpaal bijwerken mislukt" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const milestone = await prisma.goalMilestone.findUnique({
      where: { id },
      include: { goal: true },
    });
    if (!milestone || milestone.goal.userId !== session.userId) {
      return NextResponse.json(
        { error: "Mijlpaal niet gevonden" },
        { status: 404 }
      );
    }

    const updated = await prisma.goalMilestone.update({
      where: { id },
      data: {
        isCompleted: !milestone.isCompleted,
        completedAt: !milestone.isCompleted ? new Date() : null,
      },
    });

    return NextResponse.json({ milestone: updated });
  } catch (err) {
    console.error("PATCH /api/goals/milestones/[id] error:", err);
    return NextResponse.json(
      { error: "Mijlpaal bijwerken mislukt" },
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

    const milestone = await prisma.goalMilestone.findUnique({
      where: { id },
      include: { goal: true },
    });
    if (!milestone || milestone.goal.userId !== session.userId) {
      return NextResponse.json(
        { error: "Mijlpaal niet gevonden" },
        { status: 404 }
      );
    }

    await prisma.goalMilestone.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/goals/milestones/[id] error:", err);
    return NextResponse.json(
      { error: "Mijlpaal verwijderen mislukt" },
      { status: 500 }
    );
  }
}
