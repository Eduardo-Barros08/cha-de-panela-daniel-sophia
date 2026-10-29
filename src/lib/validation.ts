import { z } from "zod";

export const CATEGORY_LABELS: Record<string, string> = {
  familia_noivo: "Família do noivo",
  amigos_noivo: "Amigos do noivo",
  familia_noiva: "Família da noiva",
  amigos_noiva: "Amigos da noiva",
  amigos_noivos: "Amigos dos noivos",
  outros: "Outros",
};

const nameSchema = z
  .string()
  .trim()
  .min(2, "Informe o nome completo.")
  .max(120, "Nome muito longo.")
  .regex(/^[\p{L}\p{M}'\.\-\s]+$/u, "O nome só pode conter letras, espaços, apóstrofo, hífen e ponto.");

export const rsvpInputSchema = z.object({
  responsibleName: nameSchema,
  email: z.string().trim().email("E-mail inválido.").max(160).optional().or(z.literal("")),
  members: z
    .array(
      z.object({
        fullName: nameSchema,
        isChild: z.boolean().default(false),
        attending: z.boolean(),
      })
    )
    .min(1, "Inclua pelo menos uma pessoa na confirmação.")
    .max(10, "Limite de 10 integrantes por confirmação. Fale com os noivos para exceções."),
});

export type RsvpInput = z.infer<typeof rsvpInputSchema>;

export const adminLoginSchema = z.object({
  email: z.string().trim().email("E-mail inválido."),
  password: z.string().min(6, "A senha deve ter ao menos 6 caracteres.").max(128),
});

export const adminGuestUpdateSchema = z.object({
  guestId: z.string().min(10),
  fullName: nameSchema.optional(),
  category: z.enum(["familia_noivo", "amigos_noivo", "familia_noiva", "amigos_noiva", "amigos_noivos", "outros"]).optional(),
  isChild: z.boolean().optional(),
  active: z.boolean().optional(),
  needsReview: z.boolean().optional(),
  attending: z.boolean().nullable().optional(),
});

export const adminEventUpdateSchema = z.object({
  coupleNames: z.string().trim().min(2).max(120).optional(),
  eventName: z.string().trim().min(2).max(120).optional(),
  eventDate: z.string().datetime().optional(),
  eventTime: z.string().trim().min(3).max(20).optional(),
  venueName: z.string().trim().min(2).max(160).optional(),
  venueAddress: z.string().trim().min(2).max(240).optional(),
  venueDetails: z.string().trim().max(240).optional(),
  welcomeMessage: z.string().trim().max(1200).optional(),
  bibleVerseRef: z.string().trim().max(80).optional(),
  bibleVerseText: z.string().trim().max(400).optional(),
  thanksMessage: z.string().trim().max(600).optional(),
  giftRegistryUrl: z.string().trim().url("URL inválida.").max(300).nullable().optional().or(z.literal("")),
  giftNotes: z.string().trim().max(600).nullable().optional().or(z.literal("")),
  extraInfo: z.string().trim().max(1200).nullable().optional().or(z.literal("")),
  rsvpOpen: z.boolean().optional(),
  rsvpDeadline: z.string().datetime().nullable().optional(),
  maxMembersPerRsvp: z.number().int().min(1).max(30).optional(),
});

export const adminGuestDeleteSchema = z.object({
  guestId: z.string().min(10),
});

export const giftChoiceSchema = z.object({
  token: z.string().min(10).max(100),
  store: z.enum(["bigazine", "havan"]),
  code: z.string().min(1).max(40),
});
