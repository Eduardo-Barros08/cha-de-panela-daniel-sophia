"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import GiftSection from "@/components/GiftSection";

type Member = { fullName: string; isChild: boolean; attending: boolean | null };
type Lookup = { responsibleName: string; status: string; updatedAt: string; members: Member[] };

export default function MinhaConfirmacaoClient({ token }: { token?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(token ?? "");
  const [data, setData] = useState<Lookup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(token));

  async function lookup(t: string) {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch(`/api/lookup?t=${encodeURIComponent(t)}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Não foi possível consultar.");
        return;
      }
      setData(json);
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) lookup(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const label = (a: boolean | null) =>
    a === true ? "Vai comparecer" : a === false ? "Não vai comparecer" : "Pendente";

  return (
    <div className="mx-auto max-w-2xl">
      <div className="card p-6 sm:p-8">
        <label htmlFor="token" className="label">
          Link ou código de gerenciamento
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="token"
            className="input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Cole aqui o link que você recebeu ao confirmar"
          />
          <button
            type="button"
            className="btn-primary shrink-0"
            onClick={() => value.trim() && lookup(value.trim())}
            disabled={loading}
          >
            {loading ? "Consultando…" : "Consultar"}
          </button>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-inox-600">
          Por segurança, a consulta exige o link exclusivo que apareceu na tela de confirmação (ou foi
          enviado a você). Quem conhece apenas o nome não consegue acessar os dados.
        </p>
      </div>

      {error && (
        <div role="alert" className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </div>
      )}

      {data && (
        <div className="mt-8 animate-fade-up">
          <div className="card p-6 sm:p-8">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="label">Responsável</p>
                <p className="font-display text-2xl">{data.responsibleName}</p>
              </div>
              <p className="text-xs text-inox-600">
                Última atualização: {" "}
                {new Date(data.updatedAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
              </p>
            </div>

            <ul className="mt-6 divide-y divide-bamboo-100">
              {data.members.map((m, i) => (
                <li key={i} className="flex items-center justify-between py-3">
                  <span>
                    {m.fullName}
                    {m.isChild && <span className="ml-2 text-xs text-inox-600">(criança)</span>}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs ${
                      m.attending === true
                        ? "bg-bamboo-100 text-inox-800"
                        : m.attending === false
                          ? "bg-inox-100 text-inox-600"
                          : "bg-amber-50 text-amber-800"
                    }`}
                  >
                    {label(m.attending)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              className="btn-primary"
              onClick={() => router.push(`/confirmar?t=${encodeURIComponent(value.trim())}`)}
            >
              Editar minha confirmação
            </button>
            <Link href="/" className="btn-secondary">
              Voltar ao início
            </Link>
          </div>

          {data.members.some((m) => m.attending === true) && <GiftSection token={value.trim()} />}
        </div>
      )}
    </div>
  );
}
