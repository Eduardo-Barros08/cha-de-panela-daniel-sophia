import Link from "next/link";
import { getEvent } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const event = await getEvent();
  if (!event) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="card max-w-md p-8 text-center">
          <p className="text-inox-600">Site ainda não configurado. Acesse o painel administrativo.</p>
          <Link href="/admin" className="btn-secondary mt-6">
            Painel dos noivos
          </Link>
        </main>
      );
  }

  const dateLabel = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(event.eventDate);

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* fundo decorativo */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-[480px] w-[820px] -translate-x-1/2 rounded-full bg-bamboo-100/70 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-bamboo-200/40 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-3xl px-5 py-14 sm:py-20">
        {/* Cabeçalho */}
        <header className="animate-fade-up text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-inox-600">Chá de Panela</p>
          <h1 className="font-display mt-6 text-6xl leading-none text-ink sm:text-7xl">
            Daniel <span className="text-bamboo-400">&amp;</span> Sophia
          </h1>
          <div className="ornament mt-8 text-xl">🌿</div>
          <p className="mx-auto mt-6 max-w-xl text-[15px] leading-relaxed text-inox-800">
            {event.welcomeMessage}
          </p>
        </header>

        {/* Versículo */}
        <section className="animate-fade-up delay-1 mt-12 text-center">
          <blockquote className="mx-auto max-w-xl">
            <p className="font-display text-2xl italic leading-snug text-inox-800">
              “{event.bibleVerseText}”
            </p>
            <footer className="mt-3 text-xs uppercase tracking-[0.25em] text-inox-600">
              {event.bibleVerseRef}
            </footer>
          </blockquote>
        </section>

        {/* Data e local */}
        <section className="animate-fade-up delay-2 mt-14 grid gap-5 sm:grid-cols-2">
          <div className="card p-7 text-center">
            <p className="label">Data</p>
            <p className="font-display mt-2 text-2xl capitalize">{dateLabel}</p>
            <p className="mt-1 text-sm text-inox-600">às {event.eventTime}</p>
          </div>
          <a
            href={"https://www.google.com/maps/place/Condom%C3%ADnio+Total+Ville+I/@-8.7919503,-63.8541169,17z/data=!3m1!4b1!4m6!3m5!1s0x92325b856ae9dc29:0xb09edcd56e41a11f!8m2!3d-8.7919503!4d-63.8541169!16s%2Fg%2F11c5stp898?entry=ttu&g_ep=EgoyMDI2MTAxNC4wIKXMDSoASAFQAw%3D%3D"}
            target="_blank"
            rel="noopener noreferrer"
            className="card block p-7 text-center transition-transform duration-200 hover:-translate-y-1"
          >
            <p className="label">Local</p>
            <p className="font-display mt-2 text-2xl">{event.venueName}</p>
            <p className="mt-1 text-sm text-inox-600">
              {event.venueAddress}
              {event.venueDetails ? ` — ${event.venueDetails}` : ""}
            </p>
            <p className="mt-3 text-xs uppercase tracking-[0.2em] text-inox-600">Ver no mapa ↗</p>
          </a>
        </section>

        {/* Ações */}
        <section className="animate-fade-up delay-3 mt-14 text-center">
          {event.rsvpOpen ? (
            <div className="flex flex-col items-center gap-4">
              <Link href="/confirmar" className="btn-primary w-full sm:w-auto">
                Confirmar presença
              </Link>
              <Link href="/minha-confirmacao" className="text-sm text-inox-600 underline underline-offset-4 hover:text-ink">
                Já confirmei? Consultar ou editar minha resposta
              </Link>
            </div>
          ) : (
            <p className="card mx-auto max-w-md p-5 text-sm text-inox-600">
              As confirmações estão encerradas. Fale com Daniel ou Sophia para alterar sua resposta.
            </p>
          )}
        </section>

        {/* Links complementares */}
        <section className="animate-fade-up delay-4 mt-14 grid gap-4 sm:grid-cols-2">
          <Link href="/informacoes" className="card p-6 transition hover:shadow-md">
            <p className="font-display text-xl">Informações &amp; localização</p>
            <p className="mt-1 text-sm text-inox-600">Como chegar, horários e detalhes do dia.</p>
          </Link>
          {event.giftRegistryUrl ? (
            <a
              href={event.giftRegistryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="card p-6 transition hover:shadow-md"
            >
              <p className="font-display text-xl">Lista de presentes</p>
              <p className="mt-1 text-sm text-inox-600">Veja a lista sugerida pelos noivos.</p>
            </a>
          ) : (
            <div className="card p-6 opacity-80">
              <p className="font-display text-xl">Lista de presentes</p>
              <p className="mt-1 text-sm text-inox-600">{event.giftNotes ?? "Em breve."}</p>
            </div>
          )}
        </section>

        <footer className="mt-16 text-center">
          <p className="font-display text-xl italic text-inox-600">“{event.thanksMessage}”</p>
          <p className="mt-6 text-[11px] uppercase tracking-[0.3em] text-inox-400">
            {event.coupleNames} · {new Date(event.eventDate).getFullYear()}
          </p>
        </footer>
      </div>
    </main>
  );
}
