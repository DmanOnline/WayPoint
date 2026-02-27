"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  FinanceTransaction,
  FinanceAccount,
  FinanceCategoryGroup,
  formatCurrency,
  centsToEuro,
  euroToCents,
  ACCOUNT_TYPES,
} from "@/lib/types/finance";
import SmartDateInput from "@/components/ui/SmartDateInput";

interface TransactionListProps {
  transactions: FinanceTransaction[];
  accounts: FinanceAccount[];
  categoryGroups: FinanceCategoryGroup[];
  activeAccountId?: string;
  onSaveTransaction: (data: {
    accountId: string;
    categoryId: string | null;
    date: string;
    payee: string;
    memo: string;
    amount: number;
    isCleared: boolean;
  }) => Promise<void>;
  onUpdateTransaction: (
    id: string,
    data: {
      categoryId?: string | null;
      date?: string;
      payee?: string;
      memo?: string;
      amount?: number;
    }
  ) => Promise<void>;
  onDeleteTransaction: (id: string) => Promise<void>;
  onToggleCleared: (id: string, isCleared: boolean) => Promise<void>;
  onEditAccount?: () => void;
  onOpenSidebar?: () => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toDateInputValue(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const GRID_COLS_ACCOUNT = "32px 28px 88px 1fr 1fr 1fr 100px 100px 36px";
const GRID_COLS_ALL = "32px 28px 88px minmax(60px, 0.8fr) 1fr 1fr 1fr 100px 100px 36px";

export default function TransactionList({
  transactions,
  accounts,
  categoryGroups,
  activeAccountId,
  onSaveTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
  onToggleCleared,
  onEditAccount,
  onOpenSidebar,
}: TransactionListProps) {
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const activeAccount = activeAccountId
    ? accounts.find((a) => a.id === activeAccountId)
    : null;
  const isAllAccounts = !activeAccountId;

  const gridStyle = {
    gridTemplateColumns: isAllAccounts ? GRID_COLS_ALL : GRID_COLS_ACCOUNT,
  };

  // Filter
  const filtered = useMemo(() => {
    if (!search) return transactions;
    const q = search.toLowerCase();
    return transactions.filter(
      (t) =>
        t.payee?.toLowerCase().includes(q) ||
        t.memo?.toLowerCase().includes(q) ||
        t.category?.name?.toLowerCase().includes(q) ||
        t.account?.name?.toLowerCase().includes(q)
    );
  }, [transactions, search]);

  // Balance for account view
  const balance = activeAccount?.balance ?? 0;

  const handleSelectAll = () => {
    if (selectedIds.size === filtered.length && filtered.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((t) => t.id)));
    }
  };

