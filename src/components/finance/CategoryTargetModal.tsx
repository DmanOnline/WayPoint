"use client";

import { useState, useEffect } from "react";
import {
  TargetType,
  TargetRefillType,
  TARGET_TYPES,
  TARGET_REFILL_TYPES,
  CategoryBudgetData,
  centsToEuro,
  euroToCents,
  formatCurrency,
} from "@/lib/types/finance";

interface CategoryTargetModalProps {
  open: boolean;
  categoryName: string;
  categoryId: string;
  budget: CategoryBudgetData | null;
  onClose: () => void;
  onSave: (data: {
    categoryId: string;
    type: TargetType;
    amount: number; // centen
    dayOfMonth: number | null;
    refillType: TargetRefillType;
  }) => Promise<void>;
  onDelete: (categoryId: string) => Promise<void>;
}

export default function CategoryTargetModal({
  open,
  categoryName,
  categoryId,
  budget,
  onClose,
  onSave,
  onDelete,
}: CategoryTargetModalProps) {
  const [type, setType] = useState<TargetType>("monthly");
  const [amountStr, setAmountStr] = useState("");
  const [dayOfMonth, setDayOfMonth] = useState<number | null>(null);
  const [refillType, setRefillType] = useState<TargetRefillType>("refill");
  const [saving, setSaving] = useState(false);

  const hasExistingTarget = !!budget?.target;

  useEffect(() => {
    if (open && budget?.target) {
      setType(budget.target.type);
      setAmountStr(centsToEuro(budget.target.amount));
      setDayOfMonth(budget.target.dayOfMonth);
      setRefillType(budget.target.refillType);
    } else if (open) {
      setType("monthly");
      setAmountStr("");
      setDayOfMonth(null);
      setRefillType("refill");
    }
  }, [open, budget?.target]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = euroToCents(amountStr || "0");
    if (amount <= 0) return;

    setSaving(true);
    try {
      await onSave({
        categoryId,
        type,
        amount,
        dayOfMonth,
        refillType,
      });
      onClose();
    } catch (err) {
      console.error("Save target failed:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await onDelete(categoryId);
      onClose();
    } catch (err) {
      console.error("Delete target failed:", err);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const amountCents = euroToCents(amountStr || "0");
  const available = budget?.available || 0;
  const progress = amountCents > 0 ? Math.min(1, Math.max(0, available / amountCents)) : 0;
  const needed = Math.max(0, amountCents - available);

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 animate-backdrop" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md pointer-events-auto animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div>
              <h2 className="text-lg font-bold text-foreground">
                {hasExistingTarget ? "Doel bewerken" : "Doel instellen"}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">{categoryName}</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Target type tabs */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2">
                Hoe vaak?
              </label>
              <div className="flex gap-1 p-1 bg-surface rounded-lg">
                {TARGET_TYPES.map((tt) => (
                  <button
                    key={tt.value}
                    type="button"
                    onClick={() => setType(tt.value)}
                    className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      type === tt.value
                        ? "bg-accent text-white shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Ik heb nodig
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  &euro;
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  placeholder="0,00"
                  className="w-full pl-8 pr-3 py-2.5 bg-surface border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-accent transition-colors tabular-nums"
                  autoFocus
                />
              </div>
            </div>

            {/* Day of month (for monthly) */}
            {type === "monthly" && (
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Tegen de
                </label>
                <select
                  value={dayOfMonth ?? ""}
                  onChange={(e) => setDayOfMonth(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-2.5 bg-surface border border-border rounded-lg text-sm text-foreground outline-none focus:border-accent transition-colors"
                >
                  <option value="">Einde van de maand</option>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>
                      {d}e van de maand
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Refill type */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2">
                Volgende maand wil ik
              </label>
              <div className="space-y-2">
                {TARGET_REFILL_TYPES.map((rt) => (
                  <label
                    key={rt.value}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      refillType === rt.value
                        ? "border-accent bg-accent/5"
                        : "border-border hover:border-border/80"
                    }`}
                  >
                    <input
                      type="radio"
                      name="refillType"
                      value={rt.value}
                      checked={refillType === rt.value}
                      onChange={() => setRefillType(rt.value)}
                      className="mt-0.5 accent-accent"
                    />
                    <div>
                      <div className="text-sm font-medium text-foreground">{rt.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{rt.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Preview — progress bar */}
            {amountCents > 0 && (
              <div className="p-4 bg-surface rounded-lg border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Voortgang</span>
                  <span className="text-xs font-medium text-foreground">
                    {formatCurrency(available)} / {formatCurrency(amountCents)}
                  </span>
                </div>
                <div className="h-2 bg-border rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      progress >= 1
                        ? "bg-green-500"
                        : progress > 0
                        ? "bg-accent"
                        : "bg-border"
                    }`}
                    style={{ width: `${Math.round(progress * 100)}%` }}
                  />
                </div>
                {needed > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Nog {formatCurrency(needed)} nodig
                  </p>
                )}
                {needed === 0 && amountCents > 0 && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-2 font-medium">
                    Doel bereikt!
                  </p>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-1">
              <div>
                {hasExistingTarget && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={saving}
                    className="text-sm text-red-400 hover:text-red-300 transition-colors"
                  >
                    Doel verwijderen
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  disabled={amountCents <= 0 || saving}
                  className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
                >
                  {saving ? "Opslaan..." : "Opslaan"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
