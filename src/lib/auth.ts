import { NextRequest } from "next/server";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET || "dev-secret-insecure-change-me-in-production-0000000000"
);
const COOKIE = "cha_admin_session";
const SESSION_HOURS = 12;

export type AdminSession = { sub: string; email: string; name: string; role: string };

export async function createSessionToken(s: AdminSession) {
  return await new SignJWT(s)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(secret);
}

export async function verifySessionToken(token: string): Promise<AdminSession | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as AdminSession;
  } catch {
    return null;
  }
}

export async function getSession(req: NextRequest): Promise<AdminSession | null> {
  const token = req.cookies.get(COOKIE)?.value;
  if (!token) return null;
  const s = await verifySessionToken(token);
  if (!s) return null;
  // Verifica se a conta continua ativa (revogação de acesso)
  const admin = await prisma.admin.findUnique({ where: { email: s.email } });
  if (!admin || !admin.active) return null;
  return s;
}

export async function requireAdmin(req: NextRequest): Promise<AdminSession | null> {
  return await getSession(req);
}

export async function loginAdmin(email: string, password: string): Promise<AdminSession | null> {
  const admin = await prisma.admin.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!admin || !admin.active) return null;
  const ok = await bcrypt.compare(password, admin.passwordHash);
  if (!ok) return null;
  return { sub: admin.id, email: admin.email, name: admin.name, role: admin.role };
}

export function sessionCookie(token: string) {
  return {
    name: COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  };
}

export function clearSessionCookie() {
  return { ...sessionCookie(""), maxAge: 0 };
}

// ---- Rate limiting simples em memória (por processo). Em produção multi-instância, usar Redis/Upstash.
type Bucket = { count: number; reset: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfter?: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return { ok: true };
  }
  b.count++;
  if (b.count > limit) {
    return { ok: false, retryAfter: Math.ceil((b.reset - now) / 1000) };
  }
  return { ok: true };
}

export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "local";
}

export function logAudit(entry: {
  actor: string;
  action: string;
  guestId?: string | null;
  confirmationId?: string | null;
  before?: unknown;
  after?: unknown;
}) {
  prisma.auditLog
    .create({
      data: {
        actor: entry.actor,
        action: entry.action,
        guestId: entry.guestId ?? null,
        confirmationId: entry.confirmationId ?? null,
        before: entry.before === undefined ? null : JSON.stringify(entry.before),
        after: entry.after === undefined ? null : JSON.stringify(entry.after),
      },
    })
    .catch((e) => console.error("audit log error", e));
}