  const handleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const accountTypeLabel = (type: string) =>
    ACCOUNT_TYPES.find((t) => t.value === type)?.label || type;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* ═══ Account Header ═══ */}
      {activeAccount && (
        <>
          {/* Account info bar */}
          <div className="flex items-center gap-3 px-4 md:px-6 py-3 bg-surface border-b border-border">
            <button
              onClick={onOpenSidebar}
              className="md:hidden p-1.5 -ml-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-overlay transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>

            {/* Star */}
            <button className="text-muted-foreground/30 hover:text-yellow-400 transition-colors shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </button>

            {/* Account name */}
            <h1 className="text-lg font-bold text-foreground">{activeAccount.name}</h1>

            {/* Account type badge */}
            <span className="px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground bg-muted/30 rounded">
              {accountTypeLabel(activeAccount.type)}
            </span>

            <div className="flex-1" />

            {/* Edit button */}
            {onEditAccount && (
              <button
                onClick={onEditAccount}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-overlay transition-colors"
                title="Account bewerken"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                </svg>
              </button>
            )}
          </div>

          {/* Balance bar */}
          <div className="flex items-center gap-2 px-4 md:px-6 py-2.5 bg-background border-b border-border text-[13px]">
            <span className="text-muted-foreground text-xs font-medium">Balance</span>
            <span
              className={`font-bold tabular-nums ${
                balance >= 0
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-500"
              }`}
            >
              {formatCurrency(balance)}
            </span>
          </div>
        </>
      )}

      {/* All Accounts Header */}
      {isAllAccounts && (
        <div className="flex items-center gap-3 px-4 md:px-6 py-3 bg-surface border-b border-border">
          <button
            onClick={onOpenSidebar}
            className="md:hidden p-1.5 -ml-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-overlay transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-foreground">Alle transacties</h1>
        </div>
      )}

      {/* ═══ Action Bar ═══ */}
      <div className="flex items-center gap-2 px-4 md:px-6 py-2 border-b border-border bg-background">
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium transition-all ${
            showAddForm
              ? "bg-accent text-white"
              : "bg-accent/10 text-accent hover:bg-accent/20"
          }`}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Transaction
        </button>

        <div className="flex-1" />

        {/* Search */}
        <div className="flex items-center gap-2">
          {showSearch && (
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Zoeken..."
              className="w-48 px-3 py-1.5 bg-surface border border-border rounded-md text-[13px] text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-accent transition-colors"
              autoFocus
            />
          )}
          <button
            onClick={() => {
              setShowSearch(!showSearch);
              if (showSearch) setSearch("");
            }}
            className={`p-1.5 rounded-md transition-colors ${
              showSearch
                ? "text-accent bg-accent/10"
                : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
            }`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
        </div>
      </div>

      {/* ═══ Column Headers ═══ */}
      <div
        className="grid items-center px-4 md:px-6 py-2 border-b border-border text-[10px] font-bold text-muted-foreground uppercase tracking-[0.08em] bg-background"
        style={gridStyle}
      >
        {/* Select all */}
        <div className="flex justify-center">
          <button
            onClick={handleSelectAll}
            className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
              selectedIds.size === filtered.length && filtered.length > 0
                ? "border-accent bg-accent"
                : "border-muted-foreground/30 hover:border-accent/50"
            }`}
          >
            {selectedIds.size === filtered.length && filtered.length > 0 && (
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>
        </div>

        {/* Flag */}
        <div className="flex justify-center">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
            <line x1="4" y1="22" x2="4" y2="15" />
          </svg>
        </div>

        {/* Date */}
        <div className="flex items-center gap-1">
          Date
          <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" className="opacity-40">
            <path d="M7 10l5 5 5-5z" />
          </svg>
        </div>

        {/* Account (only all-accounts) */}
        {isAllAccounts && <div>Account</div>}

        <div>Payee</div>
        <div>Category</div>
        <div>Memo</div>
        <div className="text-right pr-2">Outflow</div>
        <div className="text-right pr-2">Inflow</div>

        {/* Cleared icon */}
        <div className="flex justify-center">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-500/50">
            <circle cx="12" cy="12" r="10" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        </div>
      </div>

      {/* ═══ Transaction Rows ═══ */}
      <div className="flex-1 overflow-y-auto">
        {/* Add Transaction Row */}
        {showAddForm && (
          <AddTransactionRow
            accounts={accounts}
            categoryGroups={categoryGroups}
            defaultAccountId={activeAccountId}
            isAllAccounts={isAllAccounts}
            gridStyle={gridStyle}
            onSave={async (data) => {
              await onSaveTransaction(data);
              setShowAddForm(false);
            }}
            onCancel={() => setShowAddForm(false)}
          />
        )}

        {filtered.length === 0 && !showAddForm ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.8"
              className="text-muted-foreground/20 mb-3"
            >
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            <p className="text-muted-foreground text-sm">
              {search ? "Geen resultaten." : "Nog geen transacties."}
            </p>
            <p className="text-muted-foreground/60 text-xs mt-1">
              Klik op &quot;Add Transaction&quot; om te beginnen.
            </p>
          </div>
        ) : (
          filtered.map((tx) =>
            editingId === tx.id ? (
              <InlineEditRow
                key={tx.id}
                tx={tx}
                categoryGroups={categoryGroups}
                isAllAccounts={isAllAccounts}
                gridStyle={gridStyle}
                onSave={async (data) => {
                  await onUpdateTransaction(tx.id, data);
                  setEditingId(null);
                }}
                onCancel={() => setEditingId(null)}
                onDelete={async () => {
                  await onDeleteTransaction(tx.id);
                  setEditingId(null);
                }}
              />
            ) : (
              <div
                key={tx.id}
                className={`relative grid items-center px-4 md:px-6 py-2 border-b border-border/20 hover:bg-surface-hover/40 transition-colors group text-[13px] cursor-pointer ${
                  selectedIds.has(tx.id) ? "bg-accent/5" : ""
                }`}
                style={gridStyle}
                onClick={() => setEditingId(tx.id)}
              >
                {/* Checkbox */}
                <div
                  className="flex justify-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => handleSelectOne(tx.id)}
                    className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                      selectedIds.has(tx.id)
                        ? "border-accent bg-accent"
                        : "border-muted-foreground/20 hover:border-accent/50"
                    }`}
                  >
                    {selectedIds.has(tx.id) && (
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                </div>

                {/* Flag */}
                <div className="flex justify-center">
                  <div className="w-3 h-3 rounded-sm border border-muted-foreground/10 hover:border-muted-foreground/30 transition-colors" />
                </div>

                {/* Date */}
                <span className="text-muted-foreground tabular-nums text-xs">
                  {formatDate(tx.date)}
                </span>

                {/* Account (all-accounts view) */}
                {isAllAccounts && (
                  <span className="text-muted-foreground truncate text-xs">
                    {tx.account?.name || "—"}
                  </span>
                )}

                {/* Payee */}
                <span className="text-foreground truncate pr-2">
                  {tx.payee || (
                    <span className="text-muted-foreground/30">—</span>
                  )}
                </span>

                {/* Category */}
                <span className="text-muted-foreground truncate text-[13px] pr-2">
                  {tx.category ? (
                    <span>
                      <span className="text-muted-foreground/40">
                        {tx.category.group?.name}:{" "}
                      </span>
                      {tx.category.name}
                    </span>
                  ) : tx.amount > 0 ? (
                    <span className="text-green-600/60 dark:text-green-400/60 text-xs font-medium">
                      Ready to Assign
                    </span>
                  ) : (
                    <span className="text-muted-foreground/30">—</span>
                  )}
                </span>

                {/* Memo */}
                <span className="text-muted-foreground/50 truncate text-xs pr-2">
                  {tx.memo || ""}
                </span>

                {/* Outflow */}
                <span className="text-right pr-2 tabular-nums text-foreground">
                  {tx.amount < 0 ? formatCurrency(Math.abs(tx.amount)) : ""}
                </span>

                {/* Inflow */}
                <span className="text-right pr-2 tabular-nums text-green-600 dark:text-green-400">
                  {tx.amount > 0 ? formatCurrency(tx.amount) : ""}
                </span>

                {/* Cleared */}
                <div
                  className="flex justify-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => onToggleCleared(tx.id, !tx.isCleared)}
                    className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center transition-all ${
                      tx.isCleared
                        ? "border-green-500 bg-green-500"
                        : "border-muted-foreground/20 hover:border-green-500/50"
                    }`}
                  >
                    {tx.isCleared && (
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            )
          )
        )}
      </div>
    </div>
  );
}

