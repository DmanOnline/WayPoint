import { ParsedTaskInput, TaskPriority, TaskRecurrenceRule } from "./types/tasks";

const DAY_NAMES: Record<string, number> = {
  maandag: 1,
  dinsdag: 2,
  woensdag: 3,
  donderdag: 4,
  vrijdag: 5,
  zaterdag: 6,
  zondag: 0,
  ma: 1,
  di: 2,
  wo: 3,
  do: 4,
  vr: 5,
  za: 6,
  zo: 0,
};

const MONTH_NAMES: Record<string, number> = {
  januari: 0,
  februari: 1,
  maart: 2,
  april: 3,
  mei: 4,
  juni: 5,
  juli: 6,
  augustus: 7,
  september: 8,
  oktober: 9,
  november: 10,
  december: 11,
  jan: 0,
  feb: 1,
  mrt: 2,
  apr: 3,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  okt: 9,
  nov: 10,
  dec: 11,
};

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

/** Extract YYYY-MM-DD from a date string (handles both "YYYY-MM-DD" and full ISO "YYYY-MM-DDTHH:mm:ss.sssZ") */
function toDateOnly(dateStr: string): string {
  return dateStr.substring(0, 10);
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function getNextWeekday(dayOfWeek: number, from: Date = new Date()): Date {
  const result = new Date(from);
  const current = result.getDay();
  let diff = dayOfWeek - current;
  if (diff <= 0) diff += 7;
  result.setDate(result.getDate() + diff);
  return result;
}

/**
 * Parse Nederlandse natural language input naar gestructureerde taak data.
 *
 * Ondersteunde patronen:
 * - Prioriteit: !1 (hoog), !2 (gemiddeld), !3 (laag)
 * - Project: #projectnaam
 * - Recurrence: elke dag/week/maand/jaar [dagnaam] [tijd]
 * - Deadline: deadline [datum]
 * - Datum woorden: vandaag, morgen, overmorgen, dagnamen
 * - Datum formaten: 15 maart, 15-03, 15/03
 * - Tijd: 10:00, 10u, 10.00
 */
export function parseTaskInput(input: string): ParsedTaskInput {
  let text = input.trim();
  const result: ParsedTaskInput = { title: "" };
  const today = new Date();

  // 1. Prioriteit: !1, !2, !3
  const priorityMatch = text.match(/(?:^|\s)!([123])(?:\s|$)/);
  if (priorityMatch) {
    const map: Record<string, TaskPriority> = {
      "1": "high",
      "2": "medium",
      "3": "low",
    };
    result.priority = map[priorityMatch[1]];
    text = text.replace(priorityMatch[0], " ").trim();
  }

  // 2. Project: #naam
  const projectMatch = text.match(/(?:^|\s)#(\S+)/);
  if (projectMatch) {
    result.projectName = projectMatch[1].toLowerCase();
    text = text.replace(projectMatch[0], " ").trim();
  }

  // 3. Recurrence: elke dag/week/maand/jaar
  const recurrenceMatch = text.match(
    /(?:^|\s)(?:elke|iedere)\s+(dag|week|maand|jaar)(?:\s+(maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag|ma|di|wo|do|vr|za|zo))?(?:\s+(\d{1,2}e?))?/i
  );
  if (recurrenceMatch) {
    const ruleMap: Record<string, TaskRecurrenceRule> = {
      dag: "DAILY",
      week: "WEEKLY",
      maand: "MONTHLY",
      jaar: "YEARLY",
    };
    result.recurrenceRule = ruleMap[recurrenceMatch[1].toLowerCase()];

    if (recurrenceMatch[2]) {
      result.recurrenceDay =
        DAY_NAMES[recurrenceMatch[2].toLowerCase()];
    }
    if (recurrenceMatch[3]) {
      result.recurrenceDay = parseInt(recurrenceMatch[3]);
    }

    text = text.replace(recurrenceMatch[0], " ").trim();
  }

  // 4. Deadline: deadline [datum]
  const deadlineMatch = text.match(
    /(?:^|\s)deadline\s+(\d{1,2})[\s-/](\w+|\d{1,2})(?:[\s-/](\d{2,4}))?/i
  );
  if (deadlineMatch) {
    const dueDate = parseDatePart(
      deadlineMatch[1],
      deadlineMatch[2],
      deadlineMatch[3],
      today
    );
    if (dueDate) result.dueDate = dueDate;
    text = text.replace(deadlineMatch[0], " ").trim();
  } else {
    // "deadline vandaag" / "deadline morgen"
    const deadlineWordMatch = text.match(
      /(?:^|\s)deadline\s+(vandaag|morgen|overmorgen)/i
    );
    if (deadlineWordMatch) {
      const d = new Date(today);
      if (deadlineWordMatch[1].toLowerCase() === "morgen") d.setDate(d.getDate() + 1);
      else if (deadlineWordMatch[1].toLowerCase() === "overmorgen") d.setDate(d.getDate() + 2);
      result.dueDate = formatDate(d);
      text = text.replace(deadlineWordMatch[0], " ").trim();
    }
  }

  // 5. Tijd: 10:00, 10u, 10.00, 10u30
  const timeMatch = text.match(
    /(?:^|\s)(\d{1,2})(?::(\d{2})|\.(\d{2})|u(\d{2})?)\b/
  );
  if (timeMatch) {
    const hours = parseInt(timeMatch[1]);
    const minutes = parseInt(timeMatch[2] || timeMatch[3] || timeMatch[4] || "0");
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      result.scheduledTime = `${pad(hours)}:${pad(minutes)}`;
      text = text.replace(timeMatch[0], " ").trim();
    }
  }

  // 6. Datum woorden: vandaag, morgen, overmorgen
  const dateWordMatch = text.match(
    /(?:^|\s)(vandaag|morgen|overmorgen)(?:\s|$)/i
  );
  if (dateWordMatch && !result.scheduledDate) {
    const d = new Date(today);
    const word = dateWordMatch[1].toLowerCase();
    if (word === "morgen") d.setDate(d.getDate() + 1);
    else if (word === "overmorgen") d.setDate(d.getDate() + 2);
    result.scheduledDate = formatDate(d);
    text = text.replace(dateWordMatch[0], " ").trim();
  }

  // 7. Dagnamen: maandag t/m zondag
  if (!result.scheduledDate) {
    const dayNamePattern = Object.keys(DAY_NAMES)
      .filter((k) => k.length > 2)
      .join("|");
    const dayMatch = text.match(
      new RegExp(`(?:^|\\s)(${dayNamePattern})(?:\\s|$)`, "i")
    );
    if (dayMatch) {
      const dayNum = DAY_NAMES[dayMatch[1].toLowerCase()];
      if (dayNum !== undefined) {
        const d = getNextWeekday(dayNum, today);
        result.scheduledDate = formatDate(d);
        text = text.replace(dayMatch[0], " ").trim();
      }
    }
  }

  // 8. Datum: 15 maart, 15-03, 15/03
  if (!result.scheduledDate) {
    const dateMatch = text.match(
      /(?:^|\s)(\d{1,2})[\s-/](\w+|\d{1,2})(?:[\s-/](\d{2,4}))?(?:\s|$)/
    );
    if (dateMatch) {
      const parsed = parseDatePart(
        dateMatch[1],
        dateMatch[2],
        dateMatch[3],
        today
      );
      if (parsed) {
        result.scheduledDate = parsed;
        text = text.replace(dateMatch[0], " ").trim();
      }
    }
  }

  // Rest = titel
  result.title = text.replace(/\s+/g, " ").trim();

  return result;
}

function parseDatePart(
  dayStr: string,
  monthStr: string,
  yearStr: string | undefined,
  today: Date
): string | null {
  const day = parseInt(dayStr);
  if (day < 1 || day > 31) return null;

  let month: number;
  const monthLower = monthStr.toLowerCase();

  if (MONTH_NAMES[monthLower] !== undefined) {
    month = MONTH_NAMES[monthLower];
  } else {
    const monthNum = parseInt(monthStr);
    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) return null;
    month = monthNum - 1;
  }

  let year = today.getFullYear();
  if (yearStr) {
    year = parseInt(yearStr);
    if (year < 100) year += 2000;
  }

  // Als de datum in het verleden is, neem volgend jaar
  const d = new Date(year, month, day);
  if (d < today && !yearStr) {
    d.setFullYear(d.getFullYear() + 1);
  }

  return formatDate(d);
}

