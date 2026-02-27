import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/tasks?status=...&projectId=...&priority=...&search=...
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const projectId = searchParams.get("projectId");
    const priority = searchParams.get("priority");
    const search = searchParams.get("search");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { userId: session.userId };

    if (status) {
      where.status = status;
    }
    if (projectId) {
      where.projectId = projectId === "none" ? null : projectId;
    }
    if (priority) {
      where.priority = priority;
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const tasks = await prisma.task.findMany({
      where,
      include: { project: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });

    // Include follow-ups with due dates from People module as virtual tasks
    const followUps = await prisma.personFollowUp.findMany({
      where: {
        isDone: false,
        dueDate: { not: null },
        person: { userId: session.userId, isArchived: false },
      },
      include: { person: { select: { id: true, name: true, avatarColor: true } } },
    });

    const virtualTasks = followUps.map((fu) => ({
      id: `followup_${fu.id}`,
      userId: session.userId,
      projectId: null,
      project: null,
      title: `📋 ${fu.text} — ${fu.person.name}`,
      description: null,
      status: "todo",
      priority: "medium",
      scheduledDate: null,
      scheduledTime: null,
      dueDate: fu.dueDate?.toISOString() ?? null,
      recurrenceRule: null,
      recurrenceDay: null,
      recurrenceEnd: null,
      estimatedDuration: 15,
      completedAt: null,
      sortOrder: 999999,
      createdAt: fu.createdAt.toISOString(),
      updatedAt: fu.updatedAt.toISOString(),
      _isFollowUp: true,
      _followUpId: fu.id,
      _personId: fu.person.id,
      _personName: fu.person.name,
    }));

    return NextResponse.json({ tasks: [...tasks, ...virtualTasks] });
  } catch (err) {
    console.error("GET /api/tasks error:", err);
    return NextResponse.json(
      { error: "Taken ophalen mislukt" },
      { status: 500 }
    );
  }
}

// POST /api/tasks
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      title,
      description,
      priority,
      status,
      scheduledDate,
      scheduledTime,
      dueDate,
      projectId,
      recurrenceRule,
      recurrenceDay,
      recurrenceEnd,
      estimatedDuration,
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: "Titel is verplicht" },
        { status: 400 }
      );
    }

    // Verify project belongs to user if provided
    if (projectId) {
      const project = await prisma.project.findFirst({
        where: { id: projectId, userId: session.userId },
      });
      if (!project) {
        return NextResponse.json(
          { error: "Project niet gevonden" },
          { status: 404 }
        );
      }
    }

    // Get max sortOrder for new task
    const maxSort = await prisma.task.aggregate({
      where: { userId: session.userId },
      _max: { sortOrder: true },
    });

    const task = await prisma.task.create({
      data: {
        userId: session.userId,
        title: title.trim(),
        description: description || null,
        priority: priority || "medium",
        status: status || "todo",
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        scheduledTime: scheduledTime || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        projectId: projectId || null,
        recurrenceRule: recurrenceRule || null,
        recurrenceDay: recurrenceDay ?? null,
        recurrenceEnd: recurrenceEnd ? new Date(recurrenceEnd) : null,
        estimatedDuration: estimatedDuration || 60,
        sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
      },
      include: { project: true },
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (err) {
    console.error("POST /api/tasks error:", err);
    return NextResponse.json(
      { error: "Taak aanmaken mislukt" },
      { status: 500 }
    );
  }
}
