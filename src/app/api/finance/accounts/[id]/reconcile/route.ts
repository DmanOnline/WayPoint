import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  try {
    const { id } = await params;
    const body = await request.json();
    const { adjustmentAmount } = body; // in centen, optioneel

    const account = await prisma.financeAccount.findFirst({
      where: { id, userId: session.userId },
    });
    if (!account) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

    let adjustmentTransaction = null;

    // Maak aanpassingstransactie aan als het saldo afwijkt
    if (adjustmentAmount !== undefined && adjustmentAmount !== 0) {
      adjustmentTransaction = await prisma.financeTransaction.create({
        data: {
          userId: session.userId,
          accountId: id,
          date: new Date(),
          payee: "Reconciliation Adjustment",
          amount: adjustmentAmount,
          isCleared: true,
          isReconciled: false,
        },
      });
    }

    // Markeer alle niet-gereconcilde transacties als reconciled
    const result = await prisma.financeTransaction.updateMany({
      where: {
        accountId: id,
        userId: session.userId,
        isReconciled: false,
      },
      data: { isReconciled: true },
    });

    return NextResponse.json({
      reconciledCount: result.count,
      adjustmentTransaction: adjustmentTransaction
        ? {
            ...adjustmentTransaction,
            date: adjustmentTransaction.date.toISOString(),
            createdAt: adjustmentTransaction.createdAt.toISOString(),
            updatedAt: adjustmentTransaction.updatedAt.toISOString(),
          }
        : null,
    });
  } catch (err) {
    console.error("POST /api/finance/accounts/[id]/reconcile error:", err);
    return NextResponse.json({ error: "Reconciliation mislukt" }, { status: 500 });
  }
}
