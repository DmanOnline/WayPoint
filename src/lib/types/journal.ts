export interface JournalPersonMention {
  id: string;
  personId: string;
  person: { id: string; name: string; avatarColor: string };
}

export interface JournalEntry {
  id: string;
  userId: string;
  date: string; // ISO date string (YYYY-MM-DDT00:00:00.000Z)
  title: string | null;
  content: string;
  mood: number | null; // 1–5
  moodNote: string | null;
  energy: number | null; // 1–5
  gratitude1: string | null;
  gratitude2: string | null;
  gratitude3: string | null;
  tags: string[] | null; // parsed from JSON
  personMentions?: JournalPersonMention[];
  createdAt: string;
  updatedAt: string;
}

export interface JournalEntryFormData {
  date: string; // YYYY-MM-DD
  title?: string;
  content: string;
  mood?: number | null;
  moodNote?: string;
  energy?: number | null;
  gratitude1?: string;
  gratitude2?: string;
  gratitude3?: string;
  tags?: string[];
}

export interface MoodConfig {
  value: number;
  label: string;
  emoji: string;
  color: string;
  bg: string;
}

export const MOODS: MoodConfig[] = [
  { value: 1, label: "Slecht",    emoji: "😞", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  { value: 2, label: "Matig",     emoji: "😕", color: "#f97316", bg: "rgba(249,115,22,0.12)" },
  { value: 3, label: "Oké",       emoji: "😐", color: "#eab308", bg: "rgba(234,179,8,0.12)" },
  { value: 4, label: "Goed",      emoji: "🙂", color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  { value: 5, label: "Top",       emoji: "😄", color: "#10b981", bg: "rgba(16,185,129,0.12)" },
];

export const ENERGY_LEVELS = [
  { value: 1, label: "Leeg",    icon: "🪫", color: "#ef4444" },
  { value: 2, label: "Laag",    icon: "😴", color: "#f97316" },
  { value: 3, label: "Oké",     icon: "⚡", color: "#eab308" },
  { value: 4, label: "Goed",    icon: "🔋", color: "#22c55e" },
  { value: 5, label: "Geladen", icon: "🚀", color: "#10b981" },
];

export function getMood(value: number | null | undefined): MoodConfig | null {
  if (!value) return null;
  return MOODS.find((m) => m.value === value) ?? null;
}

export function getEnergy(value: number | null | undefined) {
  if (!value) return null;
  return ENERGY_LEVELS.find((e) => e.value === value) ?? null;
}

/** Convert a JS Date to a "YYYY-MM-DD" string in local time */
export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Convert a "YYYY-MM-DD" string to midnight UTC DateTime for the DB */
export function toUtcMidnight(dateStr: string): Date {
  return new Date(dateStr + "T00:00:00.000Z");
}
