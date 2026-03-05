"use client";

import { useState, useRef, useEffect } from "react";
import { FinanceCategory, CategoryBudgetData, centsToEuro, euroToCents, formatCurrency } from "@/lib/types/finance";

interface CategoryRowProps {
  category: FinanceCategory;
  budget: CategoryBudgetData;
  onAssignedChange: (categoryId: string, newAssigned: number) => void;
  onEditCategory: (category: FinanceCategory) => void;
  onDeleteCategory: (id: string) => void;
  onSetTarget: (categoryId: string) => void;
  onMoveMoney: (
    categoryId: string,
    categoryName: string,
    available: number,
    assigned: number,
    anchorRect: DOMRect
  ) => void;
}

type AvailableStatus = "funded" | "spent" | "overspent" | "underfunded" | "available" | "empty";

function getStatus(budget: CategoryBudgetData): {
  status: AvailableStatus;
  label: string;
  sublabel?: string;
} {
  const { available, activity, assigned, target } = budget;

  // Overspent (available < 0)
  if (available < 0) {
    if (assigned > 0) {
      return {
        status: "overspent",
        label: "Overspent",
        sublabel: `${formatCurrency(Math.abs(activity))} of ${formatCurrency(assigned)}`,
      };
    }
    return {
      status: "overspent",
      label: `${formatCurrency(Math.abs(available))} overspent`,
    };
  }

  // Target-aware — funded but has activity
  if (target && target.needed === 0 && target.amount > 0) {
    if (activity < 0) {
      return {
        status: "funded",
        label: "Funded",
        sublabel: `Spent ${formatCurrency(Math.abs(activity))} of ${formatCurrency(assigned)}`,
      };
    }
    return { status: "funded", label: "Funded" };
  }

  // Target underfunded
  if (target && target.needed > 0) {
    const dayLabel = target.dayOfMonth ? ` by the ${target.dayOfMonth}th` : "";
    return {
      status: "underfunded",
      label: `${formatCurrency(target.needed)} needed${dayLabel}`,
    };
  }

  // No target
  if (available === 0 && activity < 0) {
    return { status: "spent", label: "Fully Spent" };
  }
  if (available === 0 && assigned === 0 && activity === 0) {
    return { status: "empty", label: "" };
  }
  if (available > 0 && assigned > 0) {
    return { status: "funded", label: "" };
  }
  if (available > 0) {
    return { status: "available", label: "" };
  }
  return { status: "empty", label: "" };
}

