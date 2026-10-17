import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { subscribeAndStream } from "@/lib/realtime";

export const dynamic = "force-dynamic";

// Stream de atualização em tempo real do painel administrativo.
// Acesso restrito a admins autenticados — sem sessão, o stream nem abre.
export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) {
    return new Response("Não autorizado.", { status: 401 });
  }
  return subscribeAndStream(req);
}
