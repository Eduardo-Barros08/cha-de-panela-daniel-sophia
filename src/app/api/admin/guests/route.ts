import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAudit, prisma } from "@/lib/auth";
import { adminGuestUpdateSchema, adminEventUpdateSchema, adminGuestDeleteSchema } from "@/lib/validation";
import { deleteGuest } from "@/lib/data";
import { broadcast } from "@/lib/realtime";

export const dynamic = "force-dynamic";

// Atualização de convidado individual (nome, categoria, resposta, revisão, ativo)
export async function PATCH(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const parsed = adminGuestUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Dados inválidos." }, { status: 400 });
  }
  const { guestId, attending, ...guestFields } = parsed.data;

  const guest = await prisma.guest.findUnique({ where: { id: guestId } });
  if (!guest) return NextResponse.json({ error: "Convidado não encontrado." }, { status: 404 });

  const updated = await prisma.$transaction(async (tx) => {
    await tx.guest.update({
      where: { id: guestId },
      data: {
        ...guestFields,
        memberType: guestFields.isChild === true ? "crianca" : guestFields.isChild === false ? "adulto" : undefined,
      },
    });
    if (attending !== undefined) {
      const confirmation = await tx.confirmation.findFirst({
        where: { group: { members: { some: { guestId } } } },
      });
      if (confirmation) {
        await tx.rsvp.upsert({
          where: { guestId },
          update: { attending, respondedAt: new Date() },
          create: { guestId, confirmationId: confirmation.id, attending, isChild: guest.isChild },
        });
      } else {
        // convidado sem confirmação: cria grupo unitário + confirmação administrativa
        const group = await tx.confirmationGroup.create({
          data: { name: guest.fullName, eventId: (await tx.event.findFirstOrThrow()).id },
        });
        await tx.groupMember.create({ data: { groupId: group.id, guestId, role: "responsavel" } });
        const conf = await tx.confirmation.create({ data: { groupId: group.id } });
        await tx.rsvp.create({ data: { guestId, confirmationId: conf.id, attending, isChild: guest.isChild } });
      }
    }
    return tx.guest.findUnique({ where: { id: guestId } });
  });

  logAudit({
    actor: `admin:${session.email}`,
    action: "guest.update",
    guestId,
    before: { fullName: guest.fullName, category: guest.category, isChild: guest.isChild },
    after: { ...guestFields, attending },
  });
  broadcast("admin");
  return NextResponse.json({ ok: true, guest: updated });
}

// Atualização das configurações do evento
export async function PUT(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const parsed = adminEventUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Dados inválidos." }, { status: 400 });
  }

  const data = { ...parsed.data } as Record<string, unknown>;
  // campos vazios viram null
  for (const k of ["giftRegistryUrl", "giftNotes", "extraInfo", "rsvpDeadline"]) {
    if (data[k] === "") data[k] = null;
  }

  const event = await prisma.event.findFirst();
  if (!event) return NextResponse.json({ error: "Evento não configurado." }, { status: 404 });

  await prisma.event.update({ where: { id: event.id }, data: data as never });
  logAudit({ actor: `admin:${session.email}`, action: "event.update", after: data });
  broadcast("admin");
  return NextResponse.json({ ok: true });
}

// Exclusão definitiva de convidado (somente admin autenticado)
export async function DELETE(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }
  const parsed = adminGuestDeleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Dados inválidos." }, { status: 400 });
  }

  const removed = await deleteGuest(parsed.data.guestId);
  if (!removed) return NextResponse.json({ error: "Convidado não encontrado." }, { status: 404 });

  logAudit({
    actor: `admin:${session.email}`,
    action: "guest.delete",
    before: { fullName: removed.fullName, groupRemoved: removed.groupRemoved },
  });
  broadcast("admin");
  return NextResponse.json({ ok: true });
}
