"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Member = { fullName: string; isChild: boolean; attending: boolean | null };

const STEPS = ["Nomes", "Respostas", "Revisão"] as const;

export default function ConfirmarClient({
  rsvpOpen,
  maxMembers,
  initialToken,
}: {
  rsvpOpen: boolean;
  maxMembers: number;
  initialToken?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [responsibleName, setResponsibleName] = useState("");
  const [email, setEmail] = useState("");
  const [members, setMembers] = useState<Member[]>([{ fullName: "", isChild: false, attending: null }]);
  const [manageToken, setManageToken] = useState<string | null>(initialToken ?? null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ manageToken: string; message: string } | null>(null);

  const isEditing = Boolean(manageToken);

  const allNamed = useMemo(
    () => members.every((m) => m.fullName.trim().length >= 2),
    [members]
  );
  const allAnswered = useMemo(() => members.every((m) => m.attending !== null), [members]);

  if (!rsvpOpen && !isEditing) {
    return (
      <div className="card mx-auto max-w-md p-8 text-center">
        <p className="text-inox-600">As confirmações estão encerradas.</p>
        <Link href="/" className="btn-secondary mt-6">
          Voltar ao início
        </Link>
      </div>
    );
  }

  function setMember(i: number, patch: Partial<Member>) {
    setMembers((prev) => prev.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  }

  function addMember() {
    if (members.length >= maxMembers) return;
    setMembers((prev) => [...prev, { fullName: "", isChild: false, attending: null }]);
  }

  function removeMember(i: number) {
    setMembers((prev) => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)));
  }

  function validateStep0(): string[] {
    const errs: string[] = [];
    if (responsibleName.trim().length < 2) errs.push("Informe o seu nome completo.");
    members.forEach((m, i) => {
      if (m.fullName.trim().length < 2) errs.push(`Informe o nome da pessoa ${i + 1} do grupo.`);
    });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.push("E-mail inválido.");
    return errs;
  }

  function goToAnswers() {
    const errs = validateStep0();
    setFieldErrors(errs);
    if (errs.length === 0) setStep(1);
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        responsibleName: responsibleName.trim(),
        email: email.trim() || undefined,
        manageToken: manageToken || undefined,
        members: members.map((m) => ({
          fullName: m.fullName.trim(),
          isChild: m.isChild,
          attending: m.attending === true,
        })),
      };
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Não foi possível salvar. Verifique os dados e tente novamente.");
        return;
      }
      setDone({ manageToken: data.manageToken, message: data.message });
    } catch {
      setError("Falha de conexão. Seus dados continuam preenchidos — tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="card mx-auto max-w-lg p-10 text-center animate-fade-up">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-bamboo-100 text-2xl">
          ✓
        </div>
        <h1 className="font-display mt-6 text-3xl">Confirmação registrada!</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-inox-800">{done.message}</p>
        <div className="mt-8 rounded-xl bg-bamboo-50 p-5 text-left">
          <p className="label">Guarde este link para consultar ou editar depois</p>
          <code className="mt-1 block break-all rounded bg-white px-3 py-2 text-xs text-inox-800">
            {typeof window !== "undefined"
              ? `${window.location.origin}/minha-confirmacao?t=${done.manageToken}`
              : ""}
          </code>
          <p className="mt-2 text-xs text-inox-600">
            Sugestão: salve esta página nos favoritos ou tire um print. Só quem tem este link consegue ver
            e editar a confirmação do seu grupo.
          </p>
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/" className="btn-primary">
            Voltar ao início
          </Link>
          <Link href="/informacoes" className="btn-secondary">
            Ver informações do evento
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Indicador de etapas */}
      <ol className="mb-10 flex items-center justify-center gap-2 sm:gap-4" aria-label="Etapas">
        {STEPS.map((label, i) => (
          <li key={label} className="flex items-center gap-2 sm:gap-4">
            <div
              className={`flex items-center gap-2 ${i <= step ? "text-ink" : "text-inox-400"}`}
              aria-current={i === step ? "step" : undefined}
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs ${
                  i < step
                    ? "border-ink bg-ink text-bamboo-50"
                    : i === step
                      ? "border-ink bg-white text-ink"
                      : "border-inox-200 bg-white text-inox-400"
                }`}
              >
                {i < step ? "✓" : i + 1}
              </span>
              <span className="hidden text-xs uppercase tracking-[0.15em] sm:inline">{label}</span>
            </div>
            {i < STEPS.length - 1 && <span className="h-px w-6 bg-bamboo-300 sm:w-10" aria-hidden />}
          </li>
        ))}
      </ol>

      {error && (
        <div role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Etapa 1 — nomes */}
      {step === 0 && (
        <section className="animate-fade-up">
          <h2 className="section-title text-center">Quem vai com você?</h2>
          <p className="mt-3 text-center text-[15px] text-inox-600">
            Estamos muito felizes por celebrar esse momento com você! Informe seu nome e os nomes das
            pessoas que irão com você.
          </p>

          <div className="card mt-8 space-y-6 p-6 sm:p-8">
            <div>
              <label htmlFor="responsible" className="label">
                Seu nome completo *
              </label>
              <input
                id="responsible"
                className="input"
                value={responsibleName}
                onChange={(e) => setResponsibleName(e.target.value)}
                placeholder="Ex.: Eduardo Barros da Silva"
                autoComplete="name"
                maxLength={120}
              />
            </div>

            <div>
              <label htmlFor="email" className="label">
                E-mail para contato (opcional)
              </label>
              <input
                id="email"
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Usamos apenas se precisarmos falar com você sobre a confirmação"
                autoComplete="email"
                maxLength={160}
              />
            </div>

            <div className="space-y-4">
              <p className="label mb-0">Pessoas do seu grupo (incluindo você) *</p>
              {members.map((m, i) => (
                <div key={i} className="rounded-xl border border-bamboo-200/80 bg-bamboo-50/50 p-4">
                  <div className="flex items-center gap-3">
                    <label htmlFor={`name-${i}`} className="sr-only">
                      Nome da pessoa {i + 1}
                    </label>
                    <input
                      id={`name-${i}`}
                      className="input"
                      value={m.fullName}
                      onChange={(e) => setMember(i, { fullName: e.target.value })}
                      placeholder={i === 0 ? "Você (nome completo)" : "Nome completo do acompanhante"}
                      maxLength={120}
                    />
                    {members.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMember(i)}
                        className="shrink-0 rounded-full border border-inox-200 px-3 py-2 text-xs text-inox-600 transition hover:border-red-300 hover:text-red-600"
                        aria-label={`Remover pessoa ${i + 1}`}
                      >
                        Remover
                      </button>
                    )}
                  </div>
                  <label className="mt-3 inline-flex items-center gap-2 text-sm text-inox-600">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-bamboo-300"
                      checked={m.isChild}
                      onChange={(e) => setMember(i, { isChild: e.target.checked })}
                    />
                    É criança
                  </label>
                </div>
              ))}

              {members.length < maxMembers ? (
                <button type="button" onClick={addMember} className="btn-secondary w-full">
                  + Adicionar familiar ou acompanhante
                </button>
              ) : (
                <p className="text-center text-xs text-inox-600">
                  Limite de {maxMembers} integrantes por confirmação atingido. Fale com os noivos para
                  exceções.
                </p>
              )}
            </div>

            {fieldErrors.length > 0 && (
              <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <ul className="list-disc space-y-1 pl-4">
                  {fieldErrors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </div>
            )}

            <button type="button" onClick={goToAnswers} className="btn-primary w-full">
              Continuar
            </button>
          </div>
        </section>
      )}

      {/* Etapa 2 — respostas individuais */}
      {step === 1 && (
        <section className="animate-fade-up">
          <h2 className="section-title text-center">Cada um vai comparecer?</h2>
          <p className="mt-3 text-center text-[15px] text-inox-600">
            Responda individualmente para cada pessoa do seu grupo.
          </p>

          <div className="mt-8 space-y-4">
            {members.map((m, i) => (
              <div key={i} className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{m.fullName}</p>
                  {m.isChild && <p className="text-xs text-inox-600">Criança</p>}
                </div>
                <fieldset className="flex gap-2" aria-label={`Presença de ${m.fullName}`}>
                  <legend className="sr-only">Presença de {m.fullName}</legend>
                  <button
                    type="button"
                    onClick={() => setMember(i, { attending: true })}
                    aria-pressed={m.attending === true}
                    className={`rounded-full px-5 py-2 text-sm transition ${
                      m.attending === true
                        ? "bg-ink text-bamboo-50"
                        : "border border-inox-200 bg-white text-inox-600 hover:border-ink hover:text-ink"
                    }`}
                  >
                    Vai comparecer
                  </button>
                  <button
                    type="button"
                    onClick={() => setMember(i, { attending: false })}
                    aria-pressed={m.attending === false}
                    className={`rounded-full px-5 py-2 text-sm transition ${
                      m.attending === false
                        ? "bg-inox-800 text-bamboo-50"
                        : "border border-inox-200 bg-white text-inox-600 hover:border-ink hover:text-ink"
                    }`}
                  >
                    Não vai comparecer
                  </button>
                </fieldset>
              </div>
            ))}
          </div>

          {!allAnswered && (
            <p className="mt-4 text-center text-sm text-inox-600">
              Responda para todas as pessoas para continuar.
            </p>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
            <button type="button" onClick={() => setStep(0)} className="btn-secondary">
              Voltar e corrigir
            </button>
            <button type="button" onClick={() => allAnswered && setStep(2)} disabled={!allAnswered} className="btn-primary">
              Revisar
            </button>
          </div>
        </section>
      )}

      {/* Etapa 3 — revisão */}
      {step === 2 && (
        <section className="animate-fade-up">
          <h2 className="section-title text-center">Confira antes de enviar</h2>

          <div className="card mt-8 overflow-hidden">
            <table className="w-full text-sm">
              <caption className="sr-only">Resumo das respostas do seu grupo</caption>
              <thead>
                <tr className="border-b border-bamboo-200 bg-bamboo-50/60 text-left">
                  <th scope="col" className="px-5 py-3 font-medium">Pessoa</th>
                  <th scope="col" className="px-5 py-3 font-medium">Resposta</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m, i) => (
                  <tr key={i} className="border-b border-bamboo-100 last:border-0">
                    <td className="px-5 py-3">
                      {m.fullName}
                      {m.isChild && <span className="ml-2 text-xs text-inox-600">(criança)</span>}
                    </td>
                    <td className="px-5 py-3">
                      {m.attending ? (
                        <span className="text-inox-800">Vai comparecer</span>
                      ) : (
                        <span className="text-inox-400">Não vai comparecer</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {error && (
            <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
            <button type="button" onClick={() => setStep(1)} className="btn-secondary">
              Voltar e corrigir
            </button>
            <button type="button" onClick={submit} disabled={submitting} className="btn-primary">
              {submitting ? "Enviando…" : "Enviar confirmação"}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
