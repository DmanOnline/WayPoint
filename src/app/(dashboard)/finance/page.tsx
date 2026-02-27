"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  FinanceAccount,
  FinanceTransaction,
  FinanceCategoryGroup,
  CategoryBudgetData,
  AccountType,
  AccountGroup,
  TargetType,
  TargetRefillType,
  getMonthKey,
} from "@/lib/types/finance";
import FinanceSidebar from "@/components/finance/FinanceSidebar";
import BudgetHeader, { BudgetFilter } from "@/components/finance/BudgetHeader";
import BudgetTable from "@/components/finance/BudgetTable";
import TransactionList from "@/components/finance/TransactionList";
import AccountModal from "@/components/finance/AccountModal";
import CategoryModal from "@/components/finance/CategoryModal";
import CategoryTargetModal from "@/components/finance/CategoryTargetModal";
import MoveMoneyPopover from "@/components/finance/MoveMoneyPopover";

interface BudgetData {
  month: string;
  readyToAssign: number;
  categoryGroups: {
    group: FinanceCategoryGroup;
    budgets: CategoryBudgetData[];
  }[];
}

export default function FinancePage() {
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [budgetData, setBudgetData] = useState<BudgetData | null>(null);
  const [month, setMonth] = useState(getMonthKey());
  const [activeView, setActiveView] = useState("budget");
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [budgetFilter, setBudgetFilter] = useState<BudgetFilter>("all");
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Account modal
  const [accountModal, setAccountModal] = useState<{
    open: boolean;
    account?: FinanceAccount | null;
  }>({ open: false });

  // Category modal
  const [categoryModal, setCategoryModal] = useState<{
    open: boolean;
    mode: "group" | "category";
    groupId?: string;
    editItem?: { id: string; name: string } | null;
  }>({ open: false, mode: "group" });

  // Target modal
  const [targetModal, setTargetModal] = useState<{
    open: boolean;
    categoryId: string;
    categoryName: string;
  }>({ open: false, categoryId: "", categoryName: "" });

  // Move money popover
  const [moveMoneyState, setMoveMoneyState] = useState<{
    categoryId: string;
    categoryName: string;
    available: number;
    assigned: number;
    anchorRect: DOMRect;
  } | null>(null);

  // ─── Data fetching ─────────────────────────────────────────────────

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/finance/accounts");
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts);
      }
    } catch (err) {
      console.error("Failed to fetch accounts:", err);
    }
  }, []);

  const fetchBudget = useCallback(async (m: string) => {
    try {
      const res = await fetch(`/api/finance/budget?month=${m}`);
      if (res.ok) {
        const data = await res.json();
        setBudgetData(data);
      }
    } catch (err) {
      console.error("Failed to fetch budget:", err);
    }
  }, []);

  const fetchTransactions = useCallback(async (accountId?: string) => {
    try {
      const params = new URLSearchParams();
      if (accountId) params.set("accountId", accountId);
      params.set("limit", "200");
      const res = await fetch(`/api/finance/transactions?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions);
      }
    } catch (err) {
      console.error("Failed to fetch transactions:", err);
    }
  }, []);

  useEffect(() => {
    async function init() {
      setLoading(true);
      await Promise.all([fetchAccounts(), fetchBudget(month)]);
      setLoading(false);
    }
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchBudget(month);
  }, [month, fetchBudget]);

  // Fetch transactions when switching to account view
  useEffect(() => {
    if (activeView === "all-accounts") {
      fetchTransactions();
    } else if (activeView.startsWith("account:")) {
      const accountId = activeView.replace("account:", "");
      fetchTransactions(accountId);
    }
  }, [activeView, fetchTransactions]);

  // ─── Account actions ───────────────────────────────────────────────

  const handleSaveAccount = useCallback(
    async (data: {
      name: string;
      type: AccountType;
      group: AccountGroup;
      startBalance: number;
      color: string;
    }) => {
      const isEditing = accountModal.account;
      const url = isEditing
        ? `/api/finance/accounts/${accountModal.account!.id}`
        : "/api/finance/accounts";
      const res = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Opslaan mislukt");
      await fetchAccounts();
      await fetchBudget(month);
    },
    [accountModal, fetchAccounts, fetchBudget, month]
  );

  const handleDeleteAccount = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/finance/accounts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Verwijderen mislukt");
      setAccountModal({ open: false });
      await fetchAccounts();
      await fetchBudget(month);
    },
    [fetchAccounts, fetchBudget, month]
  );

  // ─── Category actions ──────────────────────────────────────────────

  const handleSaveCategory = useCallback(
    async (data: { name: string; groupId?: string; type: "group" | "category"; editId?: string }) => {
      if (data.editId) {
        // Update
        const res = await fetch(`/api/finance/categories/${data.editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: data.name, type: data.type }),
        });
        if (!res.ok) throw new Error("Opslaan mislukt");
      } else {
        // Create
        const res = await fetch("/api/finance/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: data.name,
            groupId: data.type === "category" ? data.groupId : undefined,
          }),
        });
        if (!res.ok) throw new Error("Aanmaken mislukt");
      }
      await fetchBudget(month);
    },
    [fetchBudget, month]
  );

  const handleDeleteCategory = useCallback(
    async (id: string, type: "group" | "category") => {
      const res = await fetch(`/api/finance/categories/${id}?type=${type}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Verwijderen mislukt");
      setCategoryModal({ open: false, mode: "group" });
      await fetchBudget(month);
    },
    [fetchBudget, month]
  );

  // ─── Budget actions ────────────────────────────────────────────────

  const handleAssignedChange = useCallback(
    async (categoryId: string, newAssigned: number) => {
      // Optimistic update
      setBudgetData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          categoryGroups: prev.categoryGroups.map((cg) => ({
            ...cg,
            budgets: cg.budgets.map((b) =>
              b.categoryId === categoryId ? { ...b, assigned: newAssigned } : b
            ),
          })),
        };
      });

      try {
        await fetch("/api/finance/budget", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ categoryId, month, assigned: newAssigned }),
        });
        // Refetch for accurate calculations
        await fetchBudget(month);
      } catch (err) {
        console.error("Failed to update assigned:", err);
        await fetchBudget(month);
      }
    },
    [month, fetchBudget]
  );

  // ─── Target actions ────────────────────────────────────────────────

  const handleOpenTarget = useCallback(
    (categoryId: string) => {
      // Zoek categorie naam
      let name = "";
      if (budgetData) {
        for (const cg of budgetData.categoryGroups) {
          const cat = cg.group.categories.find((c) => c.id === categoryId);
          if (cat) { name = cat.name; break; }
        }
      }
      setTargetModal({ open: true, categoryId, categoryName: name });
    },
    [budgetData]
  );

  const handleSaveTarget = useCallback(
    async (data: {
      categoryId: string;
      type: TargetType;
      amount: number;
      dayOfMonth: number | null;
      refillType: TargetRefillType;
    }) => {
      const res = await fetch("/api/finance/targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Target opslaan mislukt");
      await fetchBudget(month);
    },
    [fetchBudget, month]
  );

  const handleDeleteTarget = useCallback(
    async (categoryId: string) => {
      const res = await fetch("/api/finance/targets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId }),
      });
      if (!res.ok) throw new Error("Target verwijderen mislukt");
      await fetchBudget(month);
    },
    [fetchBudget, month]
  );

  // ─── Move Money actions ────────────────────────────────────────────

  const handleOpenMoveMoney = useCallback(
    (categoryId: string, categoryName: string, available: number, assigned: number, anchorRect: DOMRect) => {
      setMoveMoneyState({ categoryId, categoryName, available, assigned, anchorRect });
    },
    []
  );

  const handleMoveMoney = useCallback(
    async (sourceCategoryId: string, destCategoryId: string, amountCents: number) => {
      if (amountCents <= 0 || !budgetData) return;

      const allBudgets = budgetData.categoryGroups.flatMap((cg) => cg.budgets);
      const sourceBudget = allBudgets.find((b) => b.categoryId === sourceCategoryId);
      const destBudget = allBudgets.find((b) => b.categoryId === destCategoryId);
      if (!sourceBudget || !destBudget) return;

      const isOverspentCover = sourceBudget.available < 0;

      let sourceNewAssigned: number;
      let destNewAssigned: number;

      if (isOverspentCover) {
        // Cover overspending: source krijgt meer assigned, dest geeft af
        sourceNewAssigned = sourceBudget.assigned + amountCents;
        destNewAssigned = destBudget.assigned - amountCents;
      } else {
        // Move surplus: source geeft af, dest krijgt meer
        sourceNewAssigned = sourceBudget.assigned - amountCents;
        destNewAssigned = destBudget.assigned + amountCents;
      }

      // Optimistic update voor beide tegelijk
      setBudgetData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          categoryGroups: prev.categoryGroups.map((cg) => ({
            ...cg,
            budgets: cg.budgets.map((b) => {
              if (b.categoryId === sourceCategoryId) return { ...b, assigned: sourceNewAssigned };
              if (b.categoryId === destCategoryId) return { ...b, assigned: destNewAssigned };
              return b;
            }),
          })),
        };
      });

      setMoveMoneyState(null);

      try {
        await Promise.all([
          fetch("/api/finance/budget", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ categoryId: sourceCategoryId, month, assigned: sourceNewAssigned }),
          }),
          fetch("/api/finance/budget", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ categoryId: destCategoryId, month, assigned: destNewAssigned }),
          }),
        ]);
        await fetchBudget(month);
      } catch (err) {
        console.error("Failed to move money:", err);
        await fetchBudget(month);
      }
    },
    [budgetData, month, fetchBudget]
  );

  const allCategoriesFlat = useMemo(() => {
    if (!budgetData) return [];
    return budgetData.categoryGroups.flatMap((cg) =>
      cg.group.categories.map((cat) => {
        const budget = cg.budgets.find((b) => b.categoryId === cat.id);
        return {
          id: cat.id,
          name: cat.name,
          groupName: cg.group.name,
          available: budget?.available || 0,
        };
      })
    );
  }, [budgetData]);

  // ─── Transaction actions ────────────────────────────────────────────

  const handleSaveTransaction = useCallback(
    async (data: {
      accountId: string;
      categoryId: string | null;
      date: string;
      payee: string;
      memo: string;
      amount: number;
      isCleared: boolean;
    }) => {
      const res = await fetch("/api/finance/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Aanmaken mislukt");

      // Refresh data
      const accountId = activeView.startsWith("account:")
        ? activeView.replace("account:", "")
        : undefined;
      await Promise.all([
        fetchTransactions(accountId),
        fetchAccounts(),
        fetchBudget(month),
      ]);
    },
    [activeView, fetchTransactions, fetchAccounts, fetchBudget, month]
  );

  const handleDeleteTransaction = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/finance/transactions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Verwijderen mislukt");

      const accountId = activeView.startsWith("account:")
        ? activeView.replace("account:", "")
        : undefined;
      await Promise.all([
        fetchTransactions(accountId),
        fetchAccounts(),
        fetchBudget(month),
      ]);
    },
    [activeView, fetchTransactions, fetchAccounts, fetchBudget, month]
  );

  const handleUpdateTransaction = useCallback(
    async (
      id: string,
      data: {
        categoryId?: string | null;
        date?: string;
        payee?: string;
        memo?: string;
        amount?: number;
      }
    ) => {
      const res = await fetch(`/api/finance/transactions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Updaten mislukt");

      const accountId = activeView.startsWith("account:")
        ? activeView.replace("account:", "")
        : undefined;
      await Promise.all([
        fetchTransactions(accountId),
        fetchAccounts(),
        fetchBudget(month),
      ]);
    },
    [activeView, fetchTransactions, fetchAccounts, fetchBudget, month]
  );

  const handleToggleCleared = useCallback(
    async (id: string, isCleared: boolean) => {
      await fetch(`/api/finance/transactions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCleared }),
      });
      setTransactions((prev) =>
        prev.map((t) => (t.id === id ? { ...t, isCleared } : t))
      );
    },
    []
  );

  // ─── Filter counts ─────────────────────────────────────────────────

  const filterCounts = useMemo(() => {
    const allBudgets = budgetData?.categoryGroups.flatMap((cg) => cg.budgets) || [];
    return {
      all: allBudgets.length,
      overspent: allBudgets.filter((b) => b.available < 0).length,
      underfunded: allBudgets.filter(
        (b) => b.available < 0 || (b.assigned > 0 && b.available < b.assigned && b.activity < 0)
      ).length,
      "money-available": allBudgets.filter((b) => b.available > 0).length,
    };
  }, [budgetData]);

  // ─── Render ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="flex items-center gap-3 text-muted-foreground">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm">Laden...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex h-full overflow-hidden">
      <FinanceSidebar
        accounts={accounts}
        activeView={activeView}
        onSelectView={(view) => {
          setActiveView(view);
          setSidebarOpen(false);
        }}
        onNewAccount={() => setAccountModal({ open: true, account: null })}
        onEditAccount={(account) => setAccountModal({ open: true, account })}
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {activeView === "budget" && budgetData && (
          <>
            {/* Mobile sidebar toggle + Budget header */}
            <div className="flex items-center gap-2 md:hidden px-4 pt-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-overlay transition-colors"
                aria-label="Open navigatie"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              </button>
            </div>

            <BudgetHeader
              month={month}
              readyToAssign={budgetData.readyToAssign}
              filter={budgetFilter}
              filterCounts={filterCounts}
              onMonthChange={setMonth}
              onFilterChange={setBudgetFilter}
            />

            <BudgetTable
              categoryGroups={budgetData.categoryGroups}
              filter={budgetFilter}
              onAssignedChange={handleAssignedChange}
              onAddCategory={(groupId) =>
                setCategoryModal({ open: true, mode: "category", groupId })
              }
              onEditGroup={(group) =>
                setCategoryModal({
                  open: true,
                  mode: "group",
                  editItem: { id: group.id, name: group.name },
                })
              }
              onEditCategory={(category) =>
                setCategoryModal({
                  open: true,
                  mode: "category",
                  groupId: category.groupId,
                  editItem: { id: category.id, name: category.name },
                })
              }
              onDeleteCategory={(id) => handleDeleteCategory(id, "category")}
              onAddCategoryGroup={() =>
                setCategoryModal({ open: true, mode: "group" })
              }
              onSetTarget={handleOpenTarget}
              onMoveMoney={handleOpenMoveMoney}
            />
          </>
        )}

        {activeView !== "budget" && (
          <TransactionList
            transactions={transactions}
            accounts={accounts}
            categoryGroups={budgetData?.categoryGroups.map((cg) => cg.group) || []}
            activeAccountId={
              activeView.startsWith("account:")
                ? activeView.replace("account:", "")
                : undefined
            }
            onSaveTransaction={handleSaveTransaction}
            onUpdateTransaction={handleUpdateTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            onToggleCleared={handleToggleCleared}
            onEditAccount={() => {
              const acc = accounts.find((a) => `account:${a.id}` === activeView);
              if (acc) setAccountModal({ open: true, account: acc });
            }}
            onOpenSidebar={() => setSidebarOpen(true)}
          />
        )}
      </div>

      {/* Modals */}
      <AccountModal
        open={accountModal.open}
        account={accountModal.account}
        onClose={() => setAccountModal({ open: false })}
        onSave={handleSaveAccount}
        onDelete={handleDeleteAccount}
      />

      <CategoryModal
        open={categoryModal.open}
        mode={categoryModal.mode}
        groupId={categoryModal.groupId}
        editItem={categoryModal.editItem}
        categoryGroups={budgetData?.categoryGroups.map((cg) => cg.group)}
        onClose={() => setCategoryModal({ open: false, mode: "group" })}
        onSave={handleSaveCategory}
        onDelete={handleDeleteCategory}
      />

      {/* Move Money popover */}
      {moveMoneyState && (
        <MoveMoneyPopover
          anchorRect={moveMoneyState.anchorRect}
          sourceCategoryId={moveMoneyState.categoryId}
          sourceCategoryName={moveMoneyState.categoryName}
          sourceAvailable={moveMoneyState.available}
          sourceCurrentAssigned={moveMoneyState.assigned}
          allCategories={allCategoriesFlat.filter((c) => c.id !== moveMoneyState.categoryId)}
          onMove={handleMoveMoney}
          onClose={() => setMoveMoneyState(null)}
        />
      )}

      <CategoryTargetModal
        open={targetModal.open}
        categoryId={targetModal.categoryId}
        categoryName={targetModal.categoryName}
        budget={
          budgetData
            ? budgetData.categoryGroups
                .flatMap((cg) => cg.budgets)
                .find((b) => b.categoryId === targetModal.categoryId) || null
            : null
        }
        onClose={() => setTargetModal({ open: false, categoryId: "", categoryName: "" })}
        onSave={handleSaveTarget}
        onDelete={handleDeleteTarget}
      />
    </div>
  );
}
