import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMonthKey, getMonthRange } from "@/lib/types/finance";
import {
  CONTACT_FREQUENCIES,
  type RelationshipHealth,
} from "@/lib/types/people";
import { expandRecurrences } from "@/lib/calendar";

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function startOfDayUTC(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

function endOfDayUTC(dateStr: string): Date {
  return new Date(`${dateStr}T23:59:59.999Z`);
}

// GET /api/dashboard
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const userId = session.userId;
  const now = new Date();
  const today = toDateStr(now);
  const todayStart = startOfDayUTC(today);
  const todayEnd = endOfDayUTC(today);

  const tomorrowDate = new Date(now);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = toDateStr(tomorrowDate);
  const tomorrowStart = startOfDayUTC(tomorrow);
  const tomorrowEnd = endOfDayUTC(tomorrow);

  // 7 days ago for journal sparkline
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const sevenDaysAgoStr = toDateStr(sevenDaysAgo);

  // Current month for finance
  const monthKey = getMonthKey(now);
  const { start: monthStart, end: monthEnd } = getMonthRange(monthKey);

  try {
    // ═══ Parallel queries ═══
    const [
      // Tasks
      todoTasks,
      completedTodayTasks,
      // Calendar events (non-recurring, today only)
      todayEvents,
      // Habits
      activeHabits,
      // Journal
      journalLast7,
      // Goals
      activeGoals,
      // People
      allPeople,
      overdueFollowUpsCount,
      // Finance
      financeAccounts,
      financeCategoryGroups,
      financeAllBudgets,
      financeMonthTransactions,
      financeCumulativeTransactions,
      financeTargets,
      // Notes
      notesTotal,
      notesRecent,
      notesPinned,
      // Quote
      quoteData,
      // Tomorrow's calendar events
      tomorrowEventsRaw,
    ] = await Promise.all([
      // ── Tasks: all todo/in-progress ──
      prisma.task.findMany({
        where: { userId, status: { in: ["todo", "in-progress"] } },
        select: {
          id: true,
          title: true,
          priority: true,
          status: true,
          scheduledDate: true,
          scheduledTime: true,
          dueDate: true,
          project: { select: { name: true, color: true } },
        },
        orderBy: [{ priority: "desc" }, { sortOrder: "asc" }],
      }),

      // ── Tasks: completed today ──
      prisma.task.count({
        where: {
          userId,
          status: "done",
          completedAt: { gte: todayStart, lte: todayEnd },
        },
      }),

      // ── Calendar: today's events (non-recurring + recurring masters + exceptions) ──
      prisma.calendarEvent.findMany({
        where: {
          userId,
          isLocallyDeleted: false,
          OR: [
            // Non-recurring events that overlap today
            { recurrenceRule: null, parentEventId: null, startDate: { lte: todayEnd }, endDate: { gte: todayStart } },
            // Recurring master events (will expand in processing)
            { recurrenceRule: { not: null }, parentEventId: null, startDate: { lte: todayEnd } },
            // Exception events (edited single occurrences) that overlap today
            { parentEventId: { not: null }, startDate: { lte: todayEnd }, endDate: { gte: todayStart } },
          ],
        },
        include: { subCalendar: { select: { id: true, name: true, color: true, isVisible: true } } },
        orderBy: { startDate: "asc" },
      }),

      // ── Habits: active with completions last 90 days ──
      prisma.habit.findMany({
        where: { userId, isArchived: false },
        include: {
          completions: {
            where: {
              completedAt: { gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) },
            },
            orderBy: { completedAt: "desc" },
          },
        },
        orderBy: { sortOrder: "asc" },
      }),

      // ── Journal: last 7 days ──
      prisma.journalEntry.findMany({
        where: {
          userId,
          date: { gte: startOfDayUTC(sevenDaysAgoStr), lte: todayEnd },
        },
        select: { date: true, mood: true, energy: true },
        orderBy: { date: "asc" },
      }),

      // ── Goals: active with milestones ──
      prisma.goal.findMany({
        where: { userId, status: "active", isArchived: false },
        include: {
          milestones: {
            select: { id: true, isCompleted: true },
            orderBy: { sortOrder: "asc" },
          },
        },
        orderBy: { sortOrder: "asc" },
        take: 5,
      }),

      // ── People: all non-archived ──
      prisma.person.findMany({
        where: { userId, isArchived: false },
        select: {
          id: true,
          name: true,
          avatarColor: true,
          birthday: true,
          contactFrequency: true,
          lastContactedAt: true,
        },
      }),

      // ── People: overdue follow-ups count ──
      prisma.personFollowUp.count({
        where: {
          isDone: false,
          dueDate: { lt: todayStart },
          person: { userId, isArchived: false },
        },
      }),

      // ── Finance: accounts ──
      prisma.financeAccount.findMany({
        where: { userId, isArchived: false },
        select: { id: true, startBalance: true, onBudget: true },
      }),

      // ── Finance: category groups ──
      prisma.financeCategoryGroup.findMany({
        where: { userId, isHidden: false },
        include: {
          categories: {
            where: { isHidden: false },
            select: { id: true },
          },
        },
      }),

      // ── Finance: all budgets through this month ──
      prisma.financeMonthlyBudget.findMany({
        where: { userId, month: { lte: monthKey } },
        select: { categoryId: true, assigned: true, month: true },
      }),

      // ── Finance: transactions this month ──
      prisma.financeTransaction.findMany({
        where: {
          userId,
          categoryId: { not: null },
          date: { gte: monthStart, lt: monthEnd },
        },
        select: { categoryId: true, amount: true },
      }),

      // ── Finance: cumulative transactions ──
      prisma.financeTransaction.findMany({
        where: {
          userId,
          categoryId: { not: null },
          date: { lt: monthEnd },
        },
        select: { categoryId: true, amount: true },
      }),

      // ── Finance: targets ──
      prisma.financeCategoryTarget.findMany({
        where: { userId },
        select: { categoryId: true, amount: true, refillType: true },
      }),

      // ── Notes: counts ──
      prisma.note.count({ where: { userId, isArchived: false } }),

      prisma.note.count({
        where: {
          userId,
          isArchived: false,
          updatedAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),

      prisma.note.count({ where: { userId, isArchived: false, isPinned: true } }),

      // ── Quote ──
      fetchQuote(),

      // ── Calendar: tomorrow's events ──
      prisma.calendarEvent.findMany({
        where: {
          userId,
          isLocallyDeleted: false,
          OR: [
            { recurrenceRule: null, parentEventId: null, startDate: { lte: tomorrowEnd }, endDate: { gte: tomorrowStart } },
            { recurrenceRule: { not: null }, parentEventId: null, startDate: { lte: tomorrowEnd } },
            { parentEventId: { not: null }, startDate: { lte: tomorrowEnd }, endDate: { gte: tomorrowStart } },
          ],
        },
        include: { subCalendar: { select: { id: true, name: true, color: true, isVisible: true } } },
        orderBy: { startDate: "asc" },
      }),
    ]);

    // ═══ Process Tasks ═══
    let tasksToday = 0;
    let overdueCount = 0;
    const todayItems: Array<{
      id: string;
      title: string;
      priority: string;
      scheduledTime: string | null;
      dueDate: string | null;
      project: { name: string; color: string } | null;
    }> = [];

    for (const task of todoTasks) {
      const scheduled = task.scheduledDate ? toDateStr(task.scheduledDate) : null;
      const due = task.dueDate ? toDateStr(task.dueDate) : null;

      if (scheduled === today || due === today) {
        tasksToday++;
        todayItems.push({
          id: task.id,
          title: task.title,
          priority: task.priority,
          scheduledTime: task.scheduledTime,
          dueDate: due,
          project: task.project,
        });
      }

      if (due && due < today) {
        overdueCount++;
      }
    }

    // Sort today items: timed first, then by time
    todayItems.sort((a, b) => {
      if (a.scheduledTime && !b.scheduledTime) return -1;
      if (!a.scheduledTime && b.scheduledTime) return 1;
      if (a.scheduledTime && b.scheduledTime) return a.scheduledTime.localeCompare(b.scheduledTime);
      return 0;
    });

    // ═══ Process Events ═══
    // Separate by type
    const nonRecurringEvents = todayEvents.filter((e) => !e.recurrenceRule && !e.parentEventId);
    const exceptionEvents = todayEvents.filter((e) => e.parentEventId !== null);
    const recurringMasters = todayEvents.filter((e) => e.recurrenceRule !== null);

    // Dates that have exception events (skip these when expanding recurring masters)
    const exceptionDatesByParent = new Map<string, Set<string>>();
    for (const ex of exceptionEvents) {
      if (!ex.parentEventId || !ex.originalDate) continue;
      const dateKey = toDateStr(ex.originalDate);
      if (!exceptionDatesByParent.has(ex.parentEventId)) {
        exceptionDatesByParent.set(ex.parentEventId, new Set());
      }
      exceptionDatesByParent.get(ex.parentEventId)!.add(dateKey);
    }

    // Expand recurring masters for today
    const expandedRecurring: typeof nonRecurringEvents = [];
    for (const master of recurringMasters) {
      if (!master.recurrenceRule) continue;
      const exDates = exceptionDatesByParent.get(master.id) ?? new Set<string>();
      const occurrences = expandRecurrences(
        { ...master, recurrenceRule: master.recurrenceRule },
        todayStart,
        todayEnd,
        exDates
      );
      if (occurrences.length > 0) {
        expandedRecurring.push({
          ...master,
          startDate: occurrences[0].start,
          endDate: occurrences[0].end,
        });
      }
    }

    // Birthday events for today from allPeople (already fetched)
    const birthdayItems: Array<{ id: string; title: string; startDate: string; endDate: string; isAllDay: boolean; color: string }> = [];
    const todayMonth = now.getMonth();
    const todayDay = now.getDate();
    const todayYear = now.getFullYear();
    for (const person of allPeople) {
      if (!person.birthday) continue;
      const bday = new Date(person.birthday);
      if (bday.getMonth() === todayMonth && bday.getDate() === todayDay) {
        const age = todayYear - bday.getFullYear();
        birthdayItems.push({
          id: `birthday_${person.id}_${todayYear}`,
          title: `🎂 ${person.name}${age > 0 ? ` (${age})` : ""}`,
          startDate: todayStart.toISOString(),
          endDate: todayEnd.toISOString(),
          isAllDay: true,
          color: person.avatarColor || "#ec4899",
        });
      }
    }

    // Combine all event types
    const allVisibleEvents = [
      ...nonRecurringEvents.filter((e) => e.subCalendar.isVisible),
      ...exceptionEvents.filter((e) => e.subCalendar.isVisible),
      ...expandedRecurring.filter((e) => e.subCalendar.isVisible),
    ];
    const eventItems = [
      ...allVisibleEvents.map((e) => ({
        id: e.id,
        title: e.title,
        startDate: e.startDate instanceof Date ? e.startDate.toISOString() : e.startDate,
        endDate: e.endDate instanceof Date ? e.endDate.toISOString() : e.endDate,
        isAllDay: e.isAllDay,
        color: e.subCalendar.color,
      })),
      ...birthdayItems,
    ].sort((a, b) => a.startDate.localeCompare(b.startDate));

    // ═══ Process Tomorrow ═══
    const tomorrowTaskItems: typeof todayItems = [];
    for (const task of todoTasks) {
      const scheduled = task.scheduledDate ? toDateStr(task.scheduledDate) : null;
      const due = task.dueDate ? toDateStr(task.dueDate) : null;
      if (scheduled === tomorrow || due === tomorrow) {
        tomorrowTaskItems.push({
          id: task.id,
          title: task.title,
          priority: task.priority,
          scheduledTime: task.scheduledTime,
          dueDate: due,
          project: task.project,
        });
      }
    }
    tomorrowTaskItems.sort((a, b) => {
      if (a.scheduledTime && !b.scheduledTime) return -1;
      if (!a.scheduledTime && b.scheduledTime) return 1;
      if (a.scheduledTime && b.scheduledTime) return a.scheduledTime.localeCompare(b.scheduledTime);
      return 0;
    });

    // Tomorrow's calendar events (same expand logic as today)
    const tNonRecurring = tomorrowEventsRaw.filter((e) => !e.recurrenceRule && !e.parentEventId);
    const tExceptions = tomorrowEventsRaw.filter((e) => e.parentEventId !== null);
    const tMasters = tomorrowEventsRaw.filter((e) => e.recurrenceRule !== null);
    const tExDatesByParent = new Map<string, Set<string>>();
    for (const ex of tExceptions) {
      if (!ex.parentEventId || !ex.originalDate) continue;
      if (!tExDatesByParent.has(ex.parentEventId)) tExDatesByParent.set(ex.parentEventId, new Set());
      tExDatesByParent.get(ex.parentEventId)!.add(toDateStr(ex.originalDate));
    }
    const tExpandedRecurring: typeof tNonRecurring = [];
    for (const master of tMasters) {
      if (!master.recurrenceRule) continue;
      const exDates = tExDatesByParent.get(master.id) ?? new Set<string>();
      const occurrences = expandRecurrences({ ...master, recurrenceRule: master.recurrenceRule }, tomorrowStart, tomorrowEnd, exDates);
      if (occurrences.length > 0) tExpandedRecurring.push({ ...master, startDate: occurrences[0].start, endDate: occurrences[0].end });
    }
    // Tomorrow birthdays
    const tomorrowMonth = tomorrowDate.getMonth();
    const tomorrowDay = tomorrowDate.getDate();
    const tomorrowEventItems = [
      ...[...tNonRecurring, ...tExceptions, ...tExpandedRecurring]
        .filter((e) => e.subCalendar.isVisible)
        .map((e) => ({
          id: e.id,
          title: e.title,
          startDate: e.startDate instanceof Date ? e.startDate.toISOString() : e.startDate,
          endDate: e.endDate instanceof Date ? e.endDate.toISOString() : e.endDate,
          isAllDay: e.isAllDay,
          color: e.subCalendar.color,
        })),
      ...allPeople
        .filter((p) => {
          if (!p.birthday) return false;
          const bday = new Date(p.birthday);
          return bday.getMonth() === tomorrowMonth && bday.getDate() === tomorrowDay;
        })
        .map((p) => {
          const bday = new Date(p.birthday!);
          const age = tomorrowDate.getFullYear() - bday.getFullYear();
          return {
            id: `birthday_${p.id}_${tomorrowDate.getFullYear()}`,
            title: `🎂 ${p.name}${age > 0 ? ` (${age})` : ""}`,
            startDate: tomorrowStart.toISOString(),
            endDate: tomorrowEnd.toISOString(),
            isAllDay: true,
            color: p.avatarColor || "#ec4899",
          };
        }),
    ].sort((a, b) => a.startDate.localeCompare(b.startDate));

    // ═══ Process Habits ═══
    const todayDate = new Date(today);
    let habitsCompletedToday = 0;
    const habitItems = activeHabits.map((habit) => {
      // Check if due today
      const isDue = isHabitDueOnDate(habit, todayDate);

      // Today's completion
      const todayCompletion = habit.completions.find((c) =>
        toDateStr(c.completedAt) === today
      );
      const target = getDailyTarget(habit);
      const isCompleted = todayCompletion ? todayCompletion.count >= target : false;

      if (isCompleted && isDue) habitsCompletedToday++;

      // Calculate streak
      const completionDates = new Set(
        habit.completions.map((c) => toDateStr(c.completedAt))
      );
      let streak = 0;
      for (let i = 0; i < 90; i++) {
        const d = new Date(todayDate);
        d.setDate(d.getDate() - i);
        const ds = toDateStr(d);
        if (completionDates.has(ds)) {
          streak++;
        } else if (i === 0) {
          // Today might not be done yet
          continue;
        } else {
          break;
        }
      }

      // Frequency label
      const freqLabel = formatFrequencyShort(habit);

      return {
        id: habit.id,
        name: habit.name,
        color: habit.color,
        icon: habit.icon,
        isDue,
        isCompletedToday: isCompleted,
        currentStreak: streak,
        frequencyLabel: freqLabel,
      };
    });

    const dueHabits = habitItems.filter((h) => h.isDue);

    // ═══ Process Journal ═══
    const journalByDate = new Map(
      journalLast7.map((e) => [toDateStr(e.date), e])
    );
    const todayEntry = journalByDate.get(today);

    // Build 7-day array
    const last7Days: Array<{ date: string; mood: number | null; energy: number | null }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(todayDate);
      d.setDate(d.getDate() - i);
      const ds = toDateStr(d);
      const entry = journalByDate.get(ds);
      last7Days.push({
        date: ds,
        mood: entry?.mood ?? null,
        energy: entry?.energy ?? null,
      });
    }

    // Journal streak
    let journalStreak = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(todayDate);
      d.setDate(d.getDate() - i);
      const ds = toDateStr(d);
      if (journalByDate.has(ds) || (i === 0 && !journalByDate.has(ds))) {
        // For i===0 (today), if no entry yet, skip but don't break
        if (i === 0 && !journalByDate.has(ds)) continue;
        journalStreak++;
      } else {
        break;
      }
    }

    // ═══ Process Goals ═══
    const goalsData = activeGoals.map((goal) => {
      const total = goal.milestones.length;
      const completed = goal.milestones.filter((m) => m.isCompleted).length;
      const progress = goal.manualProgress != null
        ? goal.manualProgress
        : total > 0
          ? Math.round((completed / total) * 100)
          : 0;

      return {
        id: goal.id,
        title: goal.title,
        color: goal.color,
        progress,
        targetDate: goal.targetDate?.toISOString() ?? null,
        milestonesCompleted: completed,
        milestonesTotal: total,
      };
    });

    // ═══ Process People ═══
    const needsAttention: Array<{
      id: string;
      name: string;
      avatarColor: string;
      daysSinceContact: number | null;
      health: RelationshipHealth;
    }> = [];

    const upcomingBirthdays: Array<{
      id: string;
      name: string;
      avatarColor: string;
      daysUntil: number;
      date: string;
    }> = [];

    for (const person of allPeople) {
      // Relationship health
      if (person.contactFrequency) {
        const health = getHealth(person.lastContactedAt, person.contactFrequency);
        if (health === "warning" || health === "neglected") {
          const since = person.lastContactedAt
            ? Math.floor((now.getTime() - new Date(person.lastContactedAt).getTime()) / (1000 * 60 * 60 * 24))
            : null;
          needsAttention.push({
            id: person.id,
            name: person.name,
            avatarColor: person.avatarColor,
            daysSinceContact: since,
            health,
          });
        }
      }

      // Upcoming birthdays (next 14 days)
      if (person.birthday) {
        const bday = new Date(person.birthday);
        const thisYearBday = new Date(now.getFullYear(), bday.getMonth(), bday.getDate());
        let daysUntil = Math.ceil((thisYearBday.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntil < 0) {
          const nextYearBday = new Date(now.getFullYear() + 1, bday.getMonth(), bday.getDate());
          daysUntil = Math.ceil((nextYearBday.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / (1000 * 60 * 60 * 24));
        }
        if (daysUntil >= 0 && daysUntil <= 14) {
          const MONTHS = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
          upcomingBirthdays.push({
            id: person.id,
            name: person.name,
            avatarColor: person.avatarColor,
            daysUntil,
            date: `${bday.getDate()} ${MONTHS[bday.getMonth()]}`,
          });
        }
      }
    }

    // Sort: most neglected first, closest birthdays first
    needsAttention.sort((a, b) => (b.daysSinceContact ?? 999) - (a.daysSinceContact ?? 999));
    upcomingBirthdays.sort((a, b) => a.daysUntil - b.daysUntil);

    // ═══ Process Finance ═══
    const allCategoryIds = financeCategoryGroups.flatMap((g) => g.categories.map((c) => c.id));

    // Budget calculations (simplified from budget route)
    const budgetsByCat = new Map<string, number>();
    const budgetsThisMonth = new Map<string, number>();
    for (const b of financeAllBudgets) {
      budgetsByCat.set(b.categoryId, (budgetsByCat.get(b.categoryId) || 0) + b.assigned);
      if (b.month === monthKey) {
        budgetsThisMonth.set(b.categoryId, b.assigned);
      }
    }

    const cumulativeActivityByCat = new Map<string, number>();
    for (const t of financeCumulativeTransactions) {
      if (t.categoryId) {
        cumulativeActivityByCat.set(t.categoryId, (cumulativeActivityByCat.get(t.categoryId) || 0) + t.amount);
      }
    }

    const activityByCat = new Map<string, number>();
    for (const t of financeMonthTransactions) {
      if (t.categoryId) {
        activityByCat.set(t.categoryId, (activityByCat.get(t.categoryId) || 0) + t.amount);
      }
    }

    const targetByCat = new Map(financeTargets.map((t) => [t.categoryId, t]));

    // Budget health
    let onTrack = 0;
    let underfunded = 0;
    let overspent = 0;

    for (const catId of allCategoryIds) {
      const available = (budgetsByCat.get(catId) || 0) + (cumulativeActivityByCat.get(catId) || 0);
      const target = targetByCat.get(catId);

      if (available < 0) {
        overspent++;
      } else if (target) {
        const assigned = budgetsThisMonth.get(catId) || 0;
        let needed = 0;
        if (target.refillType === "refill") {
          const activity = activityByCat.get(catId) || 0;
          const carryover = Math.max(0, available - assigned - activity);
          needed = Math.max(0, target.amount - assigned - carryover);
        } else {
          needed = Math.max(0, target.amount - assigned);
        }
        if (needed > 0) {
          underfunded++;
        } else {
          onTrack++;
        }
      } else {
        onTrack++;
      }
    }

    // Total balance
    const accountIds = financeAccounts.map((a) => a.id);
    let totalBalance = financeAccounts.reduce((s, a) => s + a.startBalance, 0);
    if (accountIds.length > 0) {
      const txSum = await prisma.financeTransaction.aggregate({
        where: { userId, accountId: { in: accountIds } },
        _sum: { amount: true },
      });
      totalBalance += txSum._sum.amount || 0;
    }

    // Ready to assign
    const budgetAccountIds = financeAccounts.filter((a) => a.onBudget).map((a) => a.id);
    let readyToAssign = 0;
    if (budgetAccountIds.length > 0) {
      const totalStartBalance = financeAccounts.filter((a) => a.onBudget).reduce((s, a) => s + a.startBalance, 0);
      const budgetTxSum = await prisma.financeTransaction.aggregate({
        where: { userId, accountId: { in: budgetAccountIds }, date: { lt: monthEnd } },
        _sum: { amount: true },
      });
      const totalBudgetBalance = totalStartBalance + (budgetTxSum._sum.amount || 0);
      const totalAvailable = allCategoryIds.reduce((sum, catId) => {
        return sum + (budgetsByCat.get(catId) || 0) + (cumulativeActivityByCat.get(catId) || 0);
      }, 0);
      readyToAssign = totalBudgetBalance - totalAvailable;
    }

    // ═══ Build Response ═══
    return NextResponse.json({
      today,
      tomorrow,
      tomorrowAgenda: {
        tasks: tomorrowTaskItems.slice(0, 10),
        events: tomorrowEventItems,
      },
      tasks: {
        todayCount: tasksToday,
        overdueCount,
        completedTodayCount: completedTodayTasks,
        todayItems: todayItems.slice(0, 10),
      },
      events: {
        todayCount: eventItems.length,
        items: eventItems,
      },
      habits: {
        totalActive: dueHabits.length,
        completedToday: habitsCompletedToday,
        items: habitItems,
      },
      journal: {
        hasEntryToday: !!todayEntry,
        todayMood: todayEntry?.mood ?? null,
        todayEnergy: todayEntry?.energy ?? null,
        last7Days,
        currentStreak: journalStreak,
      },
      goals: goalsData,
      people: {
        needsAttention: needsAttention.slice(0, 5),
        upcomingBirthdays: upcomingBirthdays.slice(0, 3),
        overdueFollowUps: overdueFollowUpsCount,
      },
      finance: {
        readyToAssign,
        totalBalance,
        budgetHealth: { onTrack, underfunded, overspent },
      },
      notes: {
        totalCount: notesTotal,
        recentCount: notesRecent,
        pinnedCount: notesPinned,
      },
      quote: quoteData,
    });
  } catch (err) {
    console.error("GET /api/dashboard error:", err);
    return NextResponse.json({ error: "Dashboard data ophalen mislukt" }, { status: 500 });
  }
}

// ═══ Helper functions ═══

async function fetchQuote(): Promise<{ text: string; author: string }> {
  try {
    const res = await fetch("https://zenquotes.io/api/today", {
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error();
    const data = await res.json();
    return { text: data[0].q, author: data[0].a };
  } catch {
    return {
      text: "The only way to do great work is to love what you do.",
      author: "Steve Jobs",
    };
  }
}

function getHealth(lastContactedAt: Date | null, frequency: string): RelationshipHealth | null {
  const freq = CONTACT_FREQUENCIES.find((f) => f.value === frequency);
  if (!freq) return null;
  if (!lastContactedAt) return "neglected";
  const since = Math.floor((Date.now() - new Date(lastContactedAt).getTime()) / (1000 * 60 * 60 * 24));
  if (since < freq.days * 0.7) return "good";
  if (since < freq.days) return "okay";
  if (since < freq.days * 1.5) return "warning";
  return "neglected";
}

interface HabitLike {
  isArchived: boolean;
  frequencyType: string;
  frequencyInterval: number;
  frequencyDays: string | null;
  frequencyTarget: number;
  frequencyPeriod: string;
  startDate: Date;
  createdAt: Date;
}

function isHabitDueOnDate(habit: HabitLike, date: Date): boolean {
  if (habit.isArchived) return false;
  const interval = habit.frequencyInterval || 1;
  const baseDate = new Date(habit.startDate || habit.createdAt);
  baseDate.setHours(0, 0, 0, 0);
  const check = new Date(date);
  check.setHours(0, 0, 0, 0);
  if (check < baseDate) return false;

  const diff = Math.floor((check.getTime() - baseDate.getTime()) / 86400000);

  switch (habit.frequencyType) {
    case "daily":
      return interval === 1 || (diff >= 0 && diff % interval === 0);
    case "weekly": {
      if (interval > 1) {
        const weeksDiff = Math.floor(diff / 7);
        if (weeksDiff % interval !== 0) return false;
      }
      if (!habit.frequencyDays) return true;
      const days: number[] = JSON.parse(habit.frequencyDays);
      const dayOfWeek = date.getDay();
      return days.includes(dayOfWeek === 0 ? 7 : dayOfWeek);
    }
    case "custom":
      if (habit.frequencyPeriod === "day") {
        return interval === 1 || (diff >= 0 && diff % interval === 0);
      }
      return true;
    default:
      return true;
  }
}

function getDailyTarget(habit: { frequencyType: string; frequencyPeriod: string; frequencyTarget: number }): number {
  if (habit.frequencyType === "custom" && habit.frequencyPeriod === "day") {
    return habit.frequencyTarget;
  }
  return 1;
}

function formatFrequencyShort(habit: HabitLike): string {
  const interval = habit.frequencyInterval || 1;
  switch (habit.frequencyType) {
    case "daily":
      return interval === 1 ? "Dagelijks" : `Elke ${interval}d`;
    case "weekly": {
      if (!habit.frequencyDays) return interval === 1 ? "Wekelijks" : `Elke ${interval}w`;
      const days: number[] = JSON.parse(habit.frequencyDays);
      return `${days.length}x/week`;
    }
    case "custom": {
      const p = habit.frequencyPeriod === "day" ? "dag" : habit.frequencyPeriod === "week" ? "week" : "mnd";
      return `${habit.frequencyTarget}x/${p}`;
    }
    default:
      return "";
  }
}
