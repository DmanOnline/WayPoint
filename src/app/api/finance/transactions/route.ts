import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseTransaction(t: any) {
  return {
    ...t,
    date: t.date.toISOString(),
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  try {
    const params = request.nextUrl.searchParams;
    const accountId = params.get("accountId");
    const categoryId = params.get("categoryId");
    const from = params.get("from"); // ISO date
    const to = params.get("to"); // ISO date
    const search = params.get("search");
    const limit = parseInt(params.get("limit") || "100");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { userId: session.userId };
    if (accountId) where.accountId = accountId;
    if (categoryId) where.categoryId = categoryId;
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lt = new Date(to);
    }
    if (search) {
      where.OR = [
        { payee: { contains: search, mode: "insensitive" } },
        { memo: { contains: search, mode: "insensitive" } },
      ];
    }

    const transactions = await prisma.financeTransaction.findMany({
      where,
      include: {
        account: { select: { id: true, name: true } },
        category: {
          select: {
            id: true,
            name: true,
            group: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: limit,
    });

    return NextResponse.json({ transactions: transactions.map(parseTransaction) });
  } catch (err) {
    console.error("GET /api/finance/transactions error:", err);
    return NextResponse.json({ error: "Ophalen mislukt" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  try {
    const body = await request.json();
    const { accountId, categoryId, date, payee, memo, amount, isCleared, transferAccountId } = body;

    if (!accountId) {
      return NextResponse.json({ error: "Account is verplicht" }, { status: 400 });
    }
    if (amount === undefined || amount === null) {
      return NextResponse.json({ error: "Bedrag is verplicht" }, { status: 400 });
    }

    // Controleer of account van deze user is
    const account = await prisma.financeAccount.findFirst({
      where: { id: accountId, userId: session.userId },
    });
    if (!account) return NextResponse.json({ error: "Account niet gevonden" }, { status: 404 });

    // Controleer category als meegegeven
    if (categoryId) {
      const category = await prisma.financeCategory.findFirst({
        where: { id: categoryId, userId: session.userId },
      });
      if (!category) return NextResponse.json({ error: "Categorie niet gevonden" }, { status: 404 });
    }

    const transaction = await prisma.financeTransaction.create({
      data: {
        userId: session.userId,
        accountId,
        categoryId: categoryId || null,
        date: new Date(date || new Date()),
        payee: payee?.trim() || null,
        memo: memo?.trim() || null,
        amount,
        isCleared: isCleared ?? false,
        transferAccountId: transferAccountId || null,
      },
      include: {
        account: { select: { id: true, name: true } },
        category: {
          select: {
            id: true,
            name: true,
            group: { select: { id: true, name: true } },
          },
        },
      },
    });

    return NextResponse.json({ transaction: parseTransaction(transaction) }, { status: 201 });
  } catch (err) {
    console.error("POST /api/finance/transactions error:", err);
    return NextResponse.json({ error: "Aanmaken mislukt" }, { status: 500 });
  }
}
