import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function parseLifeEvent(e: any) {
  return {
    ...e,
    date: e.date.toISOString(),
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const { id } = await params;
  const person = await prisma.person.findFirst({ where: { id, userId: session.userId } });
  if (!person) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

  try {
    const body = await request.json();
    const { date, title, description, icon } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: "Titel is verplicht" }, { status: 400 });
    }

    const event = await prisma.personLifeEvent.create({
      data: {
        personId: id,
        date: date ? new Date(date) : new Date(),
        title: title.trim(),
        description: description?.trim() || null,
        icon: icon || "📌",
      },
    });

    return NextResponse.json({ lifeEvent: parseLifeEvent(event) }, { status: 201 });
  } catch (err) {
    console.error("POST /api/people/[id]/life-events error:", err);
    return NextResponse.json({ error: "Aanmaken mislukt" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const { id } = await params;
  const person = await prisma.person.findFirst({ where: { id, userId: session.userId } });
  if (!person) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

  try {
    const { lifeEventId } = await request.json();
    await prisma.personLifeEvent.delete({ where: { id: lifeEventId } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/people/[id]/life-events error:", err);
    return NextResponse.json({ error: "Verwijderen mislukt" }, { status: 500 });
  }
}
