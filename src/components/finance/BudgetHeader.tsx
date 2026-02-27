"use client";

import { formatCurrency, formatMonth, prevMonth, nextMonth, getMonthKey } from "@/lib/types/finance";

export type BudgetFilter = "all" | "overspent" | "underfunded" | "money-available";

interface BudgetHeaderProps {
  month: string;
  readyToAssign: number;
  filter: BudgetFilter;
  filterCounts: Record<BudgetFilter, number>;
  onMonthChange: (month: string) => void;
  onFilterChange: (filter: BudgetFilter) => void;
}

const FILTERS: { key: BudgetFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "underfunded", label: "Underfunded" },
  { key: "overspent", label: "Overspent" },
  { key: "money-available", label: "Money Available" },
];

export default function BudgetHeader({
  month,
  readyToAssign,
  filter,
  filterCounts,
  onMonthChange,
  onFilterChange,
}: BudgetHeaderProps) {
  const isPositive = readyToAssign > 0;
  const isNegative = readyToAssign < 0;

  return (
    <div className="border-b border-border bg-background">
      {/* Top row: month nav + ready to assign */}
      <div className="flex items-center justify-between px-4 md:px-6 py-3">
        {/* Month navigator */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onMonthChange(prevMonth(month))}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <h2 className="text-base font-bold text-foreground min-w-[110px] text-center">
            {formatMonth(month)}
          </h2>

          <button
            onClick={() => onMonthChange(nextMonth(month))}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          <button
            onClick={() => onMonthChange(getMonthKey())}
            className="ml-1 px-2.5 py-1 rounded-md text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors border border-border"
          >
            Today
          </button>
        </div>

        {/* Ready to Assign */}
        <div
          className={`flex items-center gap-3 px-4 py-2 rounded-xl transition-colors ${
            isPositive
              ? "bg-green-500/12 text-green-600 dark:text-green-400"
              : isNegative
              ? "bg-red-500/12 text-red-600 dark:text-red-400"
              : "bg-surface text-muted-foreground"
          }`}
        >
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-medium opacity-60 uppercase tracking-wider">Ready to Assign</span>
            <span className="text-lg font-bold tabular-nums leading-tight">{formatCurrency(readyToAssign)}</span>
          </div>
          {isPositive && (
            <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center shrink-0">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          )}
          {isNegative && (
            <div className="w-7 h-7 rounded-full bg-red-500 flex items-center justify-center shrink-0">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <line x1="12" y1="8" x2="12" y2="13" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
          )}
          {readyToAssign === 0 && (
            <div className="w-7 h-7 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-0.5 px-4 md:px-6 pb-2 overflow-x-auto scrollbar-hide">
        {FILTERS.map(({ key, label }) => {
          const count = filterCounts[key];
          const isActive = filter === key;
          if (key !== "all" && count === 0) return null;

          return (
            <button
              key={key}
              onClick={() => onFilterChange(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
                isActive
                  ? "bg-[#2B3270]/10 text-[#4B56E2] dark:bg-accent/10 dark:text-accent"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
              }`}
            >
              {label}
              {key !== "all" && count > 0 && (
                <span
                  className={`min-w-[16px] px-1 py-0.5 rounded-full text-[10px] font-bold text-center ${
                    isActive ? "bg-accent/15" : "bg-surface"
                  } ${key === "overspent" && !isActive ? "text-red-400" : ""} ${
                    key === "underfunded" && !isActive ? "text-yellow-600 dark:text-yellow-400" : ""
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
