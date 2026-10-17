import { NextRequest, NextResponse } from "next/server";
import { adminLoginSchema } from "@/lib/validation";
import { loginAdmin, createSessionToken, sessionCookie, rateLimit, clientIp, logAudit, prisma } from "@/lib/auth";
import { broadcast } from "@/lib/realtime";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const rl = rateLimit(`login:${ip}`, 5, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Muitas tentativas de login. Aguarde ${rl.retryAfter}s.` },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const parsed = adminLoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "E-mail ou senha inválidos." }, { status: 400 });
  }

  const session = await loginAdmin(parsed.data.email, parsed.data.password);
  if (!session) {
    logAudit({ actor: `ip:${ip}`, action: "admin.login.fail", after: { email: parsed.data.email } });
    return NextResponse.json({ error: "E-mail ou senha inválidos." }, { status: 401 });
  }

  const token = await createSessionToken(session);
  logAudit({ actor: `admin:${session.email}`, action: "admin.login" });
  const res = NextResponse.json({ ok: true, name: session.name });
  res.cookies.set(sessionCookie(token));
  return res;
}

export async function DELETE(req: NextRequest) {
  const s = await prisma.$queryRaw`SELECT 1`.catch(() => null);
  const res = NextResponse.json({ ok: true });
  res.cookies.set({ name: "cha_admin_session", value: "", maxAge: 0, path: "/" });
  return res;
}