/** Inline row for adding a new transaction — YNAB style */
function AddTransactionRow({
  accounts,
  categoryGroups,
  defaultAccountId,
  isAllAccounts,
  gridStyle,
  onSave,
  onCancel,
}: {
  accounts: FinanceAccount[];
  categoryGroups: FinanceCategoryGroup[];
  defaultAccountId?: string;
  isAllAccounts: boolean;
  gridStyle: React.CSSProperties;
  onSave: (data: {
    accountId: string;
    categoryId: string | null;
    date: string;
    payee: string;
    memo: string;
    amount: number;
    isCleared: boolean;
  }) => Promise<void>;
  onCancel: () => void;
}) {
  const [date, setDate] = useState(todayStr());
  const [payee, setPayee] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [memo, setMemo] = useState("");
  const [outflow, setOutflow] = useState("");
  const [inflow, setInflow] = useState("");
  const [accountId, setAccountId] = useState(defaultAccountId || "");
  const [saving, setSaving] = useState(false);
  const payeeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    payeeRef.current?.focus();
  }, []);

  const handleSave = async () => {
    if (!accountId) return;
    const outflowCents = outflow ? euroToCents(outflow) : 0;
    const inflowCents = inflow ? euroToCents(inflow) : 0;
    if (outflowCents === 0 && inflowCents === 0) return;

    const amount = inflowCents > 0 ? inflowCents : -outflowCents;

    setSaving(true);
    try {
      await onSave({
        accountId,
        categoryId: categoryId || null,
        date,
        payee: payee.trim(),
        memo: memo.trim(),
        amount,
        isCleared: false,
      });
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onCancel();
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <div
      className="grid items-center gap-1 px-4 md:px-6 py-1.5 border-b border-accent/30 bg-accent/5 text-[13px]"
      style={gridStyle}
    >
      {/* Cancel */}
      <div className="flex justify-center">
        <button
          onClick={onCancel}
          className="w-5 h-5 rounded flex items-center justify-center text-red-400 hover:bg-red-500/10 transition-colors"
          title="Annuleren"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Flag placeholder */}
      <div />

      {/* Date */}
      <SmartDateInput
        value={date}
        onChange={setDate}
        placeholder="Datum"
        className="px-1.5 py-1 bg-background border border-border rounded text-xs text-foreground outline-none focus:border-accent transition-colors tabular-nums w-full"
      />

      {/* Account (only all-accounts view) */}
      {isAllAccounts && (
        <select
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className="px-1.5 py-1 bg-background border border-border rounded text-xs text-foreground outline-none focus:border-accent transition-colors min-w-0"
        >
          <option value="">Account...</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      )}

      {/* Payee */}
      <input
        ref={payeeRef}
        type="text"
        value={payee}
        onChange={(e) => setPayee(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Begunstigde"
        className="px-1.5 py-1 bg-background border border-border rounded text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-accent transition-colors min-w-0"
      />

      {/* Category */}
      <select
        value={categoryId}
        onChange={(e) => setCategoryId(e.target.value)}
        onKeyDown={handleKeyDown}
        className="px-1.5 py-1 bg-background border border-border rounded text-sm text-foreground outline-none focus:border-accent transition-colors min-w-0"
      >
        <option value="">Geen categorie</option>
        {categoryGroups.map((group) => (
          <optgroup key={group.id} label={group.name}>
            {group.categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      {/* Memo */}
      <input
        type="text"
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Notitie"
        className="px-1.5 py-1 bg-background border border-border rounded text-xs text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-accent transition-colors min-w-0"
      />

      {/* Outflow */}
      <div className="relative">
        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/50">
          &euro;
        </span>
        <input
          type="text"
          inputMode="decimal"
          value={outflow}
          onChange={(e) => {
            setOutflow(e.target.value);
            if (e.target.value) setInflow("");
          }}
          onKeyDown={handleKeyDown}
          placeholder="0,00"
          className="w-full pl-5 pr-1.5 py-1 bg-background border border-border rounded text-sm text-right outline-none focus:border-accent transition-colors tabular-nums min-w-0"
        />
      </div>

      {/* Inflow */}
      <div className="relative">
        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/50">
          &euro;
        </span>
        <input
          type="text"
          inputMode="decimal"
          value={inflow}
          onChange={(e) => {
            setInflow(e.target.value);
            if (e.target.value) setOutflow("");
          }}
          onKeyDown={handleKeyDown}
          placeholder="0,00"
          className="w-full pl-5 pr-1.5 py-1 bg-background border border-border rounded text-sm text-right text-green-500 outline-none focus:border-green-500/50 transition-colors tabular-nums min-w-0"
        />
      </div>

      {/* Save */}
      <div className="flex justify-center">
        <button
          onClick={handleSave}
          disabled={saving || (!outflow && !inflow) || !accountId}
          className="w-5 h-5 rounded flex items-center justify-center bg-accent text-white hover:bg-accent/90 transition-colors disabled:opacity-50"
          title="Opslaan"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/** Inline edit row for an existing transaction — YNAB style */
function InlineEditRow({
  tx,
  categoryGroups,
  isAllAccounts,
  gridStyle,
  onSave,
  onCancel,
  onDelete,
}: {
  tx: FinanceTransaction;
  categoryGroups: FinanceCategoryGroup[];
  isAllAccounts: boolean;
  gridStyle: React.CSSProperties;
  onSave: (data: {
    categoryId?: string | null;
    date?: string;
    payee?: string;
    memo?: string;
    amount?: number;
  }) => Promise<void>;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const [date, setDate] = useState(toDateInputValue(tx.date));
  const [payee, setPayee] = useState(tx.payee || "");
  const [categoryId, setCategoryId] = useState(tx.categoryId || "");
  const [memo, setMemo] = useState(tx.memo || "");
  const [outflow, setOutflow] = useState(
    tx.amount < 0 ? centsToEuro(Math.abs(tx.amount)) : ""
  );
  const [inflow, setInflow] = useState(
    tx.amount > 0 ? centsToEuro(tx.amount) : ""
  );
  const [saving, setSaving] = useState(false);
  const payeeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    payeeRef.current?.focus();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const outflowCents = outflow ? euroToCents(outflow) : 0;
      const inflowCents = inflow ? euroToCents(inflow) : 0;
      const amount = inflowCents > 0 ? inflowCents : -outflowCents;

      await onSave({
        date,
        payee: payee.trim(),
        categoryId: categoryId || null,
        memo: memo.trim(),
        amount,
      });
    } catch (err) {
      console.error("Update failed:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onCancel();
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <div
      className="grid items-center gap-1 px-4 md:px-6 py-1.5 border-b border-accent/30 bg-accent/5 text-[13px]"
      style={gridStyle}
    >
      {/* Delete */}
      <div className="flex justify-center">
        <button
          onClick={onDelete}
          className="w-5 h-5 rounded flex items-center justify-center text-red-400 hover:bg-red-500/10 transition-colors"
          title="Verwijderen"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Flag placeholder */}
      <div />

      {/* Date */}
      <SmartDateInput
        value={date}
        onChange={setDate}
        placeholder="Datum"
        className="px-1.5 py-1 bg-background border border-border rounded text-xs text-foreground outline-none focus:border-accent transition-colors tabular-nums w-full"
      />

      {/* Account (read-only in edit mode) */}
      {isAllAccounts && (
        <span className="text-muted-foreground text-xs truncate px-1.5">
          {tx.account?.name || "—"}
        </span>
      )}

      {/* Payee */}
      <input
        ref={payeeRef}
        type="text"
        value={payee}
        onChange={(e) => setPayee(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Begunstigde"
        className="px-1.5 py-1 bg-background border border-border rounded text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-accent transition-colors min-w-0"
      />

      {/* Category */}
      <select
        value={categoryId}
        onChange={(e) => setCategoryId(e.target.value)}
        onKeyDown={handleKeyDown}
        className="px-1.5 py-1 bg-background border border-border rounded text-sm text-foreground outline-none focus:border-accent transition-colors min-w-0"
      >
        <option value="">Geen categorie (income)</option>
        {categoryGroups.map((group) => (
          <optgroup key={group.id} label={group.name}>
            {group.categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      {/* Memo */}
      <input
        type="text"
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Notitie"
        className="px-1.5 py-1 bg-background border border-border rounded text-xs text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-accent transition-colors min-w-0"
      />

      {/* Outflow */}
      <div className="relative">
        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/50">
          &euro;
        </span>
        <input
          type="text"
          inputMode="decimal"
          value={outflow}
          onChange={(e) => {
            setOutflow(e.target.value);
            if (e.target.value) setInflow("");
          }}
          onKeyDown={handleKeyDown}
          placeholder="0,00"
          className="w-full pl-5 pr-1.5 py-1 bg-background border border-border rounded text-sm text-right outline-none focus:border-accent transition-colors tabular-nums min-w-0"
        />
      </div>

      {/* Inflow */}
      <div className="relative">
        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/50">
          &euro;
        </span>
        <input
          type="text"
          inputMode="decimal"
          value={inflow}
          onChange={(e) => {
            setInflow(e.target.value);
            if (e.target.value) setOutflow("");
          }}
          onKeyDown={handleKeyDown}
          placeholder="0,00"
          className="w-full pl-5 pr-1.5 py-1 bg-background border border-border rounded text-sm text-right text-green-500 outline-none focus:border-green-500/50 transition-colors tabular-nums min-w-0"
        />
      </div>

      {/* Save */}
      <div className="flex justify-center">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-5 h-5 rounded flex items-center justify-center bg-accent text-white hover:bg-accent/90 transition-colors disabled:opacity-50"
          title="Opslaan"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
