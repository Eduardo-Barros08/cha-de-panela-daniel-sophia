import { NextRequest, NextResponse } from "next/server";
import { rsvpInputSchema } from "@/lib/validation";
import { rateLimit, clientIp, logAudit } from "@/lib/auth";
import { saveRsvp, getConfirmationByToken, normalizeName } from "@/lib/data";
import { prisma } from "@/lib/auth";
import { broadcast } from "@/lib/realtime";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const rl = rateLimit(`rsvp:${ip}`, 8, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Muitas tentativas. Aguarde ${rl.retryAfter}s e tente novamente.` },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const parsed = rsvpInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Dados inválidos.", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // Edição via token: o corpo pode trazer manageToken para atualizar confirmação existente
  const manageToken = typeof (body as { manageToken?: string }).manageToken === "string"
    ? (body as { manageToken: string }).manageToken
    : undefined;

  try {
    if (manageToken) {
      const confirmation = await getConfirmationByToken(manageToken);
      if (!confirmation) {
        return NextResponse.json({ error: "Link de gerenciamento inválido ou revogado." }, { status: 403 });
      }
      // Token válido: autoriza a edição do próprio grupo
      const result = await saveRsvp(parsed.data, `token:${confirmation.code}`);
      broadcast("rsvp");
      return NextResponse.json({
        ok: true,
        code: result.confirmation.code,
        manageToken: confirmation.manageToken,
        message: "Confirmação atualizada com sucesso!",
      });
    }

    // Primeiro envio
    const result = await saveRsvp(parsed.data, `ip:${ip}`);
    broadcast("rsvp");
    return NextResponse.json({
      ok: true,
      code: result.confirmation.code,
      manageToken: result.confirmation.manageToken,
      message: "Confirmação registrada com sucesso! Agradecemos por responder e esperamos celebrar esse momento especial com você.",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao salvar a confirmação.";
    logAudit({ actor: `ip:${ip}`, action: "rsvp.error", after: { error: msg } });
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

// Consulta segura: exige o token de gerenciamento; conhecer o nome não dá acesso.
export async function GET(req: NextRequest) {
  const ip = clientIp(req);
  const rl = rateLimit(`rsvp-get:${ip}`, 15, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Muitas consultas. Aguarde um momento." }, { status: 429 });

  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Token obrigatório." }, { status: 400 });

  const confirmation = await getConfirmationByToken(token);
  if (!confirmation) return NextResponse.json({ error: "Confirmação não encontrada." }, { status: 404 });

  const responsible = confirmation.group.members.find((m) => m.role === "responsavel");
  return NextResponse.json({
    ok: true,
    responsibleName: responsible?.guest.fullName ?? confirmation.group.name,
    email: confirmation.email,
    updatedAt: confirmation.updatedAt,
    members: confirmation.group.members.map((m) => {
      const rsvp = confirmation.rsvps.find((r) => r.guestId === m.guestId);
      return {
        fullName: m.guest.fullName,
        isChild: m.guest.isChild,
        attending: rsvp ? rsvp.attending : null,
      };
    }),
  });
}
