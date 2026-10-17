import { NextRequest } from "next/server";
import { getEvent, computeStats } from "@/lib/data";

export const dynamic = "force-dynamic";

// Informações públicas do evento (sem dados pessoais dos convidados).
export async function GET(_req: NextRequest) {
  const event = await getEvent();
  if (!event) return Response.json({ error: "Evento não configurado." }, { status: 404 });
  return Response.json({
    coupleNames: event.coupleNames,
    eventName: event.eventName,
    eventDate: event.eventDate,
    eventTime: event.eventTime,
    venueName: event.venueName,
    venueAddress: event.venueAddress,
    venueDetails: event.venueDetails,
    welcomeMessage: event.welcomeMessage,
    bibleVerseRef: event.bibleVerseRef,
    bibleVerseText: event.bibleVerseText,
    thanksMessage: event.thanksMessage,
    giftRegistryUrl: event.giftRegistryUrl,
    giftNotes: event.giftNotes,
    extraInfo: event.extraInfo,
    rsvpOpen: event.rsvpOpen,
    rsvpDeadline: event.rsvpDeadline,
  });
}

// Contador público: apenas totais agregados, sem nomes.
export async function POST() {
  const stats = await computeStats();
  return Response.json({
    confirmed: stats.confirmed,
    pending: stats.pending,
    responseRate: stats.responseRate,
  });
}
