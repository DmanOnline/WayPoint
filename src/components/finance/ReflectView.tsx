"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { formatCurrency, formatMonth } from "@/lib/types/finance";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
  Sector,
  ComposedChart,
  Line,
} from "recharts";

// ─── Types ──────────────────────────────────────────────────────────

interface CategoryGroup {
  id: string;
  name: string;
  categories: { id: string; name: string }[];
}

interface SpendingCategory {
  categoryId: string;
  name: string;
  groupId: string;
  groupName: string;
  total: number;
  count: number;
}

interface SpendingGroup {
  groupId: string;
  groupName: string;
  total: number;
  count: number;
}

interface SpendingStats {
  avgMonthly: number;
  avgDaily: number;
  mostFrequentCategory: { name: string; count: number } | null;
  largestOutflow: { amount: number; categoryName: string } | null;
  totalTransactions: number;
}

interface MonthlyIncomeSpending {
  month: string;
  income: number;
  spending: number;
}

interface MonthlySpending {
  month: string;
  total: number;
  byGroup: Record<string, number>;
}

interface MonthlyNetWorth {
  month: string;
  assets: number;
  liabilities: number;
  net: number;
}

interface ReflectData {
  months: string[];
  categoryGroups: CategoryGroup[];
  spendingBreakdown: {
    categories: SpendingCategory[];
    groups: SpendingGroup[];
    total: number;
    stats: SpendingStats;
  };
  incomeVsSpending: MonthlyIncomeSpending[];
  spendingTrends: MonthlySpending[];
  spendingTrendsGroupNames: string[];
  netWorth: MonthlyNetWorth[];
}

type ReflectTab = "spending" | "income-vs-spending" | "trends" | "net-worth";
type PeriodKey = "this-month" | "last-3" | "last-6" | "last-12" | "ytd" | "last-year" | "all";

const TABS: { key: ReflectTab; label: string }[] = [
  { key: "spending", label: "Spending Breakdown" },
  { key: "trends", label: "Spending Trends" },
  { key: "net-worth", label: "Net Worth" },
  { key: "income-vs-spending", label: "Income v Expense" },
];

const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: "this-month", label: "Deze maand" },
  { key: "last-3", label: "Laatste 3 maanden" },
  { key: "last-6", label: "Laatste 6 maanden" },
  { key: "last-12", label: "Laatste 12 maanden" },
  { key: "ytd", label: "Dit jaar" },
  { key: "last-year", label: "Vorig jaar" },
  { key: "all", label: "Alles" },
];

const CATEGORY_COLORS = [
  "#6366f1", "#f43f5e", "#f59e0b", "#10b981", "#3b82f6",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#06b6d4",
  "#84cc16", "#a855f7", "#ef4444", "#22c55e", "#0ea5e9",
];

// ─── Helpers ────────────────────────────────────────────────────────

function getMonthKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function subtractMonths(monthKey: string, n: number): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(y, m - 1 - n, 1);
  return getMonthKey(d);
}

function periodToRange(period: PeriodKey): { from: string; to: string } {
  const now = new Date();
  const current = getMonthKey(now);

  switch (period) {
    case "this-month":
      return { from: current, to: current };
    case "last-3":
      return { from: subtractMonths(current, 2), to: current };
    case "last-6":
      return { from: subtractMonths(current, 5), to: current };
    case "last-12":
      return { from: subtractMonths(current, 11), to: current };
    case "ytd":
      return { from: `${now.getFullYear()}-01`, to: current };
    case "last-year": {
      const ly = now.getFullYear() - 1;
      return { from: `${ly}-01`, to: `${ly}-12` };
    }
    case "all":
      return { from: "2020-01", to: current };
  }
}

function shortMonth(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  const date = new Date(y, m - 1, 1);
  return date.toLocaleDateString("nl-NL", { month: "short" });
}

