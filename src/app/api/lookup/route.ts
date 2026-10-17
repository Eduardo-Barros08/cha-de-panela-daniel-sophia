import { NextRequest } from "next/server";
import { getConfirmationByToken } from "@/lib/data";
import { rateLimit, clientIp } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Consulta de confirmação por token — o token é a credencial; o nome não dá acesso.
export async function GET(req: NextRequest) {
  const ip = clientIp(req);
  const rl = rateLimit(`lookup:${ip}`, 20, 60_000);
  if (!rl.ok) return Response.json({ error: "Muitas consultas. Aguarde um momento." }, { status: 429 });

  const token = req.nextUrl.searchParams.get("t");
  if (!token || token.length < 10) {
    return Response.json({ error: "Link inválido. Confira o endereço ou faça uma nova confirmação." }, { status: 400 });
  }

  const confirmation = await getConfirmationByToken(token);
  if (!confirmation) {
    return Response.json({ error: "Não encontramos uma confirmação para este link." }, { status: 404 });
  }

  const responsible = confirmation.group.members.find((m) => m.role === "responsavel");
  return Response.json({
    responsibleName: responsible?.guest.fullName ?? confirmation.group.name,
    status: confirmation.status,
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
