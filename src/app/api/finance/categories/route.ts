import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseGroup(g: any) {
  return {
    ...g,
    createdAt: g.createdAt.toISOString(),
    updatedAt: g.updatedAt.toISOString(),
    categories: g.categories?.map((c: any) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    })) ?? [],
  };
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  try {
    const params = request.nextUrl.searchParams;
    const includeHidden = params.get("hidden") === "true";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { userId: session.userId };
    if (!includeHidden) where.isHidden = false;

    const groups = await prisma.financeCategoryGroup.findMany({
      where,
      include: {
        categories: {
          where: includeHidden ? {} : { isHidden: false },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ categoryGroups: groups.map(parseGroup) });
  } catch (err) {
    console.error("GET /api/finance/categories error:", err);
    return NextResponse.json({ error: "Ophalen mislukt" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  try {
    const body = await request.json();
    const { name, groupId } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Naam is verplicht" }, { status: 400 });
    }

    // Als groupId meegegeven: maak een category aan, anders een group
    if (groupId) {
      // Controleer of de group bestaat en van deze user is
      const group = await prisma.financeCategoryGroup.findFirst({
        where: { id: groupId, userId: session.userId },
      });
      if (!group) return NextResponse.json({ error: "Groep niet gevonden" }, { status: 404 });

      const maxSort = await prisma.financeCategory.aggregate({
        where: { groupId },
        _max: { sortOrder: true },
      });

      const category = await prisma.financeCategory.create({
        data: {
          userId: session.userId,
          groupId,
          name: name.trim(),
          sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
        },
      });

      return NextResponse.json({
        category: {
          ...category,
          createdAt: category.createdAt.toISOString(),
          updatedAt: category.updatedAt.toISOString(),
        },
      }, { status: 201 });
    } else {
      // Maak een category group aan
      const maxSort = await prisma.financeCategoryGroup.aggregate({
        where: { userId: session.userId },
        _max: { sortOrder: true },
      });

      const group = await prisma.financeCategoryGroup.create({
        data: {
          userId: session.userId,
          name: name.trim(),
          sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
        },
        include: { categories: true },
      });

      return NextResponse.json({ categoryGroup: parseGroup(group) }, { status: 201 });
    }
  } catch (err) {
    console.error("POST /api/finance/categories error:", err);
    return NextResponse.json({ error: "Aanmaken mislukt" }, { status: 500 });
  }
}
