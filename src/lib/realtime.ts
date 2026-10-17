import { prisma } from "./auth";

export type RealtimePayload = {
  type: "rsvp" | "admin";
  at: string;
};

// Barramento simples em memória para Server-Sent Events.
// Cada instância do servidor mantém seus assinantes; em produção multi-instância,
// trocar por Supabase Realtime ou Postgres LISTEN/NOTIFY (documentado no README).
type Listener = (payload: RealtimePayload) => void;
const listeners = new Set<Listener>();

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function broadcast(type: "rsvp" | "admin") {
  const payload: RealtimePayload = { type, at: new Date().toISOString() };
  for (const fn of listeners) {
    try {
      fn(payload);
    } catch {
      listeners.delete(fn);
    }
  }
}

export async function subscribeAndStream(req: Request): Promise<Response> {
  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: string) => {
        try {
          controller.enqueue(encoder.encode(data));
        } catch {
          /* stream fechado */
        }
      };
      send(`retry: 3000\n\n`);
      send(`data: ${JSON.stringify({ type: "hello", at: new Date().toISOString() })}\n\n`);
      unsubscribe = subscribe((payload) => {
        send(`data: ${JSON.stringify(payload)}\n\n`);
      });
      // heartbeat a cada 25s para manter a conexão viva através de proxies
      heartbeat = setInterval(() => send(`: ping\n\n`), 25000);
      // Garante que o cliente receba o estado atual ao conectar
      prisma.auditLog
        .findFirst({ orderBy: { createdAt: "desc" } })
        .then((l) => l && send(`data: ${JSON.stringify({ type: "init", at: l.createdAt.toISOString() })}\n\n`));
    },
    cancel() {
      unsubscribe?.();
      if (heartbeat) clearInterval(heartbeat);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
