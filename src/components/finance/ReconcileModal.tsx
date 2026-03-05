"use client";

import { useState, useEffect } from "react";
import { FinanceAccount, formatCurrency, euroToCents, centsToEuro } from "@/lib/types/finance";

interface ReconcileModalProps {
  open: boolean;
  account: FinanceAccount;
  currentBalance: number; // in centen — som van alle transacties voor dit account
  onClose: () => void;
  onReconcile: (adjustmentAmount?: number) => Promise<void>;
}

type Step = "confirm" | "enter" | "adjust";

export default function ReconcileModal({
  open,
  account,
  currentBalance,
  onClose,
  onReconcile,
}: ReconcileModalProps) {
  const [step, setStep] = useState<Step>("confirm");
  const [bankBalance, setBankBalance] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setStep("confirm");
      setBankBalance("");
      setSaving(false);
    }
  }, [open]);

  const enteredCents = euroToCents(bankBalance || "0");
  const difference = enteredCents - currentBalance;

  const handleReconcile = async (adjustmentAmount?: number) => {
    setSaving(true);
    try {
      await onReconcile(adjustmentAmount);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 animate-backdrop" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm pointer-events-auto animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div>
              <h2 className="text-base font-bold text-foreground">Reconcile</h2>
              <p className="text-xs text-muted-foreground">{account.name}</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="p-6">
            {/* Stap 1: Bevestig saldo */}
            {step === "confirm" && (
              <div className="space-y-5">
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">Huidig saldo</p>
                  <p className={`text-3xl font-bold tabular-nums ${currentBalance >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {formatCurrency(currentBalance)}
                  </p>
                </div>
                <p className="text-sm text-center text-muted-foreground">
                  Klopt dit overeen met je banksaldo?
                </p>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleReconcile(undefined)}
                    disabled={saving}
                    className="w-full px-4 py-2.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-400 transition-colors disabled:opacity-50"
                  >
                    {saving ? "Bezig..." : "Ja, klopt"}
                  </button>
                  <button
                    onClick={() => setStep("enter")}
                    className="w-full px-4 py-2.5 border border-border text-muted-foreground rounded-lg text-sm hover:text-foreground hover:bg-surface-hover transition-colors"
                  >
                    Nee, afwijkend
                  </button>
                </div>
              </div>
            )}

            {/* Stap 2: Voer banksaldo in */}
            {step === "enter" && (
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Voer je banksaldo in
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">€</span>
                    <input
                      type="text"
                      value={bankBalance}
                      onChange={(e) => setBankBalance(e.target.value)}
                      placeholder="0,00"
                      autoFocus
                      className="w-full pl-8 pr-3 py-2 bg-surface border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-accent transition-colors tabular-nums"
                    />
                  </div>
                </div>

                <div className="bg-surface rounded-lg p-3 space-y-1.5 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Huidig saldo</span>
                    <span className="tabular-nums">{formatCurrency(currentBalance)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Banksaldo</span>
                    <span className="tabular-nums">{bankBalance ? formatCurrency(enteredCents) : "—"}</span>
                  </div>
                  <div className="border-t border-border pt-1.5 flex justify-between font-medium">
                    <span className="text-foreground">Verschil</span>
                    <span className={`tabular-nums ${difference === 0 ? "text-green-500" : difference > 0 ? "text-blue-400" : "text-red-400"}`}>
                      {bankBalance ? (difference === 0 ? "€0,00 ✓" : (difference > 0 ? "+" : "") + formatCurrency(difference)) : "—"}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setStep("confirm")}
                    className="flex-1 px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    ← Terug
                  </button>
                  <button
                    onClick={() => {
                      if (difference === 0) {
                        handleReconcile(undefined);
                      } else {
                        setStep("adjust");
                      }
                    }}
                    disabled={!bankBalance}
                    className="flex-1 px-4 py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
                  >
                    Volgende →
                  </button>
                </div>
              </div>
            )}

            {/* Stap 3: Aanpassingstransactie */}
            {step === "adjust" && (
              <div className="space-y-5">
                <div className="text-center space-y-1">
                  <p className="text-sm text-muted-foreground">Verschil gevonden</p>
                  <p className={`text-2xl font-bold tabular-nums ${difference > 0 ? "text-blue-400" : "text-red-400"}`}>
                    {(difference > 0 ? "+" : "") + formatCurrency(difference)}
                  </p>
                </div>

                <p className="text-sm text-center text-muted-foreground">
                  Wil je automatisch een aanpassingstransactie van{" "}
                  <span className="font-medium text-foreground">{formatCurrency(Math.abs(difference))}</span>{" "}
                  aanmaken?
                </p>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleReconcile(difference)}
                    disabled={saving}
                    className="w-full px-4 py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
                  >
                    {saving ? "Bezig..." : "Ja, aanmaken"}
                  </button>
                  <button
                    onClick={() => handleReconcile(undefined)}
                    disabled={saving}
                    className="w-full px-4 py-2.5 border border-border text-muted-foreground rounded-lg text-sm hover:text-foreground hover:bg-surface-hover transition-colors disabled:opacity-50"
                  >
                    Nee, toch afsluiten
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
