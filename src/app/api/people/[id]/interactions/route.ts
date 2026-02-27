import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function parseInteraction(i: { id: string; personId: string; date: Date; type: string; notes: string; createdAt: Date; updatedAt: Date }) {
  return { ...i, date: i.date.toISOString(), createdAt: i.createdAt.toISOString(), updatedAt: i.updatedAt.toISOString() };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const { id: personId } = await params;
  const person = await prisma.person.findFirst({ where: { id: personId, userId: session.userId } });
  if (!person) return NextResponse.json({ error: "Persoon niet gevonden" }, { status: 404 });

  try {
    const body = await request.json();
    const { date, type, notes } = body;

    const interactionDate = date ? new Date(date) : new Date();

    const interaction = await prisma.personInteraction.create({
      data: {
        personId,
        date: interactionDate,
        type: type || "general",
        notes: notes || "",
      },
    });

    // Update lastContactedAt on the person
    await prisma.person.update({
      where: { id: personId },
      data: { lastContactedAt: interactionDate },
    });

    return NextResponse.json({ interaction: parseInteraction(interaction) }, { status: 201 });
  } catch (err) {
    console.error("POST /api/people/[id]/interactions error:", err);
    return NextResponse.json({ error: "Aanmaken mislukt" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const { id: personId } = await params;
  const person = await prisma.person.findFirst({ where: { id: personId, userId: session.userId } });
  if (!person) return NextResponse.json({ error: "Persoon niet gevonden" }, { status: 404 });

  const body = await request.json();
  const { interactionId } = body;

  await prisma.personInteraction.deleteMany({ where: { id: interactionId, personId } });
  return NextResponse.json({ success: true });
}
