import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    const { targetPersonId, type, label } = body;

    if (!targetPersonId || !type) {
      return NextResponse.json({ error: "Persoon en type zijn verplicht" }, { status: 400 });
    }

    // Verify target person belongs to the same user
    const target = await prisma.person.findFirst({ where: { id: targetPersonId, userId: session.userId } });
    if (!target) return NextResponse.json({ error: "Doelpersoon niet gevonden" }, { status: 404 });

    // Use consistent ordering (smaller ID first) to avoid duplicates
    const [aId, bId] = [id, targetPersonId].sort();

    const relationship = await prisma.personRelationship.upsert({
      where: { personAId_personBId: { personAId: aId, personBId: bId } },
      update: { type, label: label?.trim() || null },
      create: {
        personAId: aId,
        personBId: bId,
        type,
        label: label?.trim() || null,
      },
      include: {
        personA: { select: { id: true, name: true, avatarColor: true } },
        personB: { select: { id: true, name: true, avatarColor: true } },
      },
    });

    // Return with otherPerson resolved from perspective of the requesting person
    const otherPerson = relationship.personAId === id ? relationship.personB : relationship.personA;

    return NextResponse.json({
      relationship: {
        id: relationship.id,
        personAId: relationship.personAId,
        personBId: relationship.personBId,
        type: relationship.type,
        label: relationship.label,
        createdAt: relationship.createdAt.toISOString(),
        updatedAt: relationship.updatedAt.toISOString(),
        otherPerson,
      },
    }, { status: 201 });
  } catch (err) {
    console.error("POST /api/people/[id]/relationships error:", err);
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
    const { relationshipId } = await request.json();
    await prisma.personRelationship.delete({ where: { id: relationshipId } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/people/[id]/relationships error:", err);
    return NextResponse.json({ error: "Verwijderen mislukt" }, { status: 500 });
  }
}