export default function CategoryRow({
  category,
  budget,
  onAssignedChange,
  onEditCategory,
  onDeleteCategory,
  onSetTarget,
  onMoveMoney,
}: CategoryRowProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.select();
    }
  }, [editing]);

  const handleStartEdit = () => {
    setEditValue(budget.assigned === 0 ? "" : centsToEuro(budget.assigned));
    setEditing(true);
  };

  const handleSave = () => {
    setEditing(false);
    const newCents = euroToCents(editValue || "0");
    if (newCents !== budget.assigned) {
      onAssignedChange(category.id, newCents);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") setEditing(false);
    if (e.key === "Tab") handleSave();
  };

  const { status, label, sublabel } = getStatus(budget);
  const hasTarget = !!budget.target;
  const targetMet = hasTarget && budget.target!.needed === 0;

  // ─── Progress bar ───────────────────────────────────────────────────
  // Altijd zichtbaar als er assigned > 0 is.
  // - Funded / no target: gestreept groen (spent) + solid groen (remaining)
  // - Overspent: groen (assigned) + rood gestreept (overspent)
  // - Underfunded target: amber (progress naar target)
  const progressBar = (() => {
    const assigned = budget.assigned;
    const absActivity = Math.abs(budget.activity);
    const isOverspent = budget.available < 0;

    if (assigned === 0 && !isOverspent) return { type: "empty" as const };

    if (isOverspent) {
      const overspentAmount = Math.abs(budget.available);
      const total = (assigned > 0 ? assigned : 0) + overspentAmount;
      const greenPct = assigned > 0 ? Math.round((assigned / total) * 100) : 0;
      const redPct = 100 - greenPct;
      return { type: "overspent" as const, greenPct, redPct };
    }

    // Underfunded target
    if (budget.target && budget.target.needed > 0) {
      return { type: "underfunded" as const, amberPct: Math.round(budget.target.progress * 100) };
    }

    // Funded of no target — toon spending vs assigned
    const spentPct = budget.activity < 0
      ? Math.min(100, Math.round((absActivity / assigned) * 100))
      : 0;
    const remainingPct = 100 - spentPct;
    return { type: "funded" as const, spentPct, remainingPct };
  })();

  // ─── Pill classes ───────────────────────────────────────────────────
  const pillClasses = (() => {
    switch (status) {
      case "funded":
        return "bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400";
      case "underfunded":
        return "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400";
      case "overspent":
        return "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400";
      case "spent":
        return "bg-muted-foreground/10 text-muted-foreground";
      case "available":
        return "bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400";
      default:
        return "";
    }
  })();

  const labelColor = (() => {
    switch (status) {
      case "funded": return "text-green-700 dark:text-green-400";
      case "underfunded": return "text-amber-700 dark:text-amber-400";
      case "overspent": return "text-red-600 dark:text-red-400";
      default: return "text-muted-foreground";
    }
  })();

  return (
    <div className="grid grid-cols-[1fr_110px_110px_140px] md:grid-cols-[1fr_140px_140px_170px] items-center px-4 md:px-6 py-3 border-b border-border/40 hover:bg-surface-hover/50 transition-colors group">
      {/* Category name + progress bar + status */}
      <div className="relative flex items-center gap-2.5 pl-5 md:pl-7 min-w-0">
        <div className="flex flex-col min-w-0 flex-1 gap-1">
          {/* Name + label */}
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-foreground text-[14px] font-medium truncate">{category.name}</span>
            {label && (
              <span className={`text-[12px] font-medium shrink-0 hidden md:inline ${labelColor}`}>
                {label}
                {sublabel && (
                  <span className="font-normal ml-1 opacity-70">{sublabel}</span>
                )}
              </span>
            )}
          </div>

          {/* Progress bar */}
          {progressBar && (
            <div className="flex items-center h-[5px] w-full rounded-sm overflow-hidden bg-gray-300 dark:bg-gray-600">
              {progressBar.type === "funded" && (
                <>
                  {/* Spent portion — green with diagonal stripes */}
                  {progressBar.spentPct > 0 && (
                    <div
                      className="h-full"
                      style={{
                        width: `${progressBar.spentPct}%`,
                        background: "repeating-linear-gradient(135deg, #22c55e, #22c55e 2px, #86efac 2px, #86efac 4px)",
                      }}
                    />
                  )}
                  {/* Remaining available — solid darker green/teal */}
                  {progressBar.remainingPct > 0 && (
                    <div
                      className="h-full bg-green-600 dark:bg-green-500 transition-all duration-300"
                      style={{ width: `${progressBar.remainingPct}%` }}
                    />
                  )}
                </>
              )}
              {progressBar.type === "overspent" && (
                <>
                  {/* Assigned portion — solid green */}
                  {progressBar.greenPct > 0 && (
                    <div
                      className="h-full bg-green-500 transition-all duration-300"
                      style={{ width: `${progressBar.greenPct}%` }}
                    />
                  )}
                  {/* Overspent portion — red striped */}
                  {progressBar.redPct > 0 && (
                    <div
                      className="h-full"
                      style={{
                        width: `${progressBar.redPct}%`,
                        background: "repeating-linear-gradient(135deg, #ef4444, #ef4444 2px, #fca5a5 2px, #fca5a5 4px)",
                      }}
                    />
                  )}
                </>
              )}
              {progressBar.type === "underfunded" && progressBar.amberPct > 0 && (
                <div
                  className="h-full bg-amber-400 dark:bg-amber-500 transition-all duration-300"
                  style={{ width: `${progressBar.amberPct}%` }}
                />
              )}
            </div>
          )}
        </div>

        {/* Context menu */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-surface-hover text-muted-foreground hover:text-foreground transition-all shrink-0"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="5" cy="12" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="19" cy="12" r="2" />
          </svg>
        </button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div className="absolute left-20 top-full mt-1 z-50 w-44 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
              <button
                onClick={() => { setMenuOpen(false); onSetTarget(category.id); }}
                className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-surface-hover transition-colors"
              >
                {budget.target ? "Doel bewerken" : "Doel instellen"}
              </button>
              <button
                onClick={() => { setMenuOpen(false); onEditCategory(category); }}
                className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-surface-hover transition-colors"
              >
                Naam wijzigen
              </button>
              <button
                onClick={() => { setMenuOpen(false); onDeleteCategory(category.id); }}
                className="w-full px-3 py-2 text-left text-sm text-red-500 dark:text-red-400 hover:bg-red-500/10 transition-colors"
              >
                Verwijderen
              </button>
            </div>
          </>
        )}
      </div>

      {/* Assigned + target clock */}
      <div className="text-right pr-2">
        {editing ? (
          <input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="w-full text-right text-[14px] bg-background border border-accent rounded px-2 py-1 outline-none text-foreground tabular-nums"
            placeholder="0,00"
          />
        ) : (
          <button
            onClick={handleStartEdit}
            className="w-full text-right text-[14px] tabular-nums text-foreground hover:text-accent transition-colors cursor-text px-2 py-1 rounded hover:bg-surface-hover inline-flex items-center justify-end gap-1.5"
          >
            {budget.assigned === 0 ? (
              <span className="text-muted-foreground/40">{formatCurrency(0)}</span>
            ) : (
              <>
                {formatCurrency(budget.assigned)}
                {hasTarget && (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`shrink-0 ${targetMet ? "text-green-500" : "text-amber-500"}`}>
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                )}
              </>
            )}
          </button>
        )}
      </div>

      {/* Activity */}
      <div className={`text-right tabular-nums text-[14px] pr-2 ${budget.activity < 0 ? "text-foreground" : budget.activity > 0 ? "text-green-600 dark:text-green-400" : "text-muted-foreground/40"}`}>
        {formatCurrency(budget.activity)}
      </div>

      {/* Available — pill (clickable voor move money) */}
      <div className="text-right pr-3 flex justify-end">
        {status === "empty" ? (
          <span className="text-[14px] text-muted-foreground/40 tabular-nums">{formatCurrency(0)}</span>
        ) : budget.available !== 0 ? (
          <button
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              onMoveMoney(category.id, category.name, budget.available, budget.assigned, rect);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[13px] font-bold tabular-nums cursor-pointer hover:ring-2 hover:ring-accent/30 transition-all ${pillClasses}`}
          >
            {status === "funded" && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
            {status === "underfunded" && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            )}
            {status === "overspent" && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            )}
            {formatCurrency(budget.available)}
          </button>
        ) : (
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[13px] font-semibold tabular-nums ${pillClasses}`}>
            {(status === "spent" || status === "funded") && (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
                <circle cx="12" cy="12" r="10" />
                <polyline points="9 12 11 14 15 10" />
              </svg>
            )}
            {formatCurrency(budget.available)}
          </span>
        )}
      </div>
    </div>
  );
}
