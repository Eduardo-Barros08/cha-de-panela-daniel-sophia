import { prisma, logAudit } from "./auth";
import type { RsvpInput } from "./validation";
import type { ConfirmationGroup, Guest } from "@prisma/client";

export type Stats = {
  totalGuests: number;
  confirmed: number;
  declined: number;
  pending: number;
  childrenConfirmed: number;
  adultsConfirmed: number;
  totalGroups: number;
  totalSubmissions: number;
  responseRate: number;
  lastUpdate: string | null;
};

export async function getEvent() {
  return prisma.event.findUnique({ where: { slug: "daniel-sophia" } });
}

export async function computeStats(): Promise<Stats> {
  const [guests, groups, submissions, lastLog] = await Promise.all([
    prisma.guest.count({ where: { active: true } }),
    prisma.confirmationGroup.count(),
    prisma.confirmation.count(),
    prisma.auditLog.findFirst({ orderBy: { createdAt: "desc" } }),
  ]);
  const rsvps = await prisma.rsvp.findMany({
    where: { guest: { active: true } },
    select: { attending: true, isChild: true },
  });
  let confirmed = 0,
    declined = 0,
    pending = guests,
    childrenConfirmed = 0,
    adultsConfirmed = 0;
  for (const r of rsvps) {
    if (r.attending === true) {
      confirmed++;
      r.isChild ? childrenConfirmed++ : adultsConfirmed++;
    } else if (r.attending === false) declined++;
  }
  pending = Math.max(0, guests - confirmed - declined);
  return {
    totalGuests: guests,
    confirmed,
    declined,
    pending,
    childrenConfirmed,
    adultsConfirmed,
    totalGroups: groups,
    totalSubmissions: submissions,
    responseRate: guests ? Math.round(((confirmed + declined) / guests) * 100) : 0,
    lastUpdate: lastLog ? lastLog.createdAt.toISOString() : null,
  };
}

export type GuestRow = {
  id: string;
  fullName: string;
  category: string;
  isChild: boolean;
  source: string;
  needsReview: boolean;
  active: boolean;
  attending: boolean | null;
  groupName: string | null;
  responsibleName: string | null;
  updatedAt: string;
};

export async function listGuestRows(): Promise<GuestRow[]> {
  const guests = await prisma.guest.findMany({
    where: { active: true },
    include: {
      groupMember: { include: { group: { select: { name: true } } } },
      rsvps: { select: { attending: true, updatedAt: true } },
    },
    orderBy: [{ category: "asc" }, { fullName: "asc" }],
  });
  const responsibleIds = new Set(
    (await prisma.groupMember.findMany({ where: { role: "responsavel" } })).map((m) => `${m.groupId}:${m.guestId}`)
  );
  return guests.map((g) => {
    const rsvp = g.rsvps[0];
    const isResponsible = g.groupMember ? responsibleIds.has(`${g.groupMember.groupId}:${g.id}`) : false;
    return {
      id: g.id,
      fullName: g.fullName,
      category: g.category,
      isChild: g.isChild,
      source: g.source,
      needsReview: g.needsReview,
      active: g.active,
      attending: rsvp ? rsvp.attending : null,
      groupName: g.groupMember?.group.name ?? null,
      responsibleName: isResponsible ? g.fullName : null,
      updatedAt: (rsvp ? rsvp.updatedAt : g.updatedAt).toISOString(),
    };
  });
}

/**
 * Fluxo principal: cria ou atualiza a confirmação de um grupo familiar.
 * - Convidado novo (nome não cadastrado): cria grupo + convidados + confirmação (source="convidado", needsReview para acompanhantes).
 * - Convidado pré-cadastrado: localiza pelo nome do responsável (case/acento-insensível) e atualiza as respostas,
 *   criando acompanhantes extras como source="convidado" + needsReview=true para revisão dos noivos.
 * Executa em transação: ou salva tudo, ou nada.
 */
