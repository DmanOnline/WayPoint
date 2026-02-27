import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function parseFollowUp(f: { id: string; personId: string; text: string; isDone: boolean; doneAt: Date | null; dueDate: Date | null; createdAt: Date; updatedAt: Date }) {
  return {
    ...f,
    doneAt: f.doneAt?.toISOString() ?? null,
    dueDate: f.dueDate?.toISOString() ?? null,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
  };
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
    const { text, dueDate } = body;

    if (!text?.trim()) return NextResponse.json({ error: "Tekst is verplicht" }, { status: 400 });

    const followUp = await prisma.personFollowUp.create({
      data: {
        personId,
        text: text.trim(),
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });

    return NextResponse.json({ followUp: parseFollowUp(followUp) }, { status: 201 });
  } catch (err) {
    console.error("POST /api/people/[id]/followups error:", err);
    return NextResponse.json({ error: "Aanmaken mislukt" }, { status: 500 });
  }
}

export async function PUT(
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
    const { followUpId, isDone, text } = body;

    const followUp = await prisma.personFollowUp.update({
      where: { id: followUpId },
      data: {
        ...(isDone !== undefined && { isDone, doneAt: isDone ? new Date() : null }),
        ...(text !== undefined && { text: text.trim() }),
      },
    });

    return NextResponse.json({ followUp: parseFollowUp(followUp) });
  } catch (err) {
    console.error("PUT /api/people/[id]/followups error:", err);
    return NextResponse.json({ error: "Bijwerken mislukt" }, { status: 500 });
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
  const { followUpId } = body;

  await prisma.personFollowUp.deleteMany({ where: { id: followUpId, personId } });
  return NextResponse.json({ success: true });
}
