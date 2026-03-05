import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function subtractMonths(monthKey: string, n: number): string {
  const [y, m] = monthKey.split("-").map(Number);
  const date = new Date(y, m - 1 - n, 1);
  return getMonthKey(date);
}

function getMonthsBetween(from: string, to: string): string[] {
  const months: string[] = [];
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  let y = fy, m = fm;
  while (y < ty || (y === ty && m <= tm)) {
    months.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return months;
}

function getDaysInPeriod(from: string, to: string): number {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  const start = new Date(fy, fm - 1, 1);
  const end = new Date(ty, tm, 0); // last day of "to" month
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  try {
    const params = request.nextUrl.searchParams;

    // Period: either from/to month keys or months count (backwards compat)
    const now = new Date();
    const currentMonth = getMonthKey(now);
    let startMonth: string;
    let endMonth: string;

    const fromParam = params.get("from");
    const toParam = params.get("to");
    if (fromParam && toParam) {
      startMonth = fromParam;
      endMonth = toParam;
    } else {
      const monthCount = Math.min(60, Math.max(1, parseInt(params.get("months") || "6")));
      startMonth = subtractMonths(currentMonth, monthCount - 1);
      endMonth = currentMonth;
    }

    const allMonths = getMonthsBetween(startMonth, endMonth);
    const [startY, startM] = startMonth.split("-").map(Number);
    const [endY, endM] = endMonth.split("-").map(Number);
    const periodStart = new Date(startY, startM - 1, 1);
    const periodEnd = new Date(endY, endM, 1); // first day after period

    // Category filter
    const categoryIdsParam = params.get("categoryIds");
    const filterCategoryIds = categoryIdsParam ? categoryIdsParam.split(",").filter(Boolean) : null;

    // Fetch category groups (for filter UI)
    const categoryGroups = await prisma.financeCategoryGroup.findMany({
      where: { userId: session.userId, isHidden: false },
      include: {
        categories: {
          where: { isHidden: false },
          orderBy: { sortOrder: "asc" },
          select: { id: true, name: true },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    // Fetch all transactions in the period with category info
    const transactions = await prisma.financeTransaction.findMany({
      where: {
        userId: session.userId,
        date: { gte: periodStart, lt: periodEnd },
      },
      select: {
        amount: true,
        date: true,
        categoryId: true,
        accountId: true,
        isOpeningBalance: true,
        payee: true,
        category: {
          select: {
            id: true,
            name: true,
            group: { select: { id: true, name: true } },
          },
        },
      },
    });

    // Fetch all accounts for net worth
    const accounts = await prisma.financeAccount.findMany({
      where: { userId: session.userId, isArchived: false },
      select: { id: true, name: true, type: true, group: true, startBalance: true },
    });

    // Fetch ALL transactions (for net worth cumulative calculation)
    const allTransactions = await prisma.financeTransaction.findMany({
      where: { userId: session.userId },
      select: { amount: true, date: true, accountId: true },
      orderBy: { date: "asc" },
    });

    // ─── 1. Spending Breakdown ──────────────────────────────────────
    const spendingByCategory = new Map<string, { name: string; groupId: string; groupName: string; total: number; count: number }>();
    let largestOutflowAmount = 0;
    let largestOutflowCategory = "";

    for (const t of transactions) {
      if (t.amount >= 0 || !t.category || t.isOpeningBalance) continue;
      // Apply category filter
      if (filterCategoryIds && !filterCategoryIds.includes(t.category.id)) continue;

      const abs = Math.abs(t.amount);
      const key = t.category.id;
      const existing = spendingByCategory.get(key);
      if (existing) {
        existing.total += abs;
        existing.count += 1;
      } else {
        spendingByCategory.set(key, {
          name: t.category.name,
          groupId: t.category.group?.id || "",
          groupName: t.category.group?.name || "",
          total: abs,
          count: 1,
        });
      }

      if (abs > largestOutflowAmount) {
        largestOutflowAmount = abs;
        largestOutflowCategory = t.category.name;
      }
    }

    const spendingBreakdown = Array.from(spendingByCategory.entries())
      .map(([categoryId, data]) => ({ categoryId, ...data }))
      .sort((a, b) => b.total - a.total);

    const totalSpending = spendingBreakdown.reduce((s, c) => s + c.total, 0);
    const totalTransactionCount = spendingBreakdown.reduce((s, c) => s + c.count, 0);

    // Most frequent category
    const mostFrequent = spendingBreakdown.length > 0
      ? spendingBreakdown.reduce((a, b) => (b.count > a.count ? b : a))
      : null;

    // Spending by group
    const spendingByGroup = new Map<string, { groupId: string; groupName: string; total: number; count: number }>();
    for (const cat of spendingBreakdown) {
      const existing = spendingByGroup.get(cat.groupId);
      if (existing) {
        existing.total += cat.total;
        existing.count += cat.count;
      } else {
        spendingByGroup.set(cat.groupId, {
          groupId: cat.groupId,
          groupName: cat.groupName,
          total: cat.total,
          count: cat.count,
        });
      }
    }
    const spendingGroups = Array.from(spendingByGroup.values()).sort((a, b) => b.total - a.total);

    const daysInPeriod = getDaysInPeriod(startMonth, endMonth);

    // ─── 2. Income vs Spending (per month) ──────────────────────────
    const incomeVsSpending = allMonths.map((month) => {
      let income = 0;
      let spending = 0;
      for (const t of transactions) {
        if (t.isOpeningBalance) continue;
        const tMonth = getMonthKey(t.date);
        if (tMonth !== month) continue;
        if (t.amount > 0) income += t.amount;
        else spending += Math.abs(t.amount);
      }
      return { month, income, spending };
    });

    // ─── 3. Spending Trends (per month, with group breakdown) ───────
    // Collect all unique group names from transactions
    const groupNamesSet = new Set<string>();
    for (const t of transactions) {
      if (t.isOpeningBalance || t.amount >= 0 || !t.category?.group) continue;
      if (filterCategoryIds && !filterCategoryIds.includes(t.category.id)) continue;
      groupNamesSet.add(t.category.group.name);
    }
    const trendGroupNames = Array.from(groupNamesSet).sort();

    const spendingTrends = allMonths.map((month) => {
      let total = 0;
      const byGroup: Record<string, number> = {};
      for (const gn of trendGroupNames) byGroup[gn] = 0;

      for (const t of transactions) {
        if (t.isOpeningBalance || t.amount >= 0) continue;
        if (filterCategoryIds && t.category && !filterCategoryIds.includes(t.category.id)) continue;
        if (getMonthKey(t.date) !== month) continue;
        const abs = Math.abs(t.amount);
        total += abs;
        const gName = t.category?.group?.name;
        if (gName) byGroup[gName] = (byGroup[gName] || 0) + abs;
      }
      return { month, total, byGroup };
    });

    const spendingTrendsGroupNames = trendGroupNames;

    // ─── 4. Net Worth (per month) ───────────────────────────────────
    const netWorth = allMonths.map((month) => {
      const [my, mm] = month.split("-").map(Number);
      const monthEnd = new Date(my, mm, 1);

      let assets = 0;
      let liabilities = 0;

      for (const account of accounts) {
        let balance = account.startBalance;
        for (const t of allTransactions) {
          if (t.accountId !== account.id) continue;
          if (t.date < monthEnd) balance += t.amount;
        }

        if (account.type === "credit_card" || account.group === "loans") {
          liabilities += Math.abs(balance);
        } else {
          assets += balance;
        }
      }

      return { month, assets, liabilities, net: assets - liabilities };
    });

    return NextResponse.json({
      months: allMonths,
      categoryGroups: categoryGroups.map((g) => ({
        id: g.id,
        name: g.name,
        categories: g.categories,
      })),
      spendingBreakdown: {
        categories: spendingBreakdown,
        groups: spendingGroups,
        total: totalSpending,
        stats: {
          avgMonthly: allMonths.length > 0 ? Math.round(totalSpending / allMonths.length) : 0,
          avgDaily: daysInPeriod > 0 ? Math.round(totalSpending / daysInPeriod) : 0,
          mostFrequentCategory: mostFrequent
            ? { name: mostFrequent.name, count: mostFrequent.count }
            : null,
          largestOutflow: largestOutflowAmount > 0
            ? { amount: largestOutflowAmount, categoryName: largestOutflowCategory }
            : null,
          totalTransactions: totalTransactionCount,
        },
      },
      incomeVsSpending,
      spendingTrends,
      spendingTrendsGroupNames,
      netWorth,
    });
  } catch (err) {
    console.error("GET /api/finance/reflect error:", err);
    return NextResponse.json({ error: "Reflect data ophalen mislukt" }, { status: 500 });
  }
}
