import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// GET /api/tasks/insights
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const userId = session.userId;
  const now = new Date();

  // ── Streak ──────────────────────────────────────────────────────────────
  const streakLookback = new Date(now);
  streakLookback.setDate(streakLookback.getDate() - 100);
  streakLookback.setHours(0, 0, 0, 0);

  const completedForStreak = await prisma.task.findMany({
    where: { userId, completedAt: { gte: streakLookback } },
    select: { completedAt: true },
  });

  const completedDays = new Set(
    completedForStreak
      .filter((t) => t.completedAt !== null)
      .map((t) => toDateKey(t.completedAt!))
  );

  const todayKey = toDateKey(now);
  const yesterdayKey = toDateKey(new Date(now.getTime() - 86400000));

  let streak = 0;
  // Streak is alive if we've completed something today OR yesterday (so mid-day doesn't break it)
  const streakAnchor = completedDays.has(todayKey)
    ? todayKey
    : completedDays.has(yesterdayKey)
    ? yesterdayKey
    : null;

  if (streakAnchor) {
    const anchor = new Date(streakAnchor);
    let check = new Date(anchor);
    while (completedDays.has(toDateKey(check))) {
      streak++;
      check.setDate(check.getDate() - 1);
    }
  }

  // ── Weekly data (8 weken) ────────────────────────────────────────────────
  const thisMonday = getMondayOf(now);
  const eightWeeksAgo = new Date(thisMonday);
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 7 * 7);

  const [createdInRange, completedInRange] = await Promise.all([
    prisma.task.findMany({
      where: { userId, createdAt: { gte: eightWeeksAgo } },
      select: { createdAt: true },
    }),
    prisma.task.findMany({
      where: { userId, completedAt: { gte: eightWeeksAgo } },
      select: { completedAt: true },
    }),
  ]);

  const weeklyData: Array<{ week: string; created: number; completed: number }> = [];
  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date(thisMonday);
    weekStart.setDate(weekStart.getDate() - i * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const created = createdInRange.filter(
      (t) => t.createdAt >= weekStart && t.createdAt <= weekEnd
    ).length;
    const completed = completedInRange.filter(
      (t) => t.completedAt !== null && t.completedAt >= weekStart && t.completedAt <= weekEnd
    ).length;

    const day = weekStart.getDate();
    const month = weekStart.getMonth() + 1;
    const label = i === 0 ? "Nu" : `${day}/${month}`;

    weeklyData.push({ week: label, created, completed });
  }

  const thisWeek = weeklyData[weeklyData.length - 1];
  const completionRateThisWeek =
    thisWeek.created > 0
      ? Math.round((thisWeek.completed / thisWeek.created) * 100)
      : 0;

  // ── Project breakdown ────────────────────────────────────────────────────
  const projects = await prisma.project.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      color: true,
      tasks: { select: { status: true } },
    },
  });

  const projectBreakdown = projects
    .map((p) => ({
      projectId: p.id,
      name: p.name,
      color: p.color,
      open: p.tasks.filter((t) => t.status !== "done").length,
      done: p.tasks.filter((t) => t.status === "done").length,
    }))
    .filter((p) => p.open + p.done > 0)
    .sort((a, b) => b.open + b.done - (a.open + a.done));

  // ── Priority breakdown ───────────────────────────────────────────────────
  const allTasks = await prisma.task.findMany({
    where: { userId },
    select: { priority: true, status: true },
  });

  const priorityMap: Record<string, { open: number; done: number }> = {
    high: { open: 0, done: 0 },
    medium: { open: 0, done: 0 },
    low: { open: 0, done: 0 },
  };
  for (const t of allTasks) {
    const bucket = priorityMap[t.priority];
    if (!bucket) continue;
    if (t.status === "done") bucket.done++;
    else bucket.open++;
  }

  const priorityBreakdown = (["high", "medium", "low"] as const).map((p) => ({
    priority: p,
    ...priorityMap[p],
  }));

  return NextResponse.json({
    streak,
    completionRateThisWeek,
    weeklyData,
    projectBreakdown,
    priorityBreakdown,
  });
}
