import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifySessionToken, prisma } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Guarda de rota: sem sessão válida e ativa, o painel nem renderiza.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const store = await cookies();
  const token = store.get("cha_admin_session")?.value;
  let ok = false;
  if (token) {
    const session = await verifySessionToken(token);
    if (session) {
      const admin = await prisma.admin.findUnique({ where: { email: session.email } });
      ok = Boolean(admin?.active);
    }
  }
  if (!ok) redirect("/admin/login");
  return <>{children}</>;
}
