"use client";

import { useMemo } from "react";
import { FinanceCategoryGroup, FinanceCategory, CategoryBudgetData } from "@/lib/types/finance";
import { BudgetFilter } from "./BudgetHeader";
import CategoryGroupRow from "./CategoryGroupRow";

interface BudgetTableProps {
  categoryGroups: {
    group: FinanceCategoryGroup;
    budgets: CategoryBudgetData[];
  }[];
  filter: BudgetFilter;
  onAssignedChange: (categoryId: string, newAssigned: number) => void;
  onAddCategory: (groupId: string) => void;
  onEditGroup: (group: FinanceCategoryGroup) => void;
  onEditCategory: (category: FinanceCategory) => void;
  onDeleteCategory: (id: string) => void;
  onAddCategoryGroup: () => void;
  onSetTarget: (categoryId: string) => void;
  onMoveMoney: (
    categoryId: string,
    categoryName: string,
    available: number,
    assigned: number,
    anchorRect: DOMRect
  ) => void;
}

export default function BudgetTable({
  categoryGroups,
  filter,
  onAssignedChange,
  onAddCategory,
  onEditGroup,
  onEditCategory,
  onDeleteCategory,
  onAddCategoryGroup,
  onSetTarget,
  onMoveMoney,
}: BudgetTableProps) {
  const filteredGroups = useMemo(() => {
    if (filter === "all") return categoryGroups;

    return categoryGroups
      .map(({ group, budgets }) => {
        const filteredBudgets = budgets.filter((b) => {
          switch (filter) {
            case "overspent":
              return b.available < 0;
            case "underfunded":
              return b.available < 0 || (b.assigned > 0 && b.available < b.assigned && b.activity < 0);
            case "money-available":
              return b.available > 0;
            default:
              return true;
          }
        });

        const filteredCategoryIds = new Set(filteredBudgets.map((b) => b.categoryId));
        const filteredCategories = group.categories.filter((c) => filteredCategoryIds.has(c.id));

        if (filteredCategories.length === 0) return null;

        return {
          group: { ...group, categories: filteredCategories },
          budgets: filteredBudgets,
        };
      })
      .filter(Boolean) as typeof categoryGroups;
  }, [categoryGroups, filter]);

  if (categoryGroups.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
        <svg
          width="56"
          height="56"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.8"
          className="text-muted-foreground/15 mb-4"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="9" y1="3" x2="9" y2="21" />
        </svg>
        <p className="text-muted-foreground text-sm mb-4">
          Nog geen budget categorieën.
        </p>
        <button
          onClick={onAddCategoryGroup}
          className="px-4 py-2 bg-[#4B56E2] text-white rounded-lg text-sm font-medium hover:bg-[#3E48D0] transition-colors"
        >
          Eerste groep aanmaken
        </button>
      </div>
    );
  }

  if (filteredGroups.length === 0 && filter !== "all") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          className="text-green-500/30 mb-3"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <p className="text-muted-foreground text-sm">
          {filter === "overspent" && "Geen overspent categorieën."}
          {filter === "underfunded" && "Geen underfunded categorieën."}
          {filter === "money-available" && "Geen categorieën met geld beschikbaar."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Column headers — YNAB style */}
      <div className="grid grid-cols-[1fr_110px_110px_140px] md:grid-cols-[1fr_140px_140px_170px] items-center px-4 md:px-6 py-2.5 border-b border-border text-[11px] font-bold text-muted-foreground uppercase tracking-[0.08em] sticky top-0 bg-background z-10">
        <div className="pl-7">Category</div>
        <div className="text-right pr-2">Assigned</div>
        <div className="text-right pr-2">Activity</div>
        <div className="text-right pr-3">Available</div>
      </div>

      {/* Category groups */}
      {filteredGroups.map(({ group, budgets }) => (
        <CategoryGroupRow
          key={group.id}
          group={group}
          budgets={budgets}
          onAssignedChange={onAssignedChange}
          onAddCategory={onAddCategory}
          onEditGroup={onEditGroup}
          onEditCategory={onEditCategory}
          onDeleteCategory={onDeleteCategory}
          onSetTarget={onSetTarget}
          onMoveMoney={onMoveMoney}
        />
      ))}

      {/* Add group button */}
      {filter === "all" && (
        <div className="px-4 md:px-6 py-3">
          <button
            onClick={onAddCategoryGroup}
            className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Category Group
          </button>
        </div>
      )}
    </div>
  );
}
