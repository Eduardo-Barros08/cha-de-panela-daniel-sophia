import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAudit, prisma } from "@/lib/auth";
import { computeStats, listGuestRows } from "@/lib/data";
import { broadcast } from "@/lib/realtime";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const url = new URL(req.nextUrl);
  const format = url.searchParams.get("format");

  if (format === "csv") {
    // Exportação exige autorização — coberta pelo requireAdmin acima.
    const rows = await listGuestRows();
    const header = "Nome;Categoria;Tipo;Resposta;Grupo;Presente;Origem;Revisao;UltimaAtualizacao";
    const cat: Record<string, string> = {
      familia_noivo: "Família do noivo",
      amigos_noivo: "Amigos do noivo",
      familia_noiva: "Família da noiva",
      amigos_noiva: "Amigos da noiva",
      amigos_noivos: "Amigos dos noivos",
      outros: "Outros",
    };
    const lines = rows.map((r) =>
      [
        r.fullName,
        cat[r.category] ?? r.category,
        r.isChild ? "Criança" : "Adulto",
        r.attending === true ? "Confirmado" : r.attending === false ? "Não irá" : "Pendente",
        r.groupName ?? "-",
        r.giftName ? `${r.giftName} (${r.giftStore === "havan" ? "Havan" : "Bigazine"} ${r.giftCode ?? ""})`.trim() : "-",
        r.source,
        r.needsReview ? "SIM" : "",
        r.updatedAt,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(";")
    );
    logAudit({ actor: `admin:${session.email}`, action: "admin.export.csv" });
    return new NextResponse("\uFEFF" + [header, ...lines].join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="convidados-daniel-sophia.csv"`,
      },
    });
  }

  const [stats, guests] = await Promise.all([computeStats(), listGuestRows()]);
  return NextResponse.json({ stats, guests });
}
