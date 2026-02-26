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

    const habit = await prisma.habit.findFirst({
      where: { id, userId: session.userId },
    });
    if (!habit) {
      return NextResponse.json(
        { error: "Habit niet gevonden" },
        { status: 404 }
      );
    }

    if (body.categoryId) {
      const category = await prisma.habitCategory.findFirst({
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
    if (body.name !== undefined) data.name = body.name.trim();
    if (body.description !== undefined) data.description = body.description || null;
    if (body.color !== undefined) data.color = body.color;
    if (body.icon !== undefined) data.icon = body.icon || null;
    if (body.categoryId !== undefined) data.categoryId = body.categoryId || null;
    if (body.frequencyType !== undefined) data.frequencyType = body.frequencyType;
    if (body.frequencyTarget !== undefined) data.frequencyTarget = body.frequencyTarget;
    if (body.frequencyPeriod !== undefined) data.frequencyPeriod = body.frequencyPeriod;
    if (body.frequencyInterval !== undefined) data.frequencyInterval = body.frequencyInterval;
    if (body.frequencyDays !== undefined) {
      data.frequencyDays = body.frequencyDays ? JSON.stringify(body.frequencyDays) : null;
    }
    if (body.startDate !== undefined) data.startDate = new Date(body.startDate + "T00:00:00.000Z");
    if (body.reminderTime !== undefined) data.reminderTime = body.reminderTime || null;
    if (body.isArchived !== undefined) data.isArchived = body.isArchived;
    if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;

    const updated = await prisma.habit.update({
      where: { id },
      data,
      include: { category: true, completions: true },
    });

    return NextResponse.json({ habit: updated });
  } catch (err) {
    console.error("PUT /api/habits/[id] error:", err);
    return NextResponse.json(
      { error: "Habit bijwerken mislukt" },
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

    const habit = await prisma.habit.findFirst({
      where: { id, userId: session.userId },
    });
    if (!habit) {
      return NextResponse.json(
        { error: "Habit niet gevonden" },
        { status: 404 }
      );
    }

    await prisma.habit.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/habits/[id] error:", err);
    return NextResponse.json(
      { error: "Habit verwijderen mislukt" },
      { status: 500 }
    );
  }
}
