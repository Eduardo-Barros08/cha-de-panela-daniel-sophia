import { NextRequest, NextResponse } from "next/server";
import { prisma, rateLimit, clientIp, logAudit } from "@/lib/auth";
import { getConfirmationByToken, hasConfirmedAttendance } from "@/lib/data";
import { giftChoiceSchema } from "@/lib/validation";
import { findGift, BIGAZINE_GIFTS, HAVAN_GIFTS, HAVAN_LIST_URL } from "@/lib/gifts";
import { withBigazineLinks } from "@/lib/bigazine";
import { broadcast } from "@/lib/realtime";

export const dynamic = "force-dynamic";

// Lista de presentes + escolha atual. Exige o link do convidado e presença confirmada.
export async function GET(req: NextRequest) {
  const ip = clientIp(req);
  const rl = rateLimit(`gifts-get:${ip}`, 30, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Muitas consultas. Aguarde um momento." }, { status: 429 });

  const token = req.nextUrl.searchParams.get("t");
  if (!token || token.length < 10) return NextResponse.json({ error: "Link inválido." }, { status: 400 });

  const confirmation = await getConfirmationByToken(token);
  if (!confirmation) return NextResponse.json({ error: "Confirmação não encontrada." }, { status: 404 });
  if (!hasConfirmedAttendance(confirmation)) {
    return NextResponse.json({ error: "A lista de presentes aparece depois de confirmar presença." }, { status: 403 });
  }

  return NextResponse.json({
    bigazine: await withBigazineLinks(BIGAZINE_GIFTS),
    havan: HAVAN_GIFTS,
    havanListUrl: HAVAN_LIST_URL,
    chosen:
      confirmation.giftStore && confirmation.giftCode
        ? { store: confirmation.giftStore, code: confirmation.giftCode }
        : null,
  });
}

// Registra o presente escolhido (o convidado clicou no item). O último clique vale.
export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const rl = rateLimit(`gifts-post:${ip}`, 20, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Muitas tentativas. Aguarde um momento." }, { status: 429 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }
  const parsed = giftChoiceSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const confirmation = await getConfirmationByToken(parsed.data.token);
  if (!confirmation) return NextResponse.json({ error: "Link inválido ou revogado." }, { status: 403 });
  if (!hasConfirmedAttendance(confirmation)) {
    return NextResponse.json({ error: "Confirme a presença antes de escolher um presente." }, { status: 403 });
  }

  // O nome vem do catálogo do servidor, nunca do navegador.
  const gift = findGift(parsed.data.store, parsed.data.code);
  if (!gift) return NextResponse.json({ error: "Presente não encontrado na lista." }, { status: 404 });

  await prisma.confirmation.update({
    where: { id: confirmation.id },
    data: { giftStore: gift.store, giftCode: gift.code, giftName: gift.name, giftChosenAt: new Date() },
  });
  logAudit({
    actor: `token:${confirmation.code}`,
    action: "gift.choose",
    confirmationId: confirmation.id,
    after: { store: gift.store, code: gift.code, name: gift.name },
  });
  broadcast("rsvp");
  return NextResponse.json({ ok: true, chosen: { store: gift.store, code: gift.code } });
}
