import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Upsert (POST/PUT) een target voor een categorie */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  try {
    const body = await request.json();
    const { categoryId, type, amount, dayOfMonth, refillType } = body;

    if (!categoryId || !type || amount == null) {
      return NextResponse.json(
        { error: "categoryId, type en amount zijn verplicht" },
        { status: 400 }
      );
    }

    // Check of category van deze user is
    const category = await prisma.financeCategory.findFirst({
      where: { id: categoryId, userId: session.userId },
    });
    if (!category) {
      return NextResponse.json({ error: "Categorie niet gevonden" }, { status: 404 });
    }

    // Upsert target (categoryId is @unique)
    const target = await prisma.financeCategoryTarget.upsert({
      where: { categoryId },
      create: {
        userId: session.userId,
        categoryId,
        type,
        amount,
        dayOfMonth: dayOfMonth ?? null,
        refillType: refillType || "refill",
      },
      update: {
        type,
        amount,
        dayOfMonth: dayOfMonth ?? null,
        refillType: refillType || "refill",
      },
    });

    return NextResponse.json({
      target: {
        ...target,
        createdAt: target.createdAt.toISOString(),
        updatedAt: target.updatedAt.toISOString(),
      },
    });
  } catch (err) {
    console.error("POST /api/finance/targets error:", err);
    return NextResponse.json({ error: "Target opslaan mislukt" }, { status: 500 });
  }
}

/** Verwijder een target */
export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  try {
    const { categoryId } = await request.json();

    if (!categoryId) {
      return NextResponse.json({ error: "categoryId is verplicht" }, { status: 400 });
    }

    // Check of target van deze user is
    const target = await prisma.financeCategoryTarget.findFirst({
      where: { categoryId, userId: session.userId },
    });
    if (!target) {
      return NextResponse.json({ error: "Target niet gevonden" }, { status: 404 });
    }

    await prisma.financeCategoryTarget.delete({
      where: { categoryId },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/finance/targets error:", err);
    return NextResponse.json({ error: "Target verwijderen mislukt" }, { status: 500 });
  }
}
