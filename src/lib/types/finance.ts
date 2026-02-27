// ─── Account types ───────────────────────────────────────────────────

export type AccountType = "checking" | "savings" | "cash" | "credit_card";
export type AccountGroup = "cash" | "loans" | "tracking";

export interface FinanceAccount {
  id: string;
  userId: string;
  name: string;
  type: AccountType;
  group: AccountGroup;
  onBudget: boolean;
  startBalance: number; // centen
  currency: string;
  color: string;
  sortOrder: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  // computed
  balance?: number; // startBalance + sum(transactions)
}

export interface AccountFormData {
  name: string;
  type: AccountType;
  group: AccountGroup;
  startBalance: number; // in euro's (wordt naar centen omgezet)
  currency?: string;
  color?: string;
}

export const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: "checking", label: "Betaalrekening" },
  { value: "savings", label: "Spaarrekening" },
  { value: "cash", label: "Contant" },
  { value: "credit_card", label: "Creditcard" },
];

export const ACCOUNT_GROUPS: {
  value: AccountGroup;
  label: string;
  onBudget: boolean;
}[] = [
  { value: "cash", label: "Cash", onBudget: true },
  { value: "loans", label: "Leningen", onBudget: false },
  { value: "tracking", label: "Tracking", onBudget: false },
];

// ─── Category types ──────────────────────────────────────────────────

export interface FinanceCategoryGroup {
  id: string;
  userId: string;
  name: string;
  sortOrder: number;
  isHidden: boolean;
  createdAt: string;
  updatedAt: string;
  categories: FinanceCategory[];
}

export interface FinanceCategory {
  id: string;
  userId: string;
  groupId: string;
  name: string;
  sortOrder: number;
  isHidden: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryGroupFormData {
  name: string;
}

export interface CategoryFormData {
  name: string;
  groupId: string;
}

// ─── Target types ───────────────────────────────────────────────────

export type TargetType = "monthly" | "weekly" | "yearly" | "custom";
export type TargetRefillType = "refill" | "set_aside";

export interface FinanceCategoryTarget {
  id: string;
  userId: string;
  categoryId: string;
  type: TargetType;
  amount: number; // centen
  dayOfMonth: number | null; // 1-31
  refillType: TargetRefillType;
  createdAt: string;
  updatedAt: string;
}

export const TARGET_TYPES: { value: TargetType; label: string }[] = [
  { value: "monthly", label: "Maandelijks" },
  { value: "weekly", label: "Wekelijks" },
  { value: "yearly", label: "Jaarlijks" },
];

export const TARGET_REFILL_TYPES: { value: TargetRefillType; label: string; description: string }[] = [
  { value: "refill", label: "Aanvullen tot", description: "Elke maand aanvullen tot het doelbedrag" },
  { value: "set_aside", label: "Extra opzij zetten", description: "Elke maand het doelbedrag erbij" },
];

// ─── Budget types ────────────────────────────────────────────────────

export interface FinanceMonthlyBudget {
  id: string;
  userId: string;
  categoryId: string;
  month: string; // "2026-02"
  assigned: number; // centen
  createdAt: string;
  updatedAt: string;
}

/** Budget data per category, berekend door de API */
export interface CategoryBudgetData {
  categoryId: string;
  assigned: number; // centen — deze maand
  activity: number; // centen — som transacties deze maand
  available: number; // centen — cumulatief (assigned - spent, rollover)
  target?: {
    type: TargetType;
    amount: number; // centen — doelbedrag
    dayOfMonth: number | null;
    refillType: TargetRefillType;
    needed: number; // centen — hoeveel er nog nodig is (0 = funded)
    progress: number; // 0-1 — voortgang richting doel
  } | null;
}

/** Volledige budget response voor een maand */
export interface MonthBudgetResponse {
  month: string;
  readyToAssign: number; // centen
  categoryGroups: {
    group: FinanceCategoryGroup;
    budgets: CategoryBudgetData[];
  }[];
}

// ─── Transaction types ───────────────────────────────────────────────

export interface FinanceTransaction {
  id: string;
  userId: string;
  accountId: string;
  categoryId: string | null;
  date: string; // ISO
  payee: string | null;
  memo: string | null;
  amount: number; // centen; positief = inflow, negatief = outflow
  isCleared: boolean;
  transferAccountId: string | null;
  createdAt: string;
  updatedAt: string;
  // joined
  account?: { id: string; name: string };
  category?: { id: string; name: string; group?: { id: string; name: string } } | null;
}

export interface TransactionFormData {
  accountId: string;
  categoryId?: string | null;
  date: string; // YYYY-MM-DD
  payee?: string;
  memo?: string;
  amount: number; // in euro's (wordt naar centen omgezet)
  isInflow: boolean; // true = inflow, false = outflow
  isCleared?: boolean;
  transferAccountId?: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────

/** Centen → euro weergave (bijv. 12345 → "123,45") */
export function centsToEuro(cents: number): string {
  const abs = Math.abs(cents);
  const euros = Math.floor(abs / 100);
  const rest = abs % 100;
  const sign = cents < 0 ? "-" : "";
  return `${sign}${euros},${String(rest).padStart(2, "0")}`;
}

/** Euro string → centen (bijv. "123,45" → 12345, "123.45" → 12345) */
export function euroToCents(euro: string | number): number {
  if (typeof euro === "number") return Math.round(euro * 100);
  const cleaned = euro.replace(/[^\d,.\-]/g, "").replace(",", ".");
  return Math.round(parseFloat(cleaned) * 100) || 0;
}

/** Format centen als valuta (bijv. 12345 → "€123,45") */
export function formatCurrency(cents: number, currency: string = "EUR"): string {
  const symbol = currency === "EUR" ? "\u20AC" : currency;
  return `${symbol}${centsToEuro(cents)}`;
}

/** Huidige maand als "YYYY-MM" */
export function getMonthKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** Vorige maand key */
export function prevMonth(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  if (m === 1) return `${y - 1}-12`;
  return `${y}-${String(m - 1).padStart(2, "0")}`;
}

/** Volgende maand key */
export function nextMonth(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  if (m === 12) return `${y + 1}-01`;
  return `${y}-${String(m + 1).padStart(2, "0")}`;
}

/** Maand key → display string (bijv. "2026-02" → "Feb 2026") */
export function formatMonth(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  const months = [
    "Jan", "Feb", "Mrt", "Apr", "Mei", "Jun",
    "Jul", "Aug", "Sep", "Okt", "Nov", "Dec",
  ];
  return `${months[m - 1]} ${y}`;
}

/** Start en eind van een maand als Date voor DB queries */
export function getMonthRange(monthKey: string): { start: Date; end: Date } {
  const [y, m] = monthKey.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1)); // eerste dag volgende maand
  return { start, end };
}
