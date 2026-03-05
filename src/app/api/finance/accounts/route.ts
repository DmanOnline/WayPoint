import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseAccount(a: any) {
  return {
    ...a,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  try {
    const params = request.nextUrl.searchParams;
    const includeArchived = params.get("archived") === "true";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { userId: session.userId };
    if (!includeArchived) where.isArchived = false;

    const accounts = await prisma.financeAccount.findMany({
      where,
      include: {
        transactions: {
          select: { amount: true },
        },
      },
      orderBy: [{ group: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    });

    // Bereken balans per account: som van alle transacties (incl. opening balance)
    const parsed = accounts.map((a) => {
      const txSum = a.transactions.reduce((sum, t) => sum + t.amount, 0);
      const { transactions: _, ...rest } = a;
      return {
        ...parseAccount(rest),
        balance: txSum,
      };
    });

    return NextResponse.json({ accounts: parsed });
  } catch (err) {
    console.error("GET /api/finance/accounts error:", err);
    return NextResponse.json({ error: "Ophalen mislukt" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  try {
    const body = await request.json();
    const { name, type, group, startBalance, currency, color } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Naam is verplicht" }, { status: 400 });
    }

    const onBudget = group === "cash";

    const maxSort = await prisma.financeAccount.aggregate({
      where: { userId: session.userId },
      _max: { sortOrder: true },
    });

    const account = await prisma.financeAccount.create({
      data: {
        userId: session.userId,
        name: name.trim(),
        type: type || "checking",
        group: group || "cash",
        onBudget,
        startBalance: 0,
        currency: currency || "EUR",
        color: color || "#6366f1",
        sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
      },
    });

    // Maak opening balance transactie als er een startsaldo is
    const initialBalance = startBalance || 0;
    if (initialBalance !== 0) {
      await prisma.financeTransaction.create({
        data: {
          userId: session.userId,
          accountId: account.id,
          date: account.createdAt,
          amount: initialBalance,
          isOpeningBalance: true,
          isCleared: true,
          payee: "Opening Balance",
        },
      });
    }

    return NextResponse.json(
      { account: { ...parseAccount(account), balance: initialBalance } },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/finance/accounts error:", err);
    return NextResponse.json({ error: "Aanmaken mislukt" }, { status: 500 });
  }
}
