export interface Person {
  id: string;
  userId: string;
  name: string;
  nickname: string | null;
  type: string | null;
  company: string | null;
  role: string | null;
  email: string | null;
  phone: string | null;
  birthday: string | null; // ISO date string
  location: string | null;
  avatarColor: string;
  bio: string | null;
  tags: string[] | null;
  contactFrequency: string | null; // weekly, biweekly, monthly, quarterly, yearly
  metAt: string | null;
  metThrough: string | null;
  isPinned: boolean;
  isArchived: boolean;
  lastContactedAt: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  interactions?: PersonInteraction[];
  followUps?: PersonFollowUp[];
  lifeEvents?: PersonLifeEvent[];
  relationships?: PersonRelationship[];
  journalMentions?: JournalPersonMention[];
  _count?: { interactions: number; followUps: number };
}

export interface PersonInteraction {
  id: string;
  personId: string;
  date: string; // ISO string
  type: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface PersonFollowUp {
  id: string;
  personId: string;
  text: string;
  isDone: boolean;
  doneAt: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PersonLifeEvent {
  id: string;
  personId: string;
  date: string;
  title: string;
  description: string | null;
  icon: string;
  createdAt: string;
  updatedAt: string;
}

export interface PersonRelationship {
  id: string;
  personAId: string;
  personBId: string;
  type: string;
  label: string | null;
  createdAt: string;
  updatedAt: string;
  otherPerson?: { id: string; name: string; avatarColor: string };
}

export interface JournalPersonMention {
  id: string;
  journalEntryId: string;
  personId: string;
  createdAt: string;
  journalEntry?: { id: string; date: string; title: string | null; mood: number | null };
}

export interface PersonFormData {
  name: string;
  nickname?: string;
  type?: string;
  company?: string;
  role?: string;
  email?: string;
  phone?: string;
  birthday?: string;
  location?: string;
  avatarColor?: string;
  bio?: string;
  tags?: string[];
  contactFrequency?: string;
  metAt?: string;
  metThrough?: string;
}

export const PERSON_TYPES = [
  { value: "friend",    label: "Vriend",    color: "#6366f1" },
  { value: "family",    label: "Familie",   color: "#ec4899" },
  { value: "colleague", label: "Collega",   color: "#3b82f6" },
  { value: "contact",   label: "Contactpersoon", color: "#8b5cf6" },
  { value: "mentor",    label: "Mentor",    color: "#f59e0b" },
  { value: "romantic",  label: "Romantisch", color: "#ef4444" },
] as const;

export const INTERACTION_TYPES = [
  { value: "general",  label: "Algemeen",  icon: "💬" },
  { value: "call",     label: "Bellen",    icon: "📞" },
  { value: "message",  label: "Bericht",   icon: "✉️" },
  { value: "meeting",  label: "Meeting",   icon: "🤝" },
  { value: "coffee",   label: "Koffie",    icon: "☕" },
  { value: "dinner",   label: "Eten",      icon: "🍽️" },
  { value: "video",    label: "Video",     icon: "📹" },
] as const;

export const CONTACT_FREQUENCIES = [
  { value: "weekly",    label: "Wekelijks",    days: 7 },
  { value: "biweekly",  label: "2-wekelijks",  days: 14 },
  { value: "monthly",   label: "Maandelijks",  days: 30 },
  { value: "quarterly", label: "Per kwartaal",  days: 90 },
  { value: "yearly",    label: "Jaarlijks",    days: 365 },
] as const;

export type RelationshipHealth = "good" | "okay" | "warning" | "neglected";

export const HEALTH_CONFIG: Record<RelationshipHealth, { label: string; color: string; dot: string }> = {
  good:      { label: "Op schema",         color: "#22c55e", dot: "bg-green-500" },
  okay:      { label: "Bijna tijd",        color: "#eab308", dot: "bg-yellow-500" },
  warning:   { label: "Te lang geleden",   color: "#f97316", dot: "bg-orange-500" },
  neglected: { label: "Verwaarloosd",      color: "#ef4444", dot: "bg-red-500" },
};

export function getContactFrequency(value: string | null | undefined) {
  if (!value) return null;
  return CONTACT_FREQUENCIES.find((f) => f.value === value) ?? null;
}

export function getRelationshipHealth(lastContactedAt: string | null, frequency: string | null): RelationshipHealth | null {
  if (!frequency) return null;
  const freq = CONTACT_FREQUENCIES.find((f) => f.value === frequency);
  if (!freq) return null;
  const since = daysSince(lastContactedAt);
  if (since === null) return "neglected"; // never contacted but has frequency set
  if (since < freq.days * 0.7) return "good";
  if (since < freq.days) return "okay";
  if (since < freq.days * 1.5) return "warning";
  return "neglected";
}

export const LIFE_EVENT_ICONS = ["📌", "🏠", "👶", "💼", "🎓", "💍", "✈️", "🏥", "🎉", "⭐"] as const;

export const RELATIONSHIP_TYPES = [
  { value: "partner",       label: "Partner" },
  { value: "friend",        label: "Vriend(in)" },
  { value: "colleague",     label: "Collega" },
  { value: "family",        label: "Familie" },
  { value: "introduced_by", label: "Voorgesteld door" },
] as const;

export function getRelationshipType(value: string | null | undefined) {
  if (!value) return null;
  return RELATIONSHIP_TYPES.find((t) => t.value === value) ?? null;
}

export function getPersonType(value: string | null | undefined) {
  if (!value) return null;
  return PERSON_TYPES.find((t) => t.value === value) ?? null;
}

export function getInteractionType(value: string) {
  return INTERACTION_TYPES.find((t) => t.value === value) ?? INTERACTION_TYPES[0];
}

/** Generate initials from a name */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

/** Days since a date string */
export function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/** Check if a birthday is within the next N days */
export function isBirthdayWithin(birthday: string | null, days: number): boolean {
  if (!birthday) return false;
  const bday = new Date(birthday);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thisYear = today.getFullYear();

  // Check birthday this year and next year
  for (const year of [thisYear, thisYear + 1]) {
    const upcoming = new Date(year, bday.getMonth(), bday.getDate());
    const diff = (upcoming.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    if (diff >= 0 && diff <= days) return true;
  }
  return false;
}

/** Days until next birthday */
export function daysUntilBirthday(birthday: string | null): number | null {
  if (!birthday) return null;
  const bday = new Date(birthday);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thisYear = today.getFullYear();

  let next = new Date(thisYear, bday.getMonth(), bday.getDate());
  if (next.getTime() < today.getTime()) {
    next = new Date(thisYear + 1, bday.getMonth(), bday.getDate());
  }
  return Math.ceil((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/** Calculate age from birthday */
export function getAge(birthday: string | null): number | null {
  if (!birthday) return null;
  const bday = new Date(birthday);
  const today = new Date();
  let age = today.getFullYear() - bday.getFullYear();
  const monthDiff = today.getMonth() - bday.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < bday.getDate())) {
    age--;
  }
  return age;
}

/** Format birthday as "15 mrt" */
export function fmtBirthday(birthday: string | null): string | null {
  if (!birthday) return null;
  const MONTHS = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
  const d = new Date(birthday);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** Get due date status for follow-ups */
export function getDueDateStatus(dueDate: string | null): { label: string; color: string } | null {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diff < 0) return { label: `${Math.abs(diff)}d te laat`, color: "text-red-400" };
  if (diff === 0) return { label: "vandaag", color: "text-orange-400" };
  if (diff <= 7) return { label: `over ${diff}d`, color: "text-yellow-500" };
  const MONTHS = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
  return { label: `${due.getDate()} ${MONTHS[due.getMonth()]}`, color: "text-muted-foreground" };
}
