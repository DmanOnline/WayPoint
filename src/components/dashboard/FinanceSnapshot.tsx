"use client";

import Link from "next/link";
import type { DashboardData } from "./DashboardShell";

interface Props {
  finance: DashboardData["finance"] | null;
  loading: boolean;
}

function formatEuro(cents: number): string {
  const abs = Math.abs(cents);
  const euros = Math.floor(abs / 100);
  const rest = abs % 100;
  const sign = cents < 0 ? "-" : "";
  return `${sign}\u20AC${euros.toLocaleString("nl-NL")},${String(rest).padStart(2, "0")}`;
}

export default function FinanceSnapshot({ finance, loading }: Props) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 animate-fade-in opacity-0 stagger-5 card-gradient">
        <div className="h-4 w-20 bg-border rounded animate-pulse mb-4" />
        <div className="h-8 w-36 bg-border rounded animate-pulse mb-3" />
        <div className="space-y-2">
          <div className="h-3 w-28 bg-border rounded animate-pulse" />
          <div className="h-3 w-32 bg-border rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!finance) return null;

  const { totalBalance, readyToAssign, budgetHealth } = finance;
  const totalCategories = budgetHealth.onTrack + budgetHealth.underfunded + budgetHealth.overspent;
  const hasFinanceData = totalCategories > 0 || totalBalance !== 0;

  return (
    <div className="rounded-xl border border-border bg-card p-5 animate-fade-in opacity-0 stagger-5 card-gradient">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Finance
        </h3>
        <Link href="/finance" className="text-xs text-accent hover:underline">
          Budget
        </Link>
      </div>

      {!hasFinanceData ? (
        <p className="text-sm text-muted-foreground py-2 text-center">
          Nog geen finance data
        </p>
      ) : (
        <>
          {/* Total balance */}
          <p className="text-2xl font-bold tabular-nums text-foreground mb-1">
            {formatEuro(totalBalance)}
          </p>
          <p className="text-[11px] text-muted-foreground mb-4">Totaal saldo</p>

          {/* Ready to assign */}
          <div className="flex items-center justify-between py-2 border-t border-border">
            <span className="text-xs text-muted-foreground">Te verdelen</span>
            <span className={`text-sm font-medium tabular-nums ${
              readyToAssign >= 0 ? "text-positive" : "text-negative"
            }`}>
              {formatEuro(readyToAssign)}
            </span>
          </div>

          {/* Budget health */}
          {totalCategories > 0 && (
            <div className="flex gap-3 pt-2 border-t border-border mt-2">
              {budgetHealth.onTrack > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-positive" />
                  <span className="text-[10px] text-muted-foreground">{budgetHealth.onTrack}</span>
                </div>
              )}
              {budgetHealth.underfunded > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-warning" />
                  <span className="text-[10px] text-muted-foreground">{budgetHealth.underfunded}</span>
                </div>
              )}
              {budgetHealth.overspent > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-negative" />
                  <span className="text-[10px] text-muted-foreground">{budgetHealth.overspent}</span>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
