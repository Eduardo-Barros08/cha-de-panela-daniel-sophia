import { getEvent } from "@/lib/data";
import ConfirmarClient from "./ConfirmarClient";

export const dynamic = "force-dynamic";

export default async function ConfirmarPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t } = await searchParams;
  const event = await getEvent();
  return (
    <main className="relative min-h-screen">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-bamboo-100/70 blur-3xl" />
      </div>
      <div className="relative mx-auto max-w-3xl px-5 py-12 sm:py-16">
        <header className="mb-12 text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-inox-600">Chá de Panela</p>
          <h1 className="font-display mt-4 text-5xl text-ink">
            Daniel <span className="text-bamboo-400">&amp;</span> Sophia
          </h1>
        </header>
        <ConfirmarClient
          rsvpOpen={event?.rsvpOpen ?? false}
          maxMembers={event?.maxMembersPerRsvp ?? 10}
          initialToken={t}
        />
      </div>
    </main>
  );
}
