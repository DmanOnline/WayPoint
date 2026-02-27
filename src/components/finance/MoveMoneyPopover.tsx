"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { centsToEuro, euroToCents, formatCurrency } from "@/lib/types/finance";

interface MoveMoneyPopoverProps {
  anchorRect: DOMRect | null;
  sourceCategoryId: string;
  sourceCategoryName: string;
  sourceAvailable: number; // centen, positief of negatief
  sourceCurrentAssigned: number; // centen
  allCategories: {
    id: string;
    name: string;
    groupName: string;
    available: number;
  }[];
  onMove: (
    sourceCategoryId: string,
    destCategoryId: string,
    amount: number // centen, altijd positief
  ) => void;
  onClose: () => void;
}

export default function MoveMoneyPopover({
  anchorRect,
  sourceCategoryId,
  sourceCategoryName,
  sourceAvailable,
  sourceCurrentAssigned,
  allCategories,
  onMove,
  onClose,
}: MoveMoneyPopoverProps) {
  const isOverspent = sourceAvailable < 0;
  const defaultAmount = centsToEuro(Math.abs(sourceAvailable));

  const [amount, setAmount] = useState(defaultAmount);
  const [destCategoryId, setDestCategoryId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [saving, setSaving] = useState(false);

  const amountRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Auto-focus en selecteer bedrag
  useEffect(() => {
    setTimeout(() => amountRef.current?.select(), 50);
  }, []);

  // Sluit bij Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Sluit bij scroll
  useEffect(() => {
    const handleScroll = () => onClose();
    const scrollContainer = popoverRef.current?.closest(".overflow-y-auto");
    scrollContainer?.addEventListener("scroll", handleScroll);
    return () => scrollContainer?.removeEventListener("scroll", handleScroll);
  }, [onClose]);

  // Filter categorieën
  const filteredCategories = useMemo(() => {
    const cats = allCategories.filter((c) => c.id !== sourceCategoryId);
    if (!searchQuery) return cats;
    const q = searchQuery.toLowerCase();
    return cats.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.groupName.toLowerCase().includes(q)
    );
  }, [allCategories, sourceCategoryId, searchQuery]);

  // Groepeer per groep
  const grouped = useMemo(() => {
    const map = new Map<string, typeof filteredCategories>();
    for (const cat of filteredCategories) {
      const list = map.get(cat.groupName) || [];
      list.push(cat);
      map.set(cat.groupName, list);
    }
    return Array.from(map.entries());
  }, [filteredCategories]);

  const handleSubmit = async () => {
    if (!destCategoryId || saving) return;
    const cents = euroToCents(amount || "0");
    if (cents <= 0) return;

    setSaving(true);
    onMove(sourceCategoryId, destCategoryId, cents);
  };

  // Positionering
  const popoverStyle = useMemo(() => {
    if (!anchorRect) return { position: "fixed" as const, top: 100, right: 40 };
    const top = anchorRect.bottom + 8;
    const right = Math.max(16, window.innerWidth - anchorRect.right);

    // Als de popover onder het scherm valt, flip boven de pill
    const flipAbove = top + 360 > window.innerHeight;

    return {
      position: "fixed" as const,
      top: flipAbove ? anchorRect.top - 360 - 8 : top,
      right,
      zIndex: 50,
    };
  }, [anchorRect]);

  const selectedCat = allCategories.find((c) => c.id === destCategoryId);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Popover */}
      <div
        ref={popoverRef}
        style={popoverStyle}
        className="w-80 bg-card border border-border rounded-2xl shadow-xl animate-scale-in overflow-hidden"
      >
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-border">
          <div className="flex items-center justify-between mb-0.5">
            <h3 className="text-sm font-bold text-foreground">
              {isOverspent ? "Overschrijding dekken" : "Geld verplaatsen"}
            </h3>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            {isOverspent ? (
              <>
                <span className="text-red-500 font-semibold">{formatCurrency(Math.abs(sourceAvailable))}</span>
                {" "}overspent op{" "}
                <span className="font-medium text-foreground">{sourceCategoryName}</span>
              </>
            ) : (
              <>
                <span className="text-green-600 dark:text-green-400 font-semibold">{formatCurrency(sourceAvailable)}</span>
                {" "}beschikbaar in{" "}
                <span className="font-medium text-foreground">{sourceCategoryName}</span>
              </>
            )}
          </p>
        </div>

        {/* Amount input */}
        <div className="px-4 pt-3 pb-2">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Bedrag
          </label>
          <div className="relative mt-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              &euro;
            </span>
            <input
              ref={amountRef}
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
              }}
              placeholder="0,00"
              className="w-full pl-8 pr-3 py-2 bg-surface border border-border rounded-lg text-sm text-right text-foreground outline-none focus:border-accent transition-colors tabular-nums font-semibold"
            />
          </div>
        </div>

        {/* Category picker */}
        <div className="px-4 pt-1 pb-2">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            {isOverspent ? "Dekken vanuit" : "Verplaatsen naar"}
          </label>

          {/* Search */}
          <div className="relative mt-1 mb-1.5">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Zoek categorie..."
              className="w-full pl-8 pr-3 py-1.5 bg-surface border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-accent transition-colors"
            />
          </div>

          {/* Category list */}
          <div className="max-h-48 overflow-y-auto rounded-lg border border-border bg-surface">
            {grouped.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-muted-foreground/50">
                Geen categorieën gevonden.
              </div>
            ) : (
              grouped.map(([groupName, cats]) => (
                <div key={groupName}>
                  <div className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-background/50 sticky top-0">
                    {groupName}
                  </div>
                  {cats.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setDestCategoryId(cat.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors ${
                        destCategoryId === cat.id
                          ? "bg-accent/10 text-accent"
                          : "text-foreground hover:bg-surface-hover"
                      }`}
                    >
                      <span className="text-[13px] truncate">{cat.name}</span>
                      <span
                        className={`text-[11px] tabular-nums shrink-0 ml-2 ${
                          cat.available < 0
                            ? "text-red-500"
                            : cat.available > 0
                            ? "text-green-600 dark:text-green-400"
                            : "text-muted-foreground/40"
                        }`}
                      >
                        {formatCurrency(cat.available)}
                      </span>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="px-4 pt-1 pb-4 flex items-center gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
          >
            Annuleren
          </button>
          <button
            onClick={handleSubmit}
            disabled={!destCategoryId || saving || !amount}
            className="flex-1 px-3 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? "..." : isOverspent ? "Dekken" : "Verplaats"}
            {selectedCat && !saving && (
              <span className="ml-1 opacity-80">
                &euro;{amount || "0"}
              </span>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
