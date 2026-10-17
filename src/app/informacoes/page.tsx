import Link from "next/link";
import { getEvent } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function InformacoesPage() {
  const event = await getEvent();
  if (!event) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-inox-600">Site ainda não configurado.</p>
      </main>
    );
  }

  const dateLabel = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(event.eventDate);

  const mapsQuery = encodeURIComponent(`${event.venueName}, ${event.venueAddress}`);

  return (
    <main className="relative min-h-screen">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-bamboo-100/70 blur-3xl" />
      </div>
      <div className="relative mx-auto max-w-2xl px-5 py-12 sm:py-16">
        <header className="mb-12 text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-inox-600">Chá de Panela</p>
          <h1 className="font-display mt-4 text-5xl text-ink">
            Daniel <span className="text-bamboo-400">&amp;</span> Sophia
          </h1>
          <p className="mt-3 text-sm text-inox-600">Informações do dia</p>
        </header>

        <div className="space-y-6">
          <section className="card p-7">
            <h2 className="font-display text-2xl">Data e horário</h2>
            <p className="mt-3 capitalize text-[15px] text-inox-800">
              {dateLabel}, às {event.eventTime}.
            </p>
            <p className="mt-2 text-sm text-inox-600">
              Chegue com antecedência — a celebração começa em ponto.
            </p>
          </section>

          <section className="card p-7">
            <h2 className="font-display text-2xl">Local</h2>
            <p className="mt-3 text-[15px] text-inox-800">
              {event.venueName}
              <br />
              {event.venueAddress}
              {event.venueDetails ? (
                <>
                  <br />
                  {event.venueDetails}
                </>
              ) : null}
            </p>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary mt-5"
            >
              Ver no mapa
            </a>
          </section>

          {event.extraInfo && (
            <section className="card p-7">
              <h2 className="font-display text-2xl">Informações complementares</h2>
              <p className="mt-3 whitespace-pre-line text-[15px] text-inox-800">{event.extraInfo}</p>
            </section>
          )}

          <section className="card p-7">
            <h2 className="font-display text-2xl">Presente</h2>
            {event.giftRegistryUrl ? (
              <a
                href={event.giftRegistryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary mt-4"
              >
                Ver lista de presentes
              </a>
            ) : (
              <p className="mt-3 text-[15px] text-inox-800">
                {event.giftNotes ??
                  "A lista de presentes será divulgada em breve. Caso deseje enviar o seu presente diretamente para nós, fale com os noivos."}
              </p>
            )}
          </section>

          <section className="card p-7 text-center">
            <h2 className="font-display text-2xl">Ainda não confirmou?</h2>
            <p className="mt-3 text-[15px] text-inox-800">
              Sua presença é o nosso maior presente — mas precisamos saber quantos serão.
            </p>
            {event.rsvpOpen ? (
              <Link href="/confirmar" className="btn-primary mt-5">
                Confirmar presença
              </Link>
            ) : (
              <p className="mt-4 text-sm text-inox-600">As confirmações estão encerradas.</p>
            )}
          </section>
        </div>

        <footer className="mt-12 text-center">
          <Link href="/" className="text-sm text-inox-600 underline underline-offset-4 hover:text-ink">
            Voltar ao início
          </Link>
        </footer>
      </div>
    </main>
  );
}
