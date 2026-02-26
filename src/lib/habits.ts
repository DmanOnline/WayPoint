import { Habit, HabitCompletion, HabitStreak, HeatmapDay } from "./types/habits";

// === Date helpers ===

export function toDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function getDayOfWeek(date: Date): number {
  // 1=Ma, 2=Di, 3=Wo, 4=Do, 5=Vr, 6=Za, 7=Zo
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

function getISOWeek(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-W${weekNum}`;
}

function getYearMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / 86400000);
}

// === Core functions ===

export function isHabitDueOnDate(habit: Habit, date: Date): boolean {
  if (habit.isArchived) return false;

  const interval = habit.frequencyInterval || 1;
  // Use startDate for interval calculations, fallback to createdAt
  const baseDate = startOfDay(new Date(habit.startDate || habit.createdAt));
  const check = startOfDay(date);

  // Don't show habit before its start date
  if (check < baseDate) return false;

  switch (habit.frequencyType) {
    case "daily": {
      if (interval === 1) return true;
      // Every N days from start date
      const diff = daysBetween(baseDate, check);
      return diff >= 0 && diff % interval === 0;
    }

    case "weekly": {
      if (interval > 1) {
        // Every N weeks - check if this week is a "due" week
        const weeksDiff = Math.floor(daysBetween(baseDate, check) / 7);
        if (weeksDiff % interval !== 0) return false;
      }
      if (!habit.frequencyDays) return true;
      const days: number[] = JSON.parse(habit.frequencyDays);
      return days.includes(getDayOfWeek(date));
    }

    case "custom": {
      // Custom: X times per Y period - always "available" on due periods
      if (habit.frequencyPeriod === "day") {
        if (interval === 1) return true;
        const diff = daysBetween(baseDate, check);
        return diff >= 0 && diff % interval === 0;
      }
      // For week/month periods: always available
      return true;
    }

    default:
      return true;
  }
}

// Backwards-compatible alias
export function isHabitDueToday(habit: Habit, date: Date = new Date()): boolean {
  return isHabitDueOnDate(habit, date);
}

/**
 * Get the daily target for a habit on a given date.
 * For "2x per dag" this returns 2. For most habits returns 1.
 */
export function getDailyTarget(habit: Habit): number {
  if (habit.frequencyType === "custom" && habit.frequencyPeriod === "day") {
    return habit.frequencyTarget;
  }
  return 1;
}

/**
 * Check if a habit is fully completed on a given date.
 * Accounts for multi-target daily habits (e.g., 2x per dag).
 */
export function isHabitFullyCompleted(
  habit: Habit,
  completion: HabitCompletion | undefined
): boolean {
  if (!completion) return false;
  const target = getDailyTarget(habit);
  return completion.count >= target;
}

export function getCompletionsForDate(
  completions: HabitCompletion[],
  date: Date
): HabitCompletion[] {
  const dateStr = toDateString(date);
  return completions.filter((c) => c.completedAt.startsWith(dateStr));
}

export function calculateStreak(
  completions: HabitCompletion[],
  habit: Habit
): HabitStreak {
  if (!completions.length) return { current: 0, longest: 0 };

  const completionDates = new Set(
    completions.map((c) => toDateString(new Date(c.completedAt)))
  );

  if (habit.frequencyType === "daily") {
    return calculateDailyStreak(completionDates, habit);
  }

  if (habit.frequencyType === "weekly" && habit.frequencyDays) {
    const days: number[] = JSON.parse(habit.frequencyDays);
    return calculateWeeklyStreak(completionDates, days);
  }

  if (habit.frequencyType === "custom") {
    return calculateCustomStreak(
      completionDates,
      habit.frequencyTarget,
      habit.frequencyPeriod
    );
  }

  return calculateDailyStreak(completionDates, habit);
}

function calculateDailyStreak(completionDates: Set<string>, habit: Habit): HabitStreak {
  const today = startOfDay(new Date());
  const interval = habit.frequencyInterval || 1;
  const baseDate = startOfDay(new Date(habit.startDate || habit.createdAt));
  let current = 0;
  let longest = 0;
  let streak = 0;
  let isCurrent = true;

  for (let i = 0; i < 365; i += interval) {
    const date = addDays(today, -i);
    // Don't count before start date
    if (startOfDay(date) < baseDate) break;
    const dateStr = toDateString(date);

    if (completionDates.has(dateStr)) {
      streak++;
      if (isCurrent) current = streak;
      longest = Math.max(longest, streak);
    } else {
      if (i === 0) {
        isCurrent = true;
        continue;
      }
      isCurrent = false;
      streak = 0;
    }
  }

  return { current, longest };
}

function calculateWeeklyStreak(
  completionDates: Set<string>,
  requiredDays: number[]
): HabitStreak {
  const today = startOfDay(new Date());
  let current = 0;
  let longest = 0;
  let streak = 0;
  let checkingCurrent = true;

  for (let week = 0; week < 52; week++) {
    const weekStart = addDays(today, -((getDayOfWeek(today) - 1) + week * 7));
    let allDone = true;

    for (const day of requiredDays) {
      const offset = day - 1;
      const checkDate = addDays(weekStart, offset);
      if (checkDate > today) continue;
      if (!completionDates.has(toDateString(checkDate))) {
        allDone = false;
        break;
      }
    }

    if (allDone) {
      streak++;
      if (checkingCurrent) current = streak;
      longest = Math.max(longest, streak);
    } else {
      if (week === 0) {
        checkingCurrent = true;
        continue;
      }
      checkingCurrent = false;
      streak = 0;
    }
  }

  return { current, longest };
}

function calculateCustomStreak(
  completionDates: Set<string>,
  target: number,
  period: string
): HabitStreak {
  const today = startOfDay(new Date());
  let current = 0;
  let longest = 0;
  let streak = 0;
  let checkingCurrent = true;

  const periods: Map<string, number> = new Map();
  completionDates.forEach((dateStr) => {
    const date = new Date(dateStr);
    const key = period === "week" ? getISOWeek(date) : getYearMonth(date);
    periods.set(key, (periods.get(key) || 0) + 1);
  });

  const maxPeriods = period === "week" ? 52 : 12;
  for (let i = 0; i < maxPeriods; i++) {
    const checkDate = period === "week"
      ? addDays(today, -i * 7)
      : new Date(today.getFullYear(), today.getMonth() - i, 1);
    const key = period === "week"
      ? getISOWeek(checkDate)
      : getYearMonth(checkDate);

    const count = periods.get(key) || 0;
    if (count >= target) {
      streak++;
      if (checkingCurrent) current = streak;
      longest = Math.max(longest, streak);
    } else {
      if (i === 0) {
        checkingCurrent = true;
        continue;
      }
      checkingCurrent = false;
      streak = 0;
    }
  }

  return { current, longest };
}

export function calculateCompletionRate(
  completions: HabitCompletion[],
  habit: Habit,
  days: number
): number {
  const today = startOfDay(new Date());
  const completionDates = new Set(
    completions.map((c) => toDateString(new Date(c.completedAt)))
  );

  let dueDays = 0;
  let completedDays = 0;

  for (let i = 0; i < days; i++) {
    const date = addDays(today, -i);
    if (isHabitDueOnDate(habit, date)) {
      dueDays++;
      if (completionDates.has(toDateString(date))) {
        completedDays++;
      }
    }
  }

  if (dueDays === 0) return 0;
  return Math.round((completedDays / dueDays) * 100);
}

export function generateHeatmapData(
  completions: HabitCompletion[],
  days: number = 365
): HeatmapDay[] {
  const today = startOfDay(new Date());
  const countByDate: Map<string, number> = new Map();

  completions.forEach((c) => {
    const dateStr = toDateString(new Date(c.completedAt));
    countByDate.set(dateStr, (countByDate.get(dateStr) || 0) + (c.count || 1));
  });

  const counts = Array.from(countByDate.values());
  const maxCount = counts.length > 0 ? Math.max(...counts) : 0;

  const result: HeatmapDay[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(today, -i);
    const dateStr = toDateString(date);
    const count = countByDate.get(dateStr) || 0;

    let level: 0 | 1 | 2 | 3 | 4 = 0;
    if (count > 0 && maxCount > 0) {
      const ratio = count / maxCount;
      if (ratio <= 0.25) level = 1;
      else if (ratio <= 0.5) level = 2;
      else if (ratio <= 0.75) level = 3;
      else level = 4;
    }

    result.push({ date: dateStr, count, level });
  }

  return result;
}

export function formatFrequency(habit: Habit): string {
  const interval = habit.frequencyInterval || 1;

  switch (habit.frequencyType) {
    case "daily": {
      if (interval === 1) return "Elke dag";
      return `Elke ${interval} dagen`;
    }

    case "weekly": {
      if (!habit.frequencyDays) {
        return interval === 1 ? "Wekelijks" : `Elke ${interval} weken`;
      }
      const days: number[] = JSON.parse(habit.frequencyDays);
      if (days.length === 7) return "Elke dag";
      const names = days.map((d) => getWeekDayShort(d));
      const prefix = interval > 1 ? `Elke ${interval} weken: ` : "";
      return prefix + names.join(", ");
    }

    case "custom": {
      const periodNames: Record<string, [string, string]> = {
        day: ["dag", "dagen"],
        week: ["week", "weken"],
        month: ["maand", "maanden"],
      };
      const [singular, plural] = periodNames[habit.frequencyPeriod] || ["", ""];
      const periodLabel = interval === 1 ? singular : `${interval} ${plural}`;
      return `${habit.frequencyTarget}x per ${periodLabel}`;
    }

    default:
      return "";
  }
}

export function getWeekDayName(dayNum: number): string {
  const names: Record<number, string> = {
    1: "Maandag", 2: "Dinsdag", 3: "Woensdag", 4: "Donderdag",
    5: "Vrijdag", 6: "Zaterdag", 7: "Zondag",
  };
  return names[dayNum] || "";
}

export function getWeekDayShort(dayNum: number): string {
  const names: Record<number, string> = {
    1: "Ma", 2: "Di", 3: "Wo", 4: "Do", 5: "Vr", 6: "Za", 7: "Zo",
  };
  return names[dayNum] || "";
}

export function getHabitsForDate(habits: Habit[], date: Date): Habit[] {
  return habits.filter((h) => !h.isArchived && isHabitDueOnDate(h, date));
}

// Backwards-compatible alias
export function getTodaysHabits(habits: Habit[], date: Date = new Date()): Habit[] {
  return getHabitsForDate(habits, date);
}

export function getCompletionsMap(
  completions: HabitCompletion[],
  date: Date = new Date()
): Map<string, HabitCompletion> {
  const dateStr = toDateString(date);
  const map = new Map<string, HabitCompletion>();
  completions.forEach((c) => {
    if (c.completedAt.startsWith(dateStr)) {
      map.set(c.habitId, c);
    }
  });
  return map;
}

export function getCustomPeriodProgress(
  habit: Habit,
  completions: HabitCompletion[],
  date: Date = new Date()
): { done: number; target: number } {
  if (habit.frequencyType === "custom" && habit.frequencyPeriod === "day") {
    // For "X per dag": count from the completion record
    const dateStr = toDateString(date);
    const todayCompletion = completions.find((c) => c.completedAt.startsWith(dateStr));
    return {
      done: todayCompletion?.count || 0,
      target: habit.frequencyTarget,
    };
  }

  if (habit.frequencyType !== "custom") {
    return { done: 0, target: 0 };
  }

  const interval = habit.frequencyInterval || 1;

  if (habit.frequencyPeriod === "week") {
    const weekStart = addDays(date, -(getDayOfWeek(date) - 1));
    const weekStartStr = toDateString(weekStart);
    const periodCompletions = completions.filter((c) => c.completedAt >= weekStartStr);
    return {
      done: periodCompletions.length,
      target: habit.frequencyTarget * interval, // Adjusted for interval
    };
  } else if (habit.frequencyPeriod === "month") {
    const monthStart = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
    const periodCompletions = completions.filter((c) => c.completedAt >= monthStart);
    return {
      done: periodCompletions.length,
      target: habit.frequencyTarget,
    };
  }

  return { done: 0, target: 0 };
}

export function isFutureDate(date: Date): boolean {
  const today = startOfDay(new Date());
  const check = startOfDay(date);
  return check > today;
}

export function formatDateNL(date: Date): string {
  const months = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
  return `${date.getDate()} ${months[date.getMonth()]}`;
}
