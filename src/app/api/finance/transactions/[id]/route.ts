import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.financeTransaction.findFirst({
      where: { id, userId: session.userId },
    });
    if (!existing) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

    const transaction = await prisma.financeTransaction.update({
      where: { id },
      data: {
        ...(body.accountId !== undefined && { accountId: body.accountId }),
        ...(body.categoryId !== undefined && { categoryId: body.categoryId || null }),
        ...(body.date !== undefined && { date: new Date(body.date) }),
        ...(body.payee !== undefined && { payee: body.payee?.trim() || null }),
        ...(body.memo !== undefined && { memo: body.memo?.trim() || null }),
        ...(body.amount !== undefined && { amount: body.amount }),
        ...(body.isCleared !== undefined && { isCleared: body.isCleared }),
        ...(body.transferAccountId !== undefined && { transferAccountId: body.transferAccountId || null }),
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

    return NextResponse.json({
      transaction: {
        ...transaction,
        date: transaction.date.toISOString(),
        createdAt: transaction.createdAt.toISOString(),
        updatedAt: transaction.updatedAt.toISOString(),
      },
    });
  } catch (err) {
    console.error("PUT /api/finance/transactions/[id] error:", err);
    return NextResponse.json({ error: "Updaten mislukt" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  try {
    const { id } = await params;

    const existing = await prisma.financeTransaction.findFirst({
      where: { id, userId: session.userId },
    });
    if (!existing) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

    await prisma.financeTransaction.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/finance/transactions/[id] error:", err);
    return NextResponse.json({ error: "Verwijderen mislukt" }, { status: 500 });
  }
}
