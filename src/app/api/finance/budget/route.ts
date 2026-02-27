import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMonthRange } from "@/lib/types/finance";

/**
 * YNAB Budget Berekeningen:
 *
 * Ready to Assign =
 *   Som(inflows zonder categorie op budget-accounts, t/m deze maand)
 *   - Som(alle assigned bedragen t/m deze maand)
 *
 * Category Available =
 *   Som(assigned t/m deze maand) + Som(transactie amounts t/m deze maand)
 *
 * Category Activity =
 *   Som(transactie amounts in deze maand)
 */

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  try {
    const params = request.nextUrl.searchParams;
    const month = params.get("month"); // "2026-02"

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: "Ongeldige maand (verwacht YYYY-MM)" }, { status: 400 });
    }

    const { start: monthStart, end: monthEnd } = getMonthRange(month);

    // 1. Haal alle category groups + categories op
    const categoryGroups = await prisma.financeCategoryGroup.findMany({
      where: { userId: session.userId, isHidden: false },
      include: {
        categories: {
          where: { isHidden: false },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    // Alle category IDs
    const allCategoryIds = categoryGroups.flatMap((g) =>
      g.categories.map((c) => c.id)
    );

    // 2. Haal alle assigned bedragen t/m deze maand op
    const allBudgets = await prisma.financeMonthlyBudget.findMany({
      where: {
        userId: session.userId,
        categoryId: { in: allCategoryIds },
        month: { lte: month },
      },
    });

    // 3. Haal transacties op voor activity berekeningen
    // Activity deze maand (per category)
    const monthTransactions = await prisma.financeTransaction.findMany({
      where: {
        userId: session.userId,
        categoryId: { not: null },
        date: { gte: monthStart, lt: monthEnd },
      },
      select: { categoryId: true, amount: true },
    });

    // Alle transacties t/m einde deze maand (voor cumulative available)
    const cumulativeTransactions = await prisma.financeTransaction.findMany({
      where: {
        userId: session.userId,
        categoryId: { not: null },
        date: { lt: monthEnd },
      },
      select: { categoryId: true, amount: true },
    });

    // 4. Bereken per category
    const budgetsByCat = new Map<string, number>(); // cumulative assigned
    const budgetsThisMonth = new Map<string, number>(); // assigned deze maand
    for (const b of allBudgets) {
      budgetsByCat.set(b.categoryId, (budgetsByCat.get(b.categoryId) || 0) + b.assigned);
      if (b.month === month) {
        budgetsThisMonth.set(b.categoryId, b.assigned);
      }
    }

    const activityByCat = new Map<string, number>(); // activity deze maand
    for (const t of monthTransactions) {
      if (t.categoryId) {
        activityByCat.set(t.categoryId, (activityByCat.get(t.categoryId) || 0) + t.amount);
      }
    }

    const cumulativeActivityByCat = new Map<string, number>(); // totaal activity
    for (const t of cumulativeTransactions) {
      if (t.categoryId) {
        cumulativeActivityByCat.set(
          t.categoryId,
          (cumulativeActivityByCat.get(t.categoryId) || 0) + t.amount
        );
      }
    }

    // 5. Haal targets op voor alle categorieën
    const targets = await prisma.financeCategoryTarget.findMany({
      where: {
        userId: session.userId,
        categoryId: { in: allCategoryIds },
      },
    });
    const targetByCat = new Map(targets.map((t) => [t.categoryId, t]));

    // 6. Bouw response per group
    const result = categoryGroups.map((group) => ({
      group: {
        ...group,
        createdAt: group.createdAt.toISOString(),
        updatedAt: group.updatedAt.toISOString(),
        categories: group.categories.map((c) => ({
          ...c,
          createdAt: c.createdAt.toISOString(),
          updatedAt: c.updatedAt.toISOString(),
        })),
      },
      budgets: group.categories.map((cat) => {
        const assigned = budgetsThisMonth.get(cat.id) || 0;
        const activity = activityByCat.get(cat.id) || 0;
        const available = (budgetsByCat.get(cat.id) || 0) + (cumulativeActivityByCat.get(cat.id) || 0);
        const target = targetByCat.get(cat.id);

        let targetData = null;
        if (target) {
          // Target = heb je deze maand genoeg toegewezen?
          // Refill: als er al geld over is van vorige maand, hoef je minder toe te wijzen
          // Set aside: altijd het volle bedrag toewijzen
          let needed = 0;
          if (target.refillType === "refill") {
            // Carryover = available vóór deze maand (available - assigned - activity)
            const carryover = Math.max(0, available - assigned - activity);
            needed = Math.max(0, target.amount - assigned - carryover);
          } else {
            needed = Math.max(0, target.amount - assigned);
          }
          const progress = target.amount > 0
            ? Math.min(1, Math.max(0, (target.amount - needed) / target.amount))
            : 1;

          targetData = {
            type: target.type,
            amount: target.amount,
            dayOfMonth: target.dayOfMonth,
            refillType: target.refillType,
            needed,
            progress,
          };
        }

        return {
          categoryId: cat.id,
          assigned,
          activity,
          available,
          target: targetData,
        };
      }),
    }));

    // 7. Ready to Assign berekening
    // = Som van alle uncategorized inflows op budget accounts t/m deze maand
    //   - Som van alle assigned t/m deze maand
    const budgetAccountIds = (
      await prisma.financeAccount.findMany({
        where: { userId: session.userId, onBudget: true },
        select: { id: true, startBalance: true },
      })
    );

    // Totaal startbalans van alle budget accounts
    const totalStartBalance = budgetAccountIds.reduce((s, a) => s + a.startBalance, 0);

    // Totaal alle transacties op budget accounts t/m deze maand
    const budgetAccountTxSum = await prisma.financeTransaction.aggregate({
      where: {
        userId: session.userId,
        accountId: { in: budgetAccountIds.map((a) => a.id) },
        date: { lt: monthEnd },
      },
      _sum: { amount: true },
    });

    // Totaal budget account balans
    const totalBudgetBalance = totalStartBalance + (budgetAccountTxSum._sum.amount || 0);

    // Totaal available across all categories
    const totalAvailable = allCategoryIds.reduce((sum, catId) => {
      return sum + (budgetsByCat.get(catId) || 0) + (cumulativeActivityByCat.get(catId) || 0);
    }, 0);

    const readyToAssign = totalBudgetBalance - totalAvailable;

    return NextResponse.json({
      month,
      readyToAssign,
      categoryGroups: result,
    });
  } catch (err) {
    console.error("GET /api/finance/budget error:", err);
    return NextResponse.json({ error: "Budget ophalen mislukt" }, { status: 500 });
  }
}

/** Upsert assigned bedrag voor een category/month combo */
export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  try {
    const body = await request.json();
    const { categoryId, month, assigned } = body;

    if (!categoryId || !month) {
      return NextResponse.json({ error: "categoryId en month zijn verplicht" }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: "Ongeldige maand (verwacht YYYY-MM)" }, { status: 400 });
    }

    // Controleer of category van deze user is
    const category = await prisma.financeCategory.findFirst({
      where: { id: categoryId, userId: session.userId },
    });
    if (!category) return NextResponse.json({ error: "Categorie niet gevonden" }, { status: 404 });

    // Upsert
    const budget = await prisma.financeMonthlyBudget.upsert({
      where: {
        categoryId_month: { categoryId, month },
      },
      create: {
        userId: session.userId,
        categoryId,
        month,
        assigned: assigned || 0,
      },
      update: {
        assigned: assigned || 0,
      },
    });

    return NextResponse.json({
      budget: {
        ...budget,
        createdAt: budget.createdAt.toISOString(),
        updatedAt: budget.updatedAt.toISOString(),
      },
    });
  } catch (err) {
    console.error("PUT /api/finance/budget error:", err);
    return NextResponse.json({ error: "Budget updaten mislukt" }, { status: 500 });
  }
}