export function normalizeName(n: string): string {
  return n
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export async function saveRsvp(input: RsvpInput, actor: string) {
  const event = await getEvent();
  if (!event) throw new Error("Evento não configurado.");
  if (!event.rsvpOpen) throw new Error("As confirmações estão encerradas.");
  if (event.rsvpDeadline && new Date() > event.rsvpDeadline)
    throw new Error("O prazo para confirmações expirou.");
  if (input.members.length > event.maxMembersPerRsvp)
    throw new Error(`Limite de ${event.maxMembersPerRsvp} integrantes por confirmação.`);

  const norm = normalizeName(input.responsibleName);

  // Busca por nome normalizado (SQLite não tem unaccent): carrega ativos e compara normalizado.
  const allActive = await prisma.guest.findMany({
    where: { active: true },
    select: { id: true, fullName: true, groupMember: { select: { groupId: true, role: true } } },
  });
  const responsible = allActive.find((g) => normalizeName(g.fullName) === norm);

  const result = await prisma.$transaction(async (tx) => {
    let group: ConfirmationGroup;
    let responsibleGuest: Guest;

    if (responsible && responsible.groupMember) {
      // Pré-cadastrado: reutiliza grupo existente
      responsibleGuest = await tx.guest.findUniqueOrThrow({ where: { id: responsible.id } });
      group = await tx.confirmationGroup.findUniqueOrThrow({
        where: { id: responsible.groupMember.groupId },
      });
    } else if (responsible && !responsible.groupMember) {
      // responsável existe sem grupo (raro): cria grupo
      responsibleGuest = await tx.guest.findUniqueOrThrow({ where: { id: responsible.id } });
      group = await tx.confirmationGroup.create({
        data: { name: responsibleGuest.fullName, eventId: event.id },
      });
      await tx.groupMember.create({
        data: { groupId: group.id, guestId: responsibleGuest.id, role: "responsavel" },
      });
    } else {
      // Novo convidado (não estava na lista importada)
      responsibleGuest = await tx.guest.create({
        data: {
          fullName: input.responsibleName,
          category: "outros",
          source: "convidado",
          needsReview: true,
        },
      });
      group = await tx.confirmationGroup.create({
        data: { name: responsibleGuest.fullName, eventId: event.id },
      });
      await tx.groupMember.create({
        data: { groupId: group.id, guestId: responsibleGuest.id, role: "responsavel" },
      });
    }

    // Confirmação: reutiliza existente do grupo ou cria nova
    let confirmation = await tx.confirmation.findFirst({ where: { groupId: group.id } });
    if (!confirmation) {
      confirmation = await tx.confirmation.create({
        data: { groupId: group.id, email: input.email || null },
      });
    } else if (input.email) {
      await tx.confirmation.update({ where: { id: confirmation.id }, data: { email: input.email } });
    }

    // Garante registros de RSVP para o responsável e membros informados
    const existingMembers = await tx.groupMember.findMany({ where: { groupId: group.id } });
    const memberIds = new Set(existingMembers.map((m) => m.guestId));

    const ensureRsvp = async (guestId: string, fullName: string, isChild: boolean, attending: boolean, source: "importado" | "convidado" | "admin") => {
      let guest = await tx.guest.findUnique({ where: { id: guestId } });
      if (!guest) {
        guest = await tx.guest.create({
          data: { id: guestId, fullName, isChild, memberType: isChild ? "crianca" : "adulto", source, needsReview: source === "convidado" },
        });
      }
      const rsvp = await tx.rsvp.upsert({
        where: { guestId },
        update: { attending, isChild, respondedAt: new Date() },
        create: { guestId, confirmationId: confirmation!.id, attending, isChild },
      });
      return rsvp;
    };

    // Responsável
    await ensureRsvp(responsibleGuest.id, responsibleGuest.fullName, false, input.members[0].attending, "importado");

    // Membros informados
    for (const m of input.members.slice(1)) {
      const normM = normalizeName(m.fullName);
      let guestId: string | null = null;
      for (const mid of memberIds) {
        const g = await tx.guest.findUnique({ where: { id: mid } });
        if (g && normalizeName(g.fullName) === normM) {
          guestId = g.id;
          break;
        }
      }
      if (!guestId) {
        const g = await tx.guest.create({
          data: {
            fullName: m.fullName,
            isChild: m.isChild,
            memberType: m.isChild ? "crianca" : "adulto",
            source: "convidado",
            needsReview: true,
          },
        });
        await tx.groupMember.create({ data: { groupId: group.id, guestId: g.id, role: "membro" } });
        memberIds.add(g.id);
        guestId = g.id;
      }
      await ensureRsvp(guestId, m.fullName, m.isChild, m.attending, "convidado");
    }

    // Atualiza status da confirmação
    const allRsvps = await tx.rsvp.findMany({ where: { confirmationId: confirmation.id } });
    const allYes = allRsvps.every((r) => r.attending === true);
    const allNo = allRsvps.every((r) => r.attending === false);
    const status = allYes ? "confirmada" : allNo ? "recusada" : "parcial";
    await tx.confirmation.update({ where: { id: confirmation.id }, data: { status } });

    logAudit({
      actor,
      action: confirmation.submittedAt.getTime() === confirmation.updatedAt.getTime() ? "rsvp.create" : "rsvp.update",
      confirmationId: confirmation.id,
      guestId: responsibleGuest.id,
      after: { responsible: input.responsibleName, members: input.members.length },
    });

    return { confirmation, groupId: group.id };
  });

  return result;
}

export async function getConfirmationByToken(token: string) {
  const confirmation = await prisma.confirmation.findUnique({
    where: { manageToken: token },
    include: {
      group: {
        include: {
          members: { include: { guest: true } },
        },
      },
      rsvps: true,
    },
  });
  if (!confirmation) return null;
  return confirmation;
}
