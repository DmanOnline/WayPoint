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
    const { name, sortOrder, isHidden, type } = body;

    // type = "group" of "category" — bepaalt welk model we updaten
    if (type === "group") {
      const existing = await prisma.financeCategoryGroup.findFirst({
        where: { id, userId: session.userId },
      });
      if (!existing) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

      const group = await prisma.financeCategoryGroup.update({
        where: { id },
        data: {
          ...(name !== undefined && { name: name.trim() }),
          ...(sortOrder !== undefined && { sortOrder }),
          ...(isHidden !== undefined && { isHidden }),
        },
        include: {
          categories: { orderBy: { sortOrder: "asc" } },
        },
      });

      return NextResponse.json({
        categoryGroup: {
          ...group,
          createdAt: group.createdAt.toISOString(),
          updatedAt: group.updatedAt.toISOString(),
          categories: group.categories.map((c) => ({
            ...c,
            createdAt: c.createdAt.toISOString(),
            updatedAt: c.updatedAt.toISOString(),
          })),
        },
      });
    } else {
      // Update category
      const existing = await prisma.financeCategory.findFirst({
        where: { id, userId: session.userId },
      });
      if (!existing) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

      const category = await prisma.financeCategory.update({
        where: { id },
        data: {
          ...(name !== undefined && { name: name.trim() }),
          ...(sortOrder !== undefined && { sortOrder }),
          ...(isHidden !== undefined && { isHidden }),
          ...(body.groupId !== undefined && { groupId: body.groupId }),
        },
      });

      return NextResponse.json({
        category: {
          ...category,
          createdAt: category.createdAt.toISOString(),
          updatedAt: category.updatedAt.toISOString(),
        },
      });
    }
  } catch (err) {
    console.error("PUT /api/finance/categories/[id] error:", err);
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
    const { searchParams } = request.nextUrl;
    const type = searchParams.get("type"); // "group" of "category"

    if (type === "group") {
      const existing = await prisma.financeCategoryGroup.findFirst({
        where: { id, userId: session.userId },
      });
      if (!existing) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

      await prisma.financeCategoryGroup.delete({ where: { id } });
    } else {
      const existing = await prisma.financeCategory.findFirst({
        where: { id, userId: session.userId },
      });
      if (!existing) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

      await prisma.financeCategory.delete({ where: { id } });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/finance/categories/[id] error:", err);
    return NextResponse.json({ error: "Verwijderen mislukt" }, { status: 500 });
  }
}
