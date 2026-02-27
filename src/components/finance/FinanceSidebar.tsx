"use client";

import { FinanceAccount, AccountGroup, formatCurrency } from "@/lib/types/finance";

interface FinanceSidebarProps {
  accounts: FinanceAccount[];
  activeView: string;
  onSelectView: (view: string) => void;
  onNewAccount: () => void;
  onEditAccount: (account: FinanceAccount) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const GROUP_CONFIG: Record<AccountGroup, { label: string }> = {
  cash: { label: "CASH" },
  loans: { label: "LENINGEN" },
  tracking: { label: "TRACKING" },
};

const GROUP_ORDER: AccountGroup[] = ["cash", "loans", "tracking"];

export default function FinanceSidebar({
  accounts,
  activeView,
  onSelectView,
  onNewAccount,
  onEditAccount,
  mobileOpen = false,
  onMobileClose,
}: FinanceSidebarProps) {
  const grouped = GROUP_ORDER.map((group) => ({
    group,
    config: GROUP_CONFIG[group],
    accounts: accounts.filter((a) => a.group === group),
    total: accounts
      .filter((a) => a.group === group)
      .reduce((sum, a) => sum + (a.balance ?? 0), 0),
  })).filter((g) => g.accounts.length > 0);

  const handleSelect = (view: string) => {
    onSelectView(view);
    onMobileClose?.();
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden animate-backdrop"
          onClick={onMobileClose}
        />
      )}

      <div
        className={`w-60 shrink-0 flex-col h-full bg-[#1B2559] text-white select-none ${
          mobileOpen ? "flex fixed inset-y-0 left-0 z-50" : "hidden"
        } md:flex md:relative`}
      >
        {/* Navigation */}
        <div className="px-2.5 pt-4 pb-1 space-y-0.5">
          <button
            onClick={() => handleSelect("budget")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
              activeView === "budget"
                ? "bg-[#2D3A7A] text-white"
                : "text-[#B8BFE0] hover:bg-[#232E65] hover:text-white"
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="9" y1="3" x2="9" y2="21" />
            </svg>
            Budget
          </button>

          <button
            onClick={() => handleSelect("all-accounts")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
              activeView === "all-accounts"
                ? "bg-[#2D3A7A] text-white"
                : "text-[#B8BFE0] hover:bg-[#232E65] hover:text-white"
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            Alle transacties
          </button>
        </div>

        <div className="mx-3 my-2 border-t border-[#2A3164]" />

        {/* Account groups */}
        <div className="px-2.5 flex-1 overflow-y-auto space-y-3">
          {grouped.map(({ group, config, accounts: groupAccounts, total }) => (
            <div key={group}>
              <div className="flex items-center justify-between px-2 py-1">
                <span className="text-[10px] font-bold text-[#7B85B3] tracking-[0.12em]">
                  {config.label}
                </span>
                <span
                  className={`text-[11px] font-medium tabular-nums ${
                    total < 0 ? "text-red-400" : "text-[#7B85B3]"
                  }`}
                >
                  {formatCurrency(total)}
                </span>
              </div>

              <div className="space-y-px">
                {groupAccounts.map((account) => {
                  const isActive = activeView === `account:${account.id}`;
                  const balance = account.balance ?? 0;
                  return (
                    <div key={account.id} className="relative group">
                      <button
                        onClick={() => handleSelect(`account:${account.id}`)}
                        className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[13px] transition-all ${
                          isActive
                            ? "bg-[#2D3A7A] text-white"
                            : "text-[#B8BFE0] hover:bg-[#232E65] hover:text-white"
                        }`}
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: account.color }}
                        />
                        <span className="flex-1 text-left truncate">{account.name}</span>
                        <span
                          className={`text-[11px] tabular-nums ${
                            balance < 0 ? "text-red-400" : "text-[#7B85B3]"
                          }`}
                        >
                          {formatCurrency(balance)}
                        </span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditAccount(account);
                        }}
                        className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-[#3D4A8A] transition-all"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-[#7B85B3]">
                          <circle cx="12" cy="5" r="2" />
                          <circle cx="12" cy="12" r="2" />
                          <circle cx="12" cy="19" r="2" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="px-2.5 py-3 border-t border-[#2A3164]">
          <button
            onClick={onNewAccount}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-[#7B85B3] hover:text-white hover:bg-[#232E65] transition-all"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Account toevoegen
          </button>
        </div>
      </div>
    </>
  );
}
