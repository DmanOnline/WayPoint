import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { name, color, icon } = body;

    const category = await prisma.goalCategory.findFirst({
      where: { id, userId: session.userId },
    });
    if (!category) {
      return NextResponse.json(
        { error: "Categorie niet gevonden" },
        { status: 404 }
      );
    }

    if (name && name.trim() !== category.name) {
      const existing = await prisma.goalCategory.findFirst({
        where: { userId: session.userId, name: name.trim(), id: { not: id } },
      });
      if (existing) {
        return NextResponse.json(
          { error: "Categorie met deze naam bestaat al" },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.goalCategory.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(color !== undefined && { color }),
        ...(icon !== undefined && { icon: icon || null }),
      },
      include: { _count: { select: { goals: true } } },
    });

    return NextResponse.json({ category: updated });
  } catch (err) {
    console.error("PUT /api/goals/categories/[id] error:", err);
    return NextResponse.json(
      { error: "Categorie bijwerken mislukt" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const category = await prisma.goalCategory.findFirst({
      where: { id, userId: session.userId },
    });
    if (!category) {
      return NextResponse.json(
        { error: "Categorie niet gevonden" },
        { status: 404 }
      );
    }

    await prisma.goal.updateMany({
      where: { categoryId: id },
      data: { categoryId: null },
    });

    await prisma.goalCategory.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/goals/categories/[id] error:", err);
    return NextResponse.json(
      { error: "Categorie verwijderen mislukt" },
      { status: 500 }
    );
  }
}
