import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST: Increment completion count (or create new completion)
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { habitId, date, note } = body;

    if (!habitId || !date) {
      return NextResponse.json(
        { error: "habitId en date zijn verplicht" },
        { status: 400 }
      );
    }

    const habit = await prisma.habit.findFirst({
      where: { id: habitId, userId: session.userId },
    });
    if (!habit) {
      return NextResponse.json(
        { error: "Habit niet gevonden" },
        { status: 404 }
      );
    }

    // Block future dates
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const targetDate = new Date(date + "T00:00:00.000Z");
    if (targetDate > today) {
      return NextResponse.json(
        { error: "Kan geen completions voor toekomstige data toevoegen" },
        { status: 400 }
      );
    }

    const completedAt = new Date(date + "T00:00:00.000Z");

    // Multi-daily: X times per day
    const isMultiDaily = habit.frequencyType === "custom"
      && habit.frequencyPeriod === "day"
      && habit.frequencyTarget > 1;

    if (isMultiDaily) {
      const existing = await prisma.habitCompletion.findUnique({
        where: { habitId_completedAt: { habitId, completedAt } },
      });

      if (existing) {
        if (existing.count >= habit.frequencyTarget) {
          return NextResponse.json({ completion: existing });
        }
        const updated = await prisma.habitCompletion.update({
          where: { id: existing.id },
          data: { count: existing.count + 1, note: note || existing.note },
        });
        return NextResponse.json({ completion: updated });
      }
    }

    const completion = await prisma.habitCompletion.upsert({
      where: {
        habitId_completedAt: { habitId, completedAt },
      },
      update: { note: note || null, count: 1 },
      create: {
        habitId,
        completedAt,
        count: 1,
        note: note || null,
      },
    });

    return NextResponse.json({ completion }, { status: 201 });
  } catch (err) {
    console.error("POST /api/habits/completions error:", err);
    return NextResponse.json(
      { error: "Completion opslaan mislukt" },
      { status: 500 }
    );
  }
}

// DELETE: Decrement count or delete completion entirely
export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { habitId, date } = body;

    if (!habitId || !date) {
      return NextResponse.json(
        { error: "habitId en date zijn verplicht" },
        { status: 400 }
      );
    }

    const habit = await prisma.habit.findFirst({
      where: { id: habitId, userId: session.userId },
    });
    if (!habit) {
      return NextResponse.json(
        { error: "Habit niet gevonden" },
        { status: 404 }
      );
    }

    const completedAt = new Date(date + "T00:00:00.000Z");

    const isMultiDaily = habit.frequencyType === "custom"
      && habit.frequencyPeriod === "day"
      && habit.frequencyTarget > 1;

    if (isMultiDaily) {
      const existing = await prisma.habitCompletion.findUnique({
        where: { habitId_completedAt: { habitId, completedAt } },
      });

      if (existing && existing.count > 1) {
        const updated = await prisma.habitCompletion.update({
          where: { id: existing.id },
          data: { count: existing.count - 1 },
        });
        return NextResponse.json({ completion: updated });
      }
    }

    await prisma.habitCompletion.deleteMany({
      where: { habitId, completedAt },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/habits/completions error:", err);
    return NextResponse.json(
      { error: "Completion verwijderen mislukt" },
      { status: 500 }
    );
  }
}