function formatEuro(cents: number): string {
  return `€${(cents / 100).toLocaleString("nl-NL", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function euroTooltipFormatter(value: any) {
  return formatCurrency(value as number);
}

// ─── Period Dropdown ────────────────────────────────────────────────

function PeriodDropdown({
  value,
  onChange,
}: {
  value: PeriodKey;
  onChange: (p: PeriodKey) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const label = PERIOD_OPTIONS.find((o) => o.key === value)?.label || "";

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-medium text-foreground hover:bg-surface-hover transition-colors"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        {label}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-background border border-border rounded-xl shadow-lg py-1 min-w-[200px]">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => { onChange(opt.key); setOpen(false); }}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between ${
                value === opt.key
                  ? "text-[#4B56E2] font-medium"
                  : "text-foreground hover:bg-surface-hover"
              }`}
            >
              {opt.label}
              {value === opt.key && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Category Filter ────────────────────────────────────────────────

function CategoryFilter({
  categoryGroups,
  selectedIds,
  onChange,
}: {
  categoryGroups: CategoryGroup[];
  selectedIds: Set<string>;
  onChange: (ids: Set<string>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [tempIds, setTempIds] = useState<Set<string>>(selectedIds);
  const ref = useRef<HTMLDivElement>(null);

  const allIds = useMemo(
    () => new Set(categoryGroups.flatMap((g) => g.categories.map((c) => c.id))),
    [categoryGroups]
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleOpen = () => {
    setTempIds(new Set(selectedIds));
    setOpen(true);
  };

  const toggleCategory = (id: string) => {
    const next = new Set(tempIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setTempIds(next);
  };

  const toggleGroup = (group: CategoryGroup) => {
    const groupCatIds = group.categories.map((c) => c.id);
    const allSelected = groupCatIds.every((id) => tempIds.has(id));
    const next = new Set(tempIds);
    groupCatIds.forEach((id) => {
      if (allSelected) next.delete(id);
      else next.add(id);
    });
    setTempIds(next);
  };

  const selectedCount = selectedIds.size;
  const totalCount = allIds.size;
  const label = selectedCount === totalCount
    ? `${totalCount} categorieën`
    : `${selectedCount} van ${totalCount}`;

  const filteredGroups = useMemo(() => {
    if (!search) return categoryGroups;
    const q = search.toLowerCase();
    return categoryGroups
      .map((g) => ({
        ...g,
        categories: g.categories.filter(
          (c) => c.name.toLowerCase().includes(q) || g.name.toLowerCase().includes(q)
        ),
      }))
      .filter((g) => g.categories.length > 0);
  }, [categoryGroups, search]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-medium text-foreground hover:bg-surface-hover transition-colors"
      >
        <span className="bg-[#4B56E2] text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
          {selectedCount}
        </span>
        {label}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-background border border-border rounded-xl shadow-lg w-[320px] max-h-[420px] flex flex-col">
          {/* Search */}
          <div className="p-2 border-b border-border">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground shrink-0">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Zoek categorieën..."
                className="text-sm bg-transparent outline-none flex-1 text-foreground placeholder:text-muted-foreground"
                autoFocus
              />
            </div>
          </div>

          {/* Category list */}
          <div className="flex-1 overflow-y-auto py-1">
            {filteredGroups.map((group) => {
              const groupCatIds = group.categories.map((c) => c.id);
              const allGroupSelected = groupCatIds.every((id) => tempIds.has(id));
              const someGroupSelected = groupCatIds.some((id) => tempIds.has(id));

              return (
                <div key={group.id}>
                  {/* Group header */}
                  <button
                    onClick={() => toggleGroup(group)}
                    className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-surface-hover transition-colors"
                  >
                    <Checkbox checked={allGroupSelected} indeterminate={!allGroupSelected && someGroupSelected} />
                    <span className="text-sm font-semibold text-foreground">{group.name}</span>
                  </button>

                  {/* Categories */}
                  {group.categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => toggleCategory(cat.id)}
                      className="w-full flex items-center gap-2.5 pl-8 pr-4 py-1.5 hover:bg-surface-hover transition-colors"
                    >
                      <Checkbox checked={tempIds.has(cat.id)} />
                      <span className="text-sm text-foreground">{cat.name}</span>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="border-t border-border p-2 flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => setTempIds(new Set(allIds))}
                className="text-xs font-medium text-[#4B56E2] hover:underline px-1"
              >
                Alles
              </button>
              <button
                onClick={() => setTempIds(new Set())}
                className="text-xs font-medium text-[#4B56E2] hover:underline px-1"
              >
                Geen
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setOpen(false); setSearch(""); }}
                className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-surface-hover transition-colors"
              >
                Annuleer
              </button>
              <button
                onClick={() => { onChange(tempIds); setOpen(false); setSearch(""); }}
                className="px-3 py-1.5 text-xs font-medium text-white bg-[#4B56E2] rounded-lg hover:bg-[#3D48C4] transition-colors"
              >
                Klaar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Checkbox({ checked, indeterminate }: { checked: boolean; indeterminate?: boolean }) {
  return (
    <div
      className={`w-4.5 h-4.5 rounded flex items-center justify-center shrink-0 border transition-colors ${
        checked || indeterminate
          ? "bg-[#4B56E2] border-[#4B56E2]"
          : "border-border bg-background"
      }`}
      style={{ width: 18, height: 18 }}
    >
      {checked && (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
      {indeterminate && !checked && (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      )}
    </div>
  );
}

// ─── Spending Breakdown ─────────────────────────────────────────────

function SpendingBreakdown({ data }: { data: ReflectData }) {
  const [groupBy, setGroupBy] = useState<"categories" | "groups">("categories");
  const { categories, groups, total, stats } = data.spendingBreakdown;

  const items = groupBy === "categories"
    ? categories.map((c) => ({ id: c.categoryId, name: c.name, total: c.total }))
    : groups.map((g) => ({ id: g.groupId, name: g.groupName, total: g.total }));

  const pieData = items.map((item, i) => ({
    name: item.name,
    value: item.total,
    color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
  }));

  if (items.length === 0) {
    return <EmptyState message="Geen uitgaven in deze periode" />;
  }

  return (
    <div className="space-y-6">
      {/* Main content: donut + category list */}
      <div className="bg-background border border-border rounded-xl p-5">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left: Donut chart */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-muted-foreground">Total Spending</p>
                <p className="text-2xl font-bold tabular-nums text-foreground">{formatCurrency(total)}</p>
              </div>

              {/* Categories / Groups toggle */}
              <div className="flex bg-surface rounded-lg p-0.5">
                <button
                  onClick={() => setGroupBy("categories")}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    groupBy === "categories"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Categories
                </button>
                <button
                  onClick={() => setGroupBy("groups")}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    groupBy === "groups"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Groups
                </button>
              </div>
            </div>

            {/* Donut */}
            <div className="relative h-[520px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={110}
                    outerRadius={165}
                    dataKey="value"
                    stroke="none"
                    paddingAngle={1}
                    activeShape={({ cx: acx, cy: acy, innerRadius: air, outerRadius: aor, startAngle, endAngle, fill }: // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    any) => (
                      <g>
                        <Sector cx={acx} cy={acy} innerRadius={air} outerRadius={aor + 6} startAngle={startAngle} endAngle={endAngle} fill={fill} opacity={0.85} />
                      </g>
                    )}
                    label={({ name, percent, cx: pcx, cy: pcy, midAngle = 0, outerRadius: or = 165 }) => {
                      const RADIAN = Math.PI / 180;
                      const radius = (or as number) + 28;
                      const x = (pcx as number) + radius * Math.cos(-midAngle * RADIAN);
                      const y = (pcy as number) + radius * Math.sin(-midAngle * RADIAN);
                      const pct = (percent as number);
                      if (pct < 0.04) return null;
                      const displayName = (name as string).length > 18
                        ? (name as string).slice(0, 16) + "…"
                        : name;
                      return (
                        <g>
                          <text
                            x={x}
                            y={y - 7}
                            textAnchor={x > (pcx as number) ? "start" : "end"}
                            className="fill-foreground"
                            fontSize={12}
                            fontWeight={600}
                          >
                            {displayName}
                          </text>
                          <text
                            x={x}
                            y={y + 9}
                            textAnchor={x > (pcx as number) ? "start" : "end"}
                            className="fill-muted-foreground"
                            fontSize={11}
                          >
                            {formatCurrency(Math.round(pct * total))} ({(pct * 100).toFixed(0)}%)
                          </text>
                        </g>
                      );
                    }}
                    labelLine={{
                      stroke: "var(--color-border)",
                      strokeWidth: 1,
                    }}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={euroTooltipFormatter}
                    cursor={false}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-background)" }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Center text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Spending</span>
                <span className="text-xl font-bold tabular-nums text-foreground">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          {/* Right: Category list */}
          <div className="lg:w-[280px] shrink-0">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {groupBy === "categories" ? "Categories" : "Groups"}
              </span>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Total Spending
              </span>
            </div>

            <div className="space-y-3">
              {items.map((item, i) => {
                const pct = total > 0 ? (item.total / total) * 100 : 0;
                const color = CATEGORY_COLORS[i % CATEGORY_COLORS.length];
                return (
                  <div key={item.id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground truncate">{item.name}</span>
                      <span className="text-sm font-semibold tabular-nums text-foreground shrink-0 ml-2">
                        {formatCurrency(item.total)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-surface rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: color }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-right">
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-background border border-border rounded-xl p-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Average Monthly Spending</p>
            <p className="text-lg font-bold tabular-nums text-foreground">{formatCurrency(stats.avgMonthly)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Average Daily Spending</p>
            <p className="text-lg font-bold tabular-nums text-foreground">{formatCurrency(stats.avgDaily)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Most Frequent Category</p>
            {stats.mostFrequentCategory ? (
              <>
                <p className="text-lg font-bold text-foreground truncate">{stats.mostFrequentCategory.name}</p>
                <p className="text-xs text-muted-foreground">{stats.mostFrequentCategory.count} transacties</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Largest Outflow</p>
            {stats.largestOutflow ? (
              <>
                <p className="text-lg font-bold text-foreground truncate">{stats.largestOutflow.categoryName}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(stats.largestOutflow.amount)}</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Income vs Spending ─────────────────────────────────────────────

function IncomeVsSpending({ data }: { data: ReflectData }) {
  const chartData = data.incomeVsSpending.map((d) => ({
    month: shortMonth(d.month),
    Inkomsten: d.income,
    Uitgaven: d.spending,
  }));

  if (chartData.every((d) => d.Inkomsten === 0 && d.Uitgaven === 0)) {
    return <EmptyState message="Geen transacties in deze periode" />;
  }

  const totalIncome = data.incomeVsSpending.reduce((s, d) => s + d.income, 0);
  const totalSpending = data.incomeVsSpending.reduce((s, d) => s + d.spending, 0);
  const diff = totalIncome - totalSpending;

  return (
    <div className="space-y-6">
      <div className="bg-background border border-border rounded-xl p-5">
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-surface rounded-lg p-3">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Inkomsten</p>
            <p className="text-lg font-bold tabular-nums text-green-600 dark:text-green-400">{formatCurrency(totalIncome)}</p>
          </div>
          <div className="bg-surface rounded-lg p-3">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Uitgaven</p>
            <p className="text-lg font-bold tabular-nums text-red-500">{formatCurrency(totalSpending)}</p>
          </div>
          <div className="bg-surface rounded-lg p-3">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Verschil</p>
            <p className={`text-lg font-bold tabular-nums ${diff >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
              {diff >= 0 ? "+" : ""}{formatCurrency(diff)}
            </p>
          </div>
        </div>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
              <YAxis tickFormatter={formatEuro} tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" width={70} />
              <Tooltip formatter={euroTooltipFormatter} cursor={false} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--color-border)" }} />
              <Bar dataKey="Inkomsten" fill="#10b981" radius={[4, 4, 0, 0]} activeBar={{ fill: "#34d399" }} />
              <Bar dataKey="Uitgaven" fill="#f43f5e" radius={[4, 4, 0, 0]} activeBar={{ fill: "#fb7185" }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ─── Spending Trends ────────────────────────────────────────────────

function SpendingTrends({ data }: { data: ReflectData }) {
  const groupNames = data.spendingTrendsGroupNames || [];

  if (data.spendingTrends.every((d) => d.total === 0)) {
    return <EmptyState message="Geen uitgaven in deze periode" />;
  }

  const totals = data.spendingTrends.map((d) => d.total);
  const totalSpending = totals.reduce((s, t) => s + t, 0);
  const avg = totals.length > 0 ? totalSpending / totals.length : 0;

  // Build chart data with group breakdown
  const chartData = data.spendingTrends.map((d) => ({
    month: shortMonth(d.month),
    fullMonth: d.month,
    total: d.total,
    ...d.byGroup,
  }));

  // Month table (newest first)
  const monthRows = [...data.spendingTrends].reverse();

  return (
    <div className="space-y-6">
      {/* Header stats */}
      <div className="bg-background border border-border rounded-xl p-5">
        <div className="mb-6">
          <p className="text-xs text-muted-foreground mb-0.5">Average Monthly Spending</p>
          <p className="text-3xl font-bold tabular-nums text-foreground">{formatCurrency(Math.round(avg))}</p>
          <div className="mt-1">
            <p className="text-xs text-muted-foreground">
              Total Spending
            </p>
            <p className="text-base font-semibold tabular-nums text-foreground">{formatCurrency(totalSpending)}</p>
          </div>
        </div>

        {/* Stacked bar chart */}
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
              <YAxis tickFormatter={formatEuro} tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" width={80} />
              <Tooltip
                formatter={euroTooltipFormatter}
                cursor={false}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-background)" }}
              />
              {groupNames.map((name, i) => {
                const color = CATEGORY_COLORS[i % CATEGORY_COLORS.length];
                return (
                  <Bar
                    key={name}
                    dataKey={name}
                    stackId="spending"
                    fill={color}
                    radius={i === groupNames.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                    activeBar={{ opacity: 0.7 }}
                  />
                );
              })}
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Month table */}
      <div className="bg-background border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">
                Month
              </th>
              <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">
                Total Spending
              </th>
              <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">
                Compared to Average
              </th>
            </tr>
          </thead>
          <tbody>
            {monthRows.map((row) => {
              const diff = row.total - avg;
              const diffPct = avg > 0 ? (Math.abs(diff) / avg) * 100 : 0;
              const isAbove = diff > 0;
              const isBelow = diff < 0;

              return (
                <tr key={row.month} className="border-b border-border last:border-0 hover:bg-surface-hover transition-colors">
                  <td className="px-5 py-3.5 text-sm font-medium text-foreground">
                    {formatMonth(row.month)}
                  </td>
                  <td className="px-5 py-3.5 text-sm font-semibold tabular-nums text-foreground text-right">
                    {formatCurrency(row.total)}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {row.total === 0 ? (
                      <span className="text-sm text-muted-foreground">—</span>
                    ) : (
                      <span className={`text-sm font-medium tabular-nums ${isAbove ? "text-red-500" : isBelow ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                        {isAbove ? "↑" : isBelow ? "↓" : ""}
                        {" "}
                        {isAbove ? "+" : isBelow ? "−" : ""}
                        {formatCurrency(Math.abs(Math.round(diff)))}
                        {" "}
                        ({diffPct.toFixed(1)}%)
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Net Worth ──────────────────────────────────────────────────────

function NetWorth({ data }: { data: ReflectData }) {
  if (data.netWorth.every((d) => d.net === 0 && d.assets === 0)) {
    return <EmptyState message="Geen account data" />;
  }

  const current = data.netWorth[data.netWorth.length - 1];
  const first = data.netWorth[0];
  const totalChange = current.net - first.net;
  const totalChangePct = first.net !== 0 ? (totalChange / Math.abs(first.net)) * 100 : null;

  const chartData = data.netWorth.map((d) => ({
    month: shortMonth(d.month),
    Assets: d.assets,
    Debts: d.liabilities,
    "Net Worth": d.net,
  }));

  // Monthly rows with change calculation (newest first)
  const monthRows = [...data.netWorth].reverse().map((d, i, arr) => {
    const prev = i < arr.length - 1 ? arr[i + 1] : d; // reversed, so prev = next index
    const change = d.net - prev.net;
    const changePct = prev.net !== 0 ? (change / Math.abs(prev.net)) * 100 : null;
    return { ...d, change, changePct };
  });

  return (
    <div className="space-y-6">
      {/* Summary + Chart */}
      <div className="bg-background border border-border rounded-xl p-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Net Worth</p>
            <p className="text-2xl font-bold tabular-nums text-foreground">
              {formatCurrency(current.net)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Assets</p>
            <p className="text-lg font-bold tabular-nums text-blue-600 dark:text-blue-400">
              {formatCurrency(current.assets)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Debts</p>
            <p className="text-lg font-bold tabular-nums text-red-500">
              {formatCurrency(current.liabilities)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Change in Net Worth</p>
            <div className="flex items-center gap-2">
              <span className={`text-lg font-bold tabular-nums ${totalChange >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                {totalChange >= 0 ? "+" : ""}{formatCurrency(totalChange)}
              </span>
              {totalChangePct !== null && (
                <span className={`text-sm font-medium ${totalChange >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                  {totalChange > 0 ? "↑" : totalChange < 0 ? "↓" : ""} {totalChangePct >= 0 ? "+" : ""}{totalChangePct.toFixed(1)}%
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
              <YAxis tickFormatter={formatEuro} tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" width={80} />
              <Tooltip
                formatter={euroTooltipFormatter}
                cursor={false}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-background)" }}
              />
              <Bar dataKey="Assets" fill="#3b82f6" radius={[4, 4, 0, 0]} activeBar={{ fill: "#60a5fa" }} />
              <Bar dataKey="Debts" fill="#c27a7a" radius={[4, 4, 0, 0]} activeBar={{ fill: "#e09090" }} />
              <Line
                type="monotone"
                dataKey="Net Worth"
                stroke="#6b7280"
                strokeWidth={2}
                dot={{ fill: "white", stroke: "#6b7280", strokeWidth: 2, r: 4 }}
                activeDot={{ fill: "white", stroke: "#6b7280", strokeWidth: 2, r: 5 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly table */}
      <div className="bg-background border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">
                Month
              </th>
              <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">
                Net Worth
              </th>
              <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">
                Monthly Change
              </th>
            </tr>
          </thead>
          <tbody>
            {monthRows.map((row) => (
              <tr key={row.month} className="border-b border-border last:border-0 hover:bg-surface-hover transition-colors">
                <td className="px-5 py-3.5 text-sm font-medium text-foreground">
                  {formatMonth(row.month)}
                </td>
                <td className="px-5 py-3.5 text-sm font-semibold tabular-nums text-foreground text-right">
                  {formatCurrency(row.net)}
                </td>
                <td className="px-5 py-3.5 text-right">
                  {row.change === 0 ? (
                    <span className="text-sm text-muted-foreground tabular-nums">€0,00 (0.0%)</span>
                  ) : (
                    <span className={`text-sm font-medium tabular-nums ${row.change > 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                      {row.change > 0 ? "↑" : "↓"} {row.change > 0 ? "+" : "−"}{formatCurrency(Math.abs(row.change))}{row.changePct !== null ? ` (${Math.abs(row.changePct).toFixed(1)}%)` : ""}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Empty State ────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
      {message}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export default function ReflectView() {
  const [tab, setTab] = useState<ReflectTab>("spending");
  const [period, setPeriod] = useState<PeriodKey>("this-month");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string> | null>(null);
  const [data, setData] = useState<ReflectData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (p: PeriodKey, catIds: Set<string> | null) => {
    setLoading(true);
    try {
      const { from, to } = periodToRange(p);
      const params = new URLSearchParams({ from, to });
      if (catIds && catIds.size > 0) {
        params.set("categoryIds", Array.from(catIds).join(","));
      }
      const res = await fetch(`/api/finance/reflect?${params}`);
      if (res.ok) {
        const newData = await res.json();
        setData(newData);
        // Initialize category selection to all on first load
        if (!catIds) {
          const allIds = new Set(
            (newData.categoryGroups as CategoryGroup[]).flatMap((g) => g.categories.map((c) => c.id))
          );
          setSelectedCategoryIds(allIds);
        }
      }
    } catch (err) {
      console.error("Failed to fetch reflect data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(period, selectedCategoryIds);
  }, [period]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCategoryChange = useCallback(
    (ids: Set<string>) => {
      setSelectedCategoryIds(ids);
      fetchData(period, ids);
    },
    [period, fetchData]
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-border bg-background">
        {/* Tabs */}
        <div className="flex gap-4 px-4 md:px-6 pt-3 overflow-x-auto scrollbar-hide">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`pb-2.5 text-sm font-medium whitespace-nowrap transition-all border-b-2 ${
                tab === key
                  ? "border-[#4B56E2] text-[#4B56E2]"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-2 px-4 md:px-6 py-2.5">
          <PeriodDropdown value={period} onChange={setPeriod} />
          {data && selectedCategoryIds && (
            <CategoryFilter
              categoryGroups={data.categoryGroups}
              selectedIds={selectedCategoryIds}
              onChange={handleCategoryChange}
            />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center p-8 h-full">
            <div className="flex items-center gap-3 text-muted-foreground">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-sm">Laden...</span>
            </div>
          </div>
        ) : !data ? (
          <EmptyState message="Geen data beschikbaar" />
        ) : (
          <div className="p-4 md:p-6">
            {tab === "spending" && <SpendingBreakdown data={data} />}
            {tab === "income-vs-spending" && <IncomeVsSpending data={data} />}
            {tab === "trends" && <SpendingTrends data={data} />}
            {tab === "net-worth" && <NetWorth data={data} />}
          </div>
        )}
      </div>
    </div>
  );
}