/**
 * Geeft een slimme standaard datum terug:
 * - Voor 12:00 → vandaag
 * - 12:00 - 20:00 → vandaag
 * - Na 20:00 → morgen
 */
export function getSmartDefaultDate(): string {
  const now = new Date();
  const hour = now.getHours();
  if (hour >= 20) {
    now.setDate(now.getDate() + 1);
  }
  return formatDate(now);
}

/**
 * Geeft een leesbaar label voor een datum string (YYYY-MM-DD).
 * Bijv. "Vandaag", "Morgen", "Wo 5 mrt"
 */
export function getDateLabel(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(toDateOnly(dateStr) + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (d.getTime() === today.getTime()) return "Vandaag";
  if (d.getTime() === tomorrow.getTime()) return "Morgen";

  const dayNames = ["zo", "ma", "di", "wo", "do", "vr", "za"];
  const monthNames = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
  const diffDays = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays > 0 && diffDays <= 6) {
    return dayNames[d.getDay()].charAt(0).toUpperCase() + dayNames[d.getDay()].slice(1) + ` ${d.getDate()} ${monthNames[d.getMonth()]}`;
  }
  return `${d.getDate()} ${monthNames[d.getMonth()]}`;
}

// Util: format scheduled date voor weergave
export function formatScheduledDate(
  date: string | null,
  time: string | null
): { label: string; isOverdue: boolean } {
  if (!date) return { label: "", isOverdue: false };
  const d = new Date(toDateOnly(date) + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isOverdue = d.getTime() < today.getTime();

  let label: string;
  if (d.getTime() === today.getTime()) {
    label = "Vandaag";
  } else if (d.getTime() === tomorrow.getTime()) {
    label = "Morgen";
  } else {
    const dayNames = ["zo", "ma", "di", "wo", "do", "vr", "za"];
    const monthNames = [
      "jan",
      "feb",
      "mrt",
      "apr",
      "mei",
      "jun",
      "jul",
      "aug",
      "sep",
      "okt",
      "nov",
      "dec",
    ];
    const diffDays = Math.round(
      (d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays > 0 && diffDays <= 6) {
      label = dayNames[d.getDay()].charAt(0).toUpperCase() + dayNames[d.getDay()].slice(1);
    } else {
      label = `${d.getDate()} ${monthNames[d.getMonth()]}`;
    }
  }

  if (time) {
    label += ` ${time}`;
  }

  return { label, isOverdue };
}

// Util: format due date met urgentie
export function formatDueDate(date: string | null): {
  label: string;
  isOverdue: boolean;
} {
  if (!date) return { label: "", isOverdue: false };
  const d = new Date(toDateOnly(date) + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffDays = Math.round(
    (d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays < 0) return { label: "Verlopen!", isOverdue: true };
  if (diffDays === 0) return { label: "Vandaag", isOverdue: false };
  if (diffDays === 1) return { label: "Morgen", isOverdue: false };
  if (diffDays <= 6) return { label: `Over ${diffDays} dagen`, isOverdue: false };

  const monthNames = [
    "jan", "feb", "mrt", "apr", "mei", "jun",
    "jul", "aug", "sep", "okt", "nov", "dec",
  ];
  return {
    label: `${d.getDate()} ${monthNames[d.getMonth()]}`,
    isOverdue: false,
  };
}

// Util: recurrence label
export function formatRecurrence(
  rule: string | null,
  day: number | null
): string {
  if (!rule) return "";
  const dayNames = [
    "zondag", "maandag", "dinsdag", "woensdag",
    "donderdag", "vrijdag", "zaterdag",
  ];

  switch (rule) {
    case "DAILY":
      return "Elke dag";
    case "WEEKLY":
      return day !== null ? `Elke week op ${dayNames[day]}` : "Elke week";
    case "MONTHLY":
      return day !== null ? `Elke maand op de ${day}e` : "Elke maand";
    case "YEARLY":
      return "Elk jaar";
    default:
      return "";
  }
}
