"use client";

import { useState } from "react";
import { FinanceCategoryGroup, FinanceCategory, CategoryBudgetData, formatCurrency } from "@/lib/types/finance";
import CategoryRow from "./CategoryRow";

interface CategoryGroupRowProps {
  group: FinanceCategoryGroup;
  budgets: CategoryBudgetData[];
  onAssignedChange: (categoryId: string, newAssigned: number) => void;
  onAddCategory: (groupId: string) => void;
  onEditGroup: (group: FinanceCategoryGroup) => void;
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

export default function CategoryGroupRow({
  group,
  budgets,
  onAssignedChange,
  onAddCategory,
  onEditGroup,
  onEditCategory,
  onDeleteCategory,
  onSetTarget,
  onMoveMoney,
}: CategoryGroupRowProps) {
  const [expanded, setExpanded] = useState(true);

  const budgetMap = new Map(budgets.map((b) => [b.categoryId, b]));

  const totalAssigned = budgets.reduce((s, b) => s + b.assigned, 0);
  const totalActivity = budgets.reduce((s, b) => s + b.activity, 0);
  const totalAvailable = budgets.reduce((s, b) => s + b.available, 0);

  return (
    <div>
      {/* Group header — YNAB style: slightly tinted bg, bold name */}
      <div
        className="grid grid-cols-[1fr_110px_110px_140px] md:grid-cols-[1fr_140px_140px_170px] items-center px-4 md:px-6 py-2.5 bg-surface/60 border-b border-border cursor-pointer hover:bg-surface transition-colors group"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className={`shrink-0 transition-transform duration-200 text-muted-foreground ${expanded ? "rotate-90" : ""}`}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <span className="text-[12px] font-bold text-foreground tracking-wide uppercase truncate">
            {group.name}
          </span>

          {/* Hover actions */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddCategory(group.id);
              }}
              className="p-0.5 rounded hover:bg-surface-hover text-muted-foreground hover:text-foreground transition-colors"
              title="Categorie toevoegen"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEditGroup(group);
              }}
              className="p-0.5 rounded hover:bg-surface-hover text-muted-foreground hover:text-foreground transition-colors"
              title="Groep bewerken"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-muted-foreground">
                <circle cx="5" cy="12" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="19" cy="12" r="2" />
              </svg>
            </button>
          </div>
        </div>

        <div className="text-right text-[13px] font-semibold text-muted-foreground tabular-nums pr-2">
          {totalAssigned === 0 ? "" : formatCurrency(totalAssigned)}
        </div>
        <div className="text-right text-[13px] font-semibold text-muted-foreground tabular-nums pr-2">
          {totalActivity === 0 ? "" : formatCurrency(totalActivity)}
        </div>
        <div className={`text-right text-[13px] font-semibold tabular-nums pr-3 ${totalAvailable < 0 ? "text-red-500 dark:text-red-400" : totalAvailable > 0 ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
          {totalAvailable === 0 ? "" : formatCurrency(totalAvailable)}
        </div>
      </div>

      {/* Categories — collapse animation */}
      <div
        className={`transition-all duration-200 ease-out ${
          expanded ? "" : "max-h-0 overflow-hidden opacity-0"
        }`}
      >
        {group.categories.map((category) => {
          const budget = budgetMap.get(category.id) || {
            categoryId: category.id,
            assigned: 0,
            activity: 0,
            available: 0,
          };
          return (
            <CategoryRow
              key={category.id}
              category={category}
              budget={budget}
              onAssignedChange={onAssignedChange}
              onEditCategory={onEditCategory}
              onDeleteCategory={onDeleteCategory}
              onSetTarget={onSetTarget}
              onMoveMoney={onMoveMoney}
            />
          );
        })}
      </div>
    </div>
  );
}
