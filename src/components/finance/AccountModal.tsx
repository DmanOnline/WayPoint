"use client";

import { useState, useEffect } from "react";
import {
  FinanceAccount,
  AccountType,
  AccountGroup,
  ACCOUNT_TYPES,
  ACCOUNT_GROUPS,
  centsToEuro,
  euroToCents,
} from "@/lib/types/finance";

interface AccountModalProps {
  open: boolean;
  account?: FinanceAccount | null; // null = create mode
  onClose: () => void;
  onSave: (data: {
    name: string;
    type: AccountType;
    group: AccountGroup;
    startBalance: number;
    color: string;
  }) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

const COLORS = [
  "#6366f1", "#8b5cf6", "#a855f7", "#ec4899",
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#14b8a6", "#06b6d4", "#3b82f6", "#6b7280",
];

export default function AccountModal({
  open,
  account,
  onClose,
  onSave,
  onDelete,
}: AccountModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("checking");
  const [group, setGroup] = useState<AccountGroup>("cash");
  const [balance, setBalance] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [saving, setSaving] = useState(false);

  const isEditing = !!account;

  useEffect(() => {
    if (open) {
      if (account) {
        setName(account.name);
        setType(account.type as AccountType);
        setGroup(account.group as AccountGroup);
        setBalance(centsToEuro(account.startBalance));
        setColor(account.color);
      } else {
        setName("");
        setType("checking");
        setGroup("cash");
        setBalance("");
        setColor(COLORS[0]);
      }
    }
  }, [open, account]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        type,
        group,
        startBalance: euroToCents(balance || "0"),
        color,
      });
      onClose();
    } catch (err) {
      console.error("Save account failed:", err);
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
          className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md pointer-events-auto animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="text-lg font-bold text-foreground">
              {isEditing ? "Account bewerken" : "Nieuw account"}
            </h2>
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

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Naam
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="bijv. Betaalrekening"
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-accent transition-colors"
                autoFocus
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as AccountType)}
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-foreground outline-none focus:border-accent transition-colors"
              >
                {ACCOUNT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Group */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Groep
              </label>
              <div className="flex gap-2">
                {ACCOUNT_GROUPS.map((g) => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => setGroup(g.value)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                      group === g.value
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border text-muted-foreground hover:text-foreground hover:bg-surface-hover"
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Start balance */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Huidig saldo
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  &euro;
                </span>
                <input
                  type="text"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                  placeholder="0,00"
                  className="w-full pl-8 pr-3 py-2 bg-surface border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-accent transition-colors tabular-nums"
                />
              </div>
            </div>

            {/* Color */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Kleur
              </label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-7 h-7 rounded-full transition-all ${
                      color === c ? "ring-2 ring-accent ring-offset-2 ring-offset-card scale-110" : "hover:scale-110"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <div>
                {isEditing && onDelete && (
                  <button
                    type="button"
                    onClick={() => onDelete(account!.id)}
                    className="text-sm text-red-400 hover:text-red-300 transition-colors"
                  >
                    Verwijderen
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
                  disabled={!name.trim() || saving}
                  className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
                >
                  {saving ? "Opslaan..." : isEditing ? "Opslaan" : "Toevoegen"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
