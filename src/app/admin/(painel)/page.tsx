"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Stats = {
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

type GuestRow = {
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
  giftName: string | null;
  giftStore: string | null;
  giftCode: string | null;
  updatedAt: string;
};

const CATEGORIES: Record<string, string> = {
  familia_noivo: "Família do noivo",
  amigos_noivo: "Amigos do noivo",
  familia_noiva: "Família da noiva",
  amigos_noiva: "Amigos da noiva",
  amigos_noivos: "Amigos dos noivos",
  outros: "Outros",
};

function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="card p-5">
      <p className="label mb-1">{label}</p>
      <p className="font-display text-3xl text-ink">{value}</p>
      {hint && <p className="mt-1 text-xs text-inox-600">{hint}</p>}
    </div>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [guests, setGuests] = useState<GuestRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [answerFilter, setAnswerFilter] = useState<"all" | "yes" | "no" | "pending">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [reviewOnly, setReviewOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const PAGE_SIZE = 50;

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/data", { cache: "no-store" });
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      const data = await res.json();
      setStats(data.stats);
      setGuests(data.guests);
      setLastSync(new Date().toLocaleTimeString("pt-BR"));
      setError(null);
    } catch {
      setError("Falha ao carregar dados.");
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  // Tempo real: SSE reabre automaticamente ao cair; cada evento dispara recarga.
  useEffect(() => {
    let closed = false;
    function connect() {
      if (closed) return;
      const es = new EventSource("/api/admin/realtime");
      esRef.current = es;
      es.onmessage = (ev) => {
        const payload = JSON.parse(ev.data);
        if (payload.type === "rsvp" || payload.type === "admin") load();
      };
      es.onerror = () => {
        es.close();
        setTimeout(connect, 3000);
      };
    }
    connect();
    return () => {
      closed = true;
      esRef.current?.close();
    };
  }, [load]);

  const filtered = useMemo(() => {
    let rows = guests;
    const q = search.trim().toLowerCase();
    if (q) rows = rows.filter((r) => r.fullName.toLowerCase().includes(q) || (r.groupName ?? "").toLowerCase().includes(q));
    if (answerFilter === "yes") rows = rows.filter((r) => r.attending === true);
    if (answerFilter === "no") rows = rows.filter((r) => r.attending === false);
    if (answerFilter === "pending") rows = rows.filter((r) => r.attending === null);
    if (categoryFilter !== "all") rows = rows.filter((r) => r.category === categoryFilter);
    if (reviewOnly) rows = rows.filter((r) => r.needsReview);
    return rows;
  }, [guests, search, answerFilter, categoryFilter, reviewOnly]);

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  async function updateGuest(guestId: string, patch: Partial<GuestRow> & { attending?: boolean | null }) {
    setBusyId(guestId);
    try {
      const res = await fetch("/api/admin/guests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestId, ...patch }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erro ao salvar.");
        return;
      }
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function deleteGuest(g: GuestRow) {
    const ok = confirm(
      `Excluir "${g.fullName}" definitivamente?\n\nIsso apaga a pessoa e a resposta dela. Se ela for a última do grupo, a confirmação e o presente escolhido também somem.\n\nEsta ação não pode ser desfeita.`
    );
    if (!ok) return;
    setBusyId(g.id);
    try {
      const res = await fetch("/api/admin/guests", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestId: g.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erro ao excluir.");
        return;
      }
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    router.push("/admin/login");
  }

  async function exportCsv() {
    const res = await fetch("/api/admin/data?format=csv");
    if (!res.ok) {
      setError("Não foi possível exportar.");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "convidados-daniel-sophia.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-bamboo-50/60">
      <header className="border-b border-bamboo-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-inox-600">Painel dos noivos</p>
            <h1 className="font-display text-2xl">Daniel &amp; Sophia — Chá de Panela</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-inox-600 sm:inline">
              {lastSync ? `Atualizado às ${lastSync}` : "Carregando…"}
              <span className="ml-2 inline-flex h-2 w-2 rounded-full bg-green-500" title="Tempo real ativo" />
            </span>
            <button onClick={exportCsv} className="btn-secondary !px-5 !py-2 !text-xs">Exportar CSV</button>
            <button onClick={logout} className="btn-secondary !px-5 !py-2 !text-xs">Sair</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8">
        {error && (
          <div role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {/* Indicadores */}
        {stats && (
          <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Convidados" value={stats.totalGuests} hint={`${stats.totalGroups} grupos`} />
            <StatCard label="Confirmados" value={stats.confirmed} hint={`${stats.adultsConfirmed} adultos · ${stats.childrenConfirmed} crianças`} />
            <StatCard label="Não vão" value={stats.declined} />
            <StatCard label="Pendentes" value={stats.pending} />
            <StatCard label="Confirmações" value={stats.totalSubmissions} hint="formulários enviados" />
            <StatCard label="Respostas" value={`${stats.responseRate}%`} hint="da lista total" />
          </section>
        )}

        {/* Filtros */}
        <section className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            className="input sm:max-w-xs"
            placeholder="Buscar por nome ou grupo…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            aria-label="Buscar convidado"
          />
          <select
            className="input sm:max-w-[190px]"
            value={answerFilter}
            onChange={(e) => {
              setAnswerFilter(e.target.value as typeof answerFilter);
              setPage(1);
            }}
            aria-label="Filtrar por resposta"
          >
            <option value="all">Todas as respostas</option>
            <option value="yes">Confirmados</option>
            <option value="no">Não vão</option>
            <option value="pending">Pendentes</option>
          </select>
          <select
            className="input sm:max-w-[210px]"
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filtrar por grupo"
          >
            <option value="all">Todos os grupos</option>
            {Object.entries(CATEGORIES).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <label className="inline-flex items-center gap-2 text-sm text-inox-600">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-bamboo-300"
              checked={reviewOnly}
              onChange={(e) => setReviewOnly(e.target.checked)}
            />
            Só revisar ({guests.filter((g) => g.needsReview).length})
          </label>
        </section>

        {/* Tabela */}
        <section className="card mt-5 overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <caption className="sr-only">Lista de convidados</caption>
            <thead>
              <tr className="border-b border-bamboo-200 bg-bamboo-50/60 text-left">
                <th scope="col" className="px-4 py-3 font-medium">Nome</th>
                <th scope="col" className="px-4 py-3 font-medium">Grupo</th>
                <th scope="col" className="px-4 py-3 font-medium">Categoria</th>
                <th scope="col" className="px-4 py-3 font-medium">Resposta</th>
                <th scope="col" className="px-4 py-3 font-medium">Presente do grupo</th>
                <th scope="col" className="px-4 py-3 font-medium">Origem</th>
                <th scope="col" className="px-4 py-3 font-medium text-right">Ações rápidas</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((g) => (
                <tr key={g.id} className="border-b border-bamboo-100 last:border-0">
                  <td className="px-4 py-3">
                    {g.fullName}
                    {g.isChild && <span className="ml-2 text-xs text-inox-600">(criança)</span>}
                    {g.needsReview && (
                      <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-amber-800">
                        revisar
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-inox-600">{g.groupName ?? "—"}</td>
                  <td className="px-4 py-3 text-inox-600">{CATEGORIES[g.category] ?? g.category}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs ${
                        g.attending === true
                          ? "bg-bamboo-100 text-inox-800"
                          : g.attending === false
                            ? "bg-inox-100 text-inox-600"
                            : "bg-amber-50 text-amber-800"
                      }`}
                    >
                      {g.attending === true ? "Confirmado" : g.attending === false ? "Não vai" : "Pendente"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {g.giftName ? (
                      <>
                        <span className="text-inox-800">{g.giftName}</span>
                        <span className="mt-0.5 block text-inox-600">
                          {g.giftStore === "havan" ? "Havan" : "Bigazine"} · código {g.giftCode}
                        </span>
                      </>
                    ) : (
                      <span className="text-inox-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-inox-600">
                    {g.source === "importado" ? "Lista inicial" : g.source === "convidado" ? "Informado pelo convidado" : "Admin"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      <button
                        disabled={busyId === g.id}
                        onClick={() => updateGuest(g.id, { attending: true })}
                        className="rounded-full border border-inox-200 px-2.5 py-1 text-xs hover:border-ink"
                        title="Marcar como confirmado"
                      >
                        ✓
                      </button>
                      <button
                        disabled={busyId === g.id}
                        onClick={() => updateGuest(g.id, { attending: false })}
                        className="rounded-full border border-inox-200 px-2.5 py-1 text-xs hover:border-ink"
                        title="Marcar como não irá"
                      >
                        ✗
                      </button>
                      <button
                        disabled={busyId === g.id}
                        onClick={() => updateGuest(g.id, { attending: null })}
                        className="rounded-full border border-inox-200 px-2.5 py-1 text-xs hover:border-ink"
                        title="Marcar como pendente"
                      >
                        ↺
                      </button>
                      <button
                        disabled={busyId === g.id}
                        onClick={() => {
                          const novo = prompt("Nome completo:", g.fullName);
                          if (novo && novo.trim().length >= 2) updateGuest(g.id, { fullName: novo.trim() });
                        }}
                        className="rounded-full border border-inox-200 px-2.5 py-1 text-xs hover:border-ink"
                        title="Editar nome"
                      >
                        ✎
                      </button>
                      <button
                        disabled={busyId === g.id}
                        onClick={() => updateGuest(g.id, { needsReview: !g.needsReview })}
                        className="rounded-full border border-inox-200 px-2.5 py-1 text-xs hover:border-ink"
                        title={g.needsReview ? "Remover marcação de revisão" : "Marcar para revisão"}
                      >
                        ⚑
                      </button>
                      <button
                        disabled={busyId === g.id}
                        onClick={() => deleteGuest(g)}
                        className="rounded-full border border-red-200 px-2.5 py-1 text-xs text-red-700 hover:border-red-500 hover:bg-red-50"
                        title="Excluir convidado"
                        aria-label={`Excluir ${g.fullName}`}
                      >
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-inox-600">
                    Nenhum convidado encontrado com esses filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {totalPages > 1 && (
          <div className="mt-5 flex items-center justify-between text-sm text-inox-600">
            <span>
              {filtered.length} convidados · página {page} de {totalPages}
            </span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="btn-secondary !px-4 !py-1.5 !text-xs">
                Anterior
              </button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="btn-secondary !px-4 !py-1.5 !text-xs">
                Próxima
              </button>
            </div>
          </div>
        )}

        <p className="mt-8 text-xs leading-relaxed text-inox-600">
          Tempo real ativo: a lista e os totais se atualizam sozinhos quando um convidado confirma.
          Marcações “revisar” indicam pessoas adicionadas pelos convidados que não estavam na lista
          original — confirme os nomes e remova a marcação com ⚑.
        </p>
      </div>
    </main>
  );
}
