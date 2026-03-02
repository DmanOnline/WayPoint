import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PUT /api/tasks/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.task.findFirst({
    where: { id, userId: session.userId },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Taak niet gevonden" },
      { status: 404 }
    );
  }

  // Verify project if changing
  if (body.projectId && body.projectId !== existing.projectId) {
    const project = await prisma.project.findFirst({
      where: { id: body.projectId, userId: session.userId },
    });
    if (!project) {
      return NextResponse.json(
        { error: "Project niet gevonden" },
        { status: 404 }
      );
    }
  }

  // Build update data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {};

  if (body.title !== undefined) data.title = body.title.trim();
  if (body.description !== undefined) data.description = body.description || null;
  if (body.priority !== undefined) data.priority = body.priority;
  if (body.projectId !== undefined) data.projectId = body.projectId || null;
  if (body.scheduledDate !== undefined)
    data.scheduledDate = body.scheduledDate ? new Date(body.scheduledDate) : null;
  if (body.scheduledTime !== undefined) data.scheduledTime = body.scheduledTime || null;
  if (body.dueDate !== undefined)
    data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  if (body.recurrenceRule !== undefined) data.recurrenceRule = body.recurrenceRule || null;
  if (body.recurrenceDay !== undefined) data.recurrenceDay = body.recurrenceDay ?? null;
  if (body.recurrenceEnd !== undefined)
    data.recurrenceEnd = body.recurrenceEnd ? new Date(body.recurrenceEnd) : null;
  if (body.estimatedDuration !== undefined) data.estimatedDuration = body.estimatedDuration;
  if (body.checklistItems !== undefined) data.checklistItems = body.checklistItems;

  // Handle status change
  if (body.status !== undefined) {
    data.status = body.status;
    if (body.status === "done" && existing.status !== "done") {
      data.completedAt = new Date();
    } else if (body.status !== "done" && existing.status === "done") {
      data.completedAt = null;
    }
  }

  const task = await prisma.task.update({
    where: { id },
    data,
    include: { project: true },
  });

  // If completing a recurring task, create the next occurrence
  if (
    body.status === "done" &&
    existing.status !== "done" &&
    existing.recurrenceRule
  ) {
    const nextDate = getNextOccurrence(
      existing.scheduledDate || existing.createdAt,
      existing.recurrenceRule,
      existing.recurrenceDay
    );

    if (
      !existing.recurrenceEnd ||
      nextDate <= new Date(existing.recurrenceEnd)
    ) {
      const maxSort = await prisma.task.aggregate({
        where: { userId: session.userId },
        _max: { sortOrder: true },
      });

      await prisma.task.create({
        data: {
          userId: session.userId,
          title: existing.title,
          description: existing.description,
          priority: existing.priority,
          status: "todo",
          scheduledDate: nextDate,
          scheduledTime: existing.scheduledTime,
          dueDate: existing.dueDate
            ? shiftDate(existing.dueDate, existing.scheduledDate || existing.createdAt, nextDate)
            : null,
          projectId: existing.projectId,
          recurrenceRule: existing.recurrenceRule,
          recurrenceDay: existing.recurrenceDay,
          recurrenceEnd: existing.recurrenceEnd,
          sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
        },
      });
    }
  }

  return NextResponse.json({ task });
}

// DELETE /api/tasks/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.task.findFirst({
    where: { id, userId: session.userId },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Taak niet gevonden" },
      { status: 404 }
    );
  }

  await prisma.task.delete({ where: { id } });

  return NextResponse.json({ success: true });
}

function getNextOccurrence(
  currentDate: Date,
  rule: string,
  recurrenceDay: number | null
): Date {
  const d = new Date(currentDate);

  switch (rule) {
    case "DAILY":
      d.setDate(d.getDate() + 1);
      break;
    case "WEEKLY":
      d.setDate(d.getDate() + 7);
      break;
    case "MONTHLY":
      d.setMonth(d.getMonth() + 1);
      if (recurrenceDay !== null) {
        d.setDate(recurrenceDay);
      }
      break;
    case "YEARLY":
      d.setFullYear(d.getFullYear() + 1);
      break;
  }

  return d;
}

function shiftDate(
  dueDate: Date,
  oldScheduled: Date,
  newScheduled: Date
): Date {
  const diff = dueDate.getTime() - oldScheduled.getTime();
  return new Date(newScheduled.getTime() + diff);
}
