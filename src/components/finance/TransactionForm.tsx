"use client";

import { useState, useRef, useEffect } from "react";
import { FinanceAccount, FinanceCategoryGroup, euroToCents } from "@/lib/types/finance";
import SmartDateInput from "@/components/ui/SmartDateInput";

interface TransactionFormProps {
  accounts: FinanceAccount[];
  categoryGroups: FinanceCategoryGroup[];
  defaultAccountId?: string;
  onSave: (data: {
    accountId: string;
    categoryId: string | null;
    date: string;
    payee: string;
    memo: string;
    amount: number; // centen, al met juist teken
    isCleared: boolean;
  }) => Promise<void>;
  onCancel?: () => void;
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function TransactionForm({
  accounts,
  categoryGroups,
  defaultAccountId,
  onSave,
  onCancel,
}: TransactionFormProps) {
  const [date, setDate] = useState(todayStr());
  const [payee, setPayee] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [memo, setMemo] = useState("");
  const [amount, setAmount] = useState("");
  const [isInflow, setIsInflow] = useState(false);
  const [accountId, setAccountId] = useState(defaultAccountId || "");
  const [saving, setSaving] = useState(false);

  const payeeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    payeeRef.current?.focus();
  }, []);

  useEffect(() => {
    if (defaultAccountId) setAccountId(defaultAccountId);
  }, [defaultAccountId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId || !amount) return;

    const cents = euroToCents(amount);
    if (cents === 0) return;

    setSaving(true);
    try {
      await onSave({
        accountId,
        categoryId: categoryId || null,
        date,
        payee: payee.trim(),
        memo: memo.trim(),
        amount: isInflow ? cents : -cents,
        isCleared: false,
      });
      // Reset form
      setPayee("");
      setCategoryId("");
      setMemo("");
      setAmount("");
      setIsInflow(false);
      setDate(todayStr());
      payeeRef.current?.focus();
    } catch (err) {
      console.error("Save transaction failed:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-[100px_1fr_1fr_1fr_120px_80px_auto] gap-2 items-center px-4 md:px-6 py-2.5 bg-surface/50 border-b border-border text-[13px]"
    >
      {/* Date */}
      <SmartDateInput
        value={date}
        onChange={setDate}
        placeholder="Datum"
        className="px-2 py-1.5 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:border-accent transition-colors tabular-nums"
      />

      {/* Payee */}
      <input
        ref={payeeRef}
        type="text"
        value={payee}
        onChange={(e) => setPayee(e.target.value)}
        placeholder="Begunstigde"
        className="px-2 py-1.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-accent transition-colors"
      />

      {/* Category */}
      <select
        value={categoryId}
        onChange={(e) => setCategoryId(e.target.value)}
        className="px-2 py-1.5 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:border-accent transition-colors"
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
        placeholder="Notitie"
        className="px-2 py-1.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-accent transition-colors"
      />

      {/* Amount */}
      <div className="relative">
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          &euro;
        </span>
        <input
          type="text"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0,00"
          className={`w-full pl-6 pr-2 py-1.5 bg-background border rounded-lg text-sm text-right outline-none focus:border-accent transition-colors tabular-nums ${
            isInflow ? "border-green-500/50 text-green-500" : "border-border text-foreground"
          }`}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit(e);
          }}
        />
      </div>

      {/* Inflow/outflow toggle */}
      <button
        type="button"
        onClick={() => setIsInflow(!isInflow)}
        className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all border ${
          isInflow
            ? "border-green-500/50 bg-green-500/10 text-green-500"
            : "border-red-400/50 bg-red-500/10 text-red-400"
        }`}
      >
        {isInflow ? "Inflow" : "Outflow"}
      </button>

      {/* Submit */}
      <button
        type="submit"
        disabled={!amount || !accountId || saving}
        className="px-3 py-1.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
      >
        {saving ? "..." : "+"}
      </button>
    </form>
  );
}

/** Compact version for mobile / narrow screens */
export function TransactionFormCompact({
  accounts,
  categoryGroups,
  defaultAccountId,
  onSave,
}: TransactionFormProps) {
  const [date, setDate] = useState(todayStr());
  const [payee, setPayee] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [memo, setMemo] = useState("");
  const [amount, setAmount] = useState("");
  const [isInflow, setIsInflow] = useState(false);
  const [accountId, setAccountId] = useState(defaultAccountId || "");
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (defaultAccountId) setAccountId(defaultAccountId);
  }, [defaultAccountId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId || !amount) return;

    const cents = euroToCents(amount);
    if (cents === 0) return;

    setSaving(true);
    try {
      await onSave({
        accountId,
        categoryId: categoryId || null,
        date,
        payee: payee.trim(),
        memo: memo.trim(),
        amount: isInflow ? cents : -cents,
        isCleared: false,
      });
      setPayee("");
      setCategoryId("");
      setMemo("");
      setAmount("");
      setIsInflow(false);
      setDate(todayStr());
      setExpanded(false);
    } catch (err) {
      console.error("Save transaction failed:", err);
    } finally {
      setSaving(false);
    }
  };

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground hover:text-accent transition-colors border-b border-border"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Transactie toevoegen
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="px-4 py-3 bg-surface/80 border-b border-border space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <SmartDateInput
          value={date}
          onChange={setDate}
          placeholder="Datum"
          className="px-2 py-1.5 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:border-accent transition-colors tabular-nums"
        />
        <input
          type="text"
          value={payee}
          onChange={(e) => setPayee(e.target.value)}
          placeholder="Begunstigde"
          className="px-2 py-1.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-accent transition-colors"
          autoFocus
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="px-2 py-1.5 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:border-accent transition-colors"
        >
          <option value="">Geen categorie</option>
          {categoryGroups.map((group) => (
            <optgroup key={group.id} label={group.name}>
              {group.categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
        {!defaultAccountId && (
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="px-2 py-1.5 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:border-accent transition-colors"
          >
            <option value="">Account...</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        )}
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">&euro;</span>
          <input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0,00"
            className={`w-full pl-6 pr-2 py-1.5 bg-background border rounded-lg text-sm text-right outline-none focus:border-accent transition-colors tabular-nums ${
              isInflow ? "border-green-500/50 text-green-500" : "border-border text-foreground"
            }`}
          />
        </div>
        <button
          type="button"
          onClick={() => setIsInflow(!isInflow)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
            isInflow ? "border-green-500/50 bg-green-500/10 text-green-500" : "border-red-400/50 bg-red-500/10 text-red-400"
          }`}
        >
          {isInflow ? "In" : "Uit"}
        </button>
        <button
          type="submit"
          disabled={!amount || !accountId || saving}
          className="px-4 py-1.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
        >
          {saving ? "..." : "Toevoegen"}
        </button>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="px-2 py-1.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </form>
  );
}
