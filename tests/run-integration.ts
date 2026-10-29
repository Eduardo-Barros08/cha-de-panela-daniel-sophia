/**
 * Runner de testes de integração via tsx (vitest indisponível neste sandbox).
 * Uso: npx tsx tests/run-integration.ts
 */
import { execSync } from "child_process";
import { PrismaClient } from "@prisma/client";
import { saveRsvp, computeStats, deleteGuest, hasConfirmedAttendance, listGuestRows } from "../src/lib/data";
import { findGift, BIGAZINE_GIFTS } from "../src/lib/gifts";
import { pickBigazineProduct } from "../src/lib/bigazine";
import { rsvpInputSchema } from "../src/lib/validation";

process.env.DATABASE_URL = "file:./test.db";
const prisma = new PrismaClient();

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function main() {
  console.log("Preparando banco de teste (test.db)...");
  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    env: { ...process.env, DATABASE_URL: "file:./test.db" },
    stdio: "pipe",
  });

  console.log("\n[1] Validação de entrada (Zod)");
  const valid = rsvpInputSchema.safeParse({
    responsibleName: "Eduardo Barros da Silva",
    members: [
      { fullName: "Eduardo Barros da Silva", isChild: false, attending: true },
      { fullName: "Ana Camila", isChild: false, attending: true },
      { fullName: "Uilas", isChild: false, attending: false },
      { fullName: "Enzo", isChild: true, attending: true },
    ],
  });
  check("aceita confirmação válida com 4 pessoas e respostas individuais", valid.success);
  check(
    "rejeita nome vazio",
    !rsvpInputSchema.safeParse({ responsibleName: " ", members: [{ fullName: "X Y", isChild: false, attending: true }] }).success
  );
  check(
    "rejeita nome com símbolos/injeção",
    !rsvpInputSchema.safeParse({ responsibleName: "<script>alert(1)</script>", members: [{ fullName: "X Y", isChild: false, attending: true }] }).success
  );
  check(
    "rejeita lista vazia",
    !rsvpInputSchema.safeParse({ responsibleName: "Fulano de Tal", members: [] }).success
  );
  const eleven = Array.from({ length: 11 }, (_, i) => ({ fullName: `Pessoa ${i}`, isChild: false, attending: true }));
  check("rejeita acima de 10 integrantes", !rsvpInputSchema.safeParse({ responsibleName: "Fulano", members: eleven }).success);

  console.log("\n[2] Fluxo principal — salvar confirmação no banco");
  const r1 = await saveRsvp(
    rsvpInputSchema.parse({
      responsibleName: "Eduardo Teste da Silva",
      members: [
        { fullName: "Eduardo Teste da Silva", isChild: false, attending: true },
        { fullName: "Ana Camila Teste", isChild: false, attending: true },
        { fullName: "Uilas Teste", isChild: false, attending: false },
        { fullName: "Enzo Teste", isChild: true, attending: true },
      ],
    }),
    "test:runner"
  );
  const conf = await prisma.confirmation.findUniqueOrThrow({
    where: { id: r1.confirmation.id },
    include: { rsvps: true, group: { include: { members: { include: { guest: true } } } } },
  });
  check("confirmação criada com 4 RSVPs individuais", conf.rsvps.length === 4);
  check("3 confirmados e 1 recusa registrados", conf.rsvps.filter((r) => r.attending === true).length === 3 && conf.rsvps.filter((r) => r.attending === false).length === 1);
  check("status 'parcial' quando parte não vai", conf.status === "parcial");
  check("token de gerenciamento imprevisível (>=20 chars, não numérico)", conf.manageToken.length >= 20 && !/^\d+$/.test(conf.manageToken));
  const ana = conf.group.members.find((m) => m.guest.fullName === "Ana Camila Teste");
  check("acompanhante novo marcado p/ revisão, origem 'convidado'", ana?.guest.needsReview === true && ana?.guest.source === "convidado");

  console.log("\n[3] Edição sem duplicidade");
  await saveRsvp(
    rsvpInputSchema.parse({
      responsibleName: "eduardo teste da silva", // caixa diferente — deve casar
      members: [
        { fullName: "Eduardo Teste da Silva", isChild: false, attending: true },
        { fullName: "Ana Camila Teste", isChild: false, attending: false },
      ],
    }),
    "test:runner"
  );
  const guest = await prisma.guest.findFirstOrThrow({ where: { fullName: "Eduardo Teste da Silva" } });
  const group = await prisma.confirmationGroup.findFirstOrThrow({
    where: { members: { some: { guestId: guest.id } } },
    include: { members: true, confirmations: true },
  });
  check("grupo continua com 4 pessoas (não duplicou)", group.members.length === 4);
  check("uma única confirmação para a família", group.confirmations.length === 1);
  const anaAfter = await prisma.guest.findFirstOrThrow({ where: { fullName: "Ana Camila Teste" } });
  const rsvpAna = await prisma.rsvp.findUniqueOrThrow({ where: { guestId: anaAfter.id } });
  check("resposta da Ana atualizada para 'não vai'", rsvpAna.attending === false);

  console.log("\n[4] Convidado pré-cadastrado reutiliza grupo da lista importada");
  const keila = await prisma.guest.findFirst({ where: { fullName: "Keila" } });
  if (keila) {
    const before = await prisma.confirmationGroup.findFirst({ where: { members: { some: { guestId: keila.id } } } });
    await saveRsvp(
      rsvpInputSchema.parse({
        responsibleName: "keila",
        members: [{ fullName: "Keila", isChild: false, attending: true }],
      }),
      "test:runner"
    );
    const after = await prisma.confirmationGroup.findFirstOrThrow({
      where: { members: { some: { guestId: keila.id } } },
      include: { confirmations: true },
    });
    check("mesmo grupo da lista importada reutilizado", after.id === before?.id);
    check("confirmação única criada", after.confirmations.length === 1);
  } else {
    console.log("  (seed não presente neste banco — pulei)");
  }

  console.log("\n[5] Estatísticas");
  const stats = await computeStats();
  check("confirmados + recusas + pendentes = total", stats.confirmed + stats.declined + stats.pending === stats.totalGuests);
  check("confirmações enviadas <= pessoas (famílias agrupadas)", stats.totalSubmissions <= stats.totalGuests);
  check("adultos + crianças = confirmados", stats.adultsConfirmed + stats.childrenConfirmed === stats.confirmed);

  console.log("\n[6] Presentes");
  check("catálogo Bigazine tem 25 itens com código único", BIGAZINE_GIFTS.length === 25 && new Set(BIGAZINE_GIFTS.map((g) => g.code)).size === 25);
  check("total do catálogo confere com a proposta (R$ 2.535,89)", Math.round(BIGAZINE_GIFTS.reduce((a, g) => a + (g.price ?? 0), 0) * 100) === 253589);
  check("findGift acha por loja+código e rejeita código inexistente", findGift("bigazine", "112568")?.name.startsWith("Aparelho de jantar") === true && !findGift("bigazine", "000"));
  const prods = [
    { url: "https://evil.com/products/x-112568-112568", image: "https://cdn.shopify.com/a.jpg" },
    { url: "/products/outro-1125680-1125680" },
    { url: "/products/aparelho-jantar-112568-112568?pr_prod=1", image: "//cdn.shopify.com/s/files/a.jpg?v=9&width=1" },
  ];
  const picked = pickBigazineProduct(prods, "112568");
  check("resolvedor Bigazine escolhe só o produto exato do domínio da loja", picked?.url === "https://www.bigazine.com.br/products/aparelho-jantar-112568-112568" && picked.image === "https://cdn.shopify.com/s/files/a.jpg?v=9");
  check("resolvedor Bigazine rejeita código inexistente", pickBigazineProduct(prods, "999") === null);
  const confG = await prisma.confirmation.findUniqueOrThrow({ where: { id: r1.confirmation.id }, include: { rsvps: true } });
  check("grupo com alguém confirmado pode escolher presente", hasConfirmedAttendance(confG));
  await prisma.confirmation.update({
    where: { id: confG.id },
    data: { giftStore: "bigazine", giftCode: "112568", giftName: findGift("bigazine", "112568")!.name, giftChosenAt: new Date() },
  });
  const rowsG = await listGuestRows();
  const rowEd = rowsG.find((r) => r.fullName === "Eduardo Teste da Silva");
  check("painel mostra o presente escolhido na linha do convidado", rowEd?.giftCode === "112568" && rowEd?.giftStore === "bigazine");
  const solo = await saveRsvp(
    rsvpInputSchema.parse({ responsibleName: "Fulano Sem Presenca", members: [{ fullName: "Fulano Sem Presenca", isChild: false, attending: false }] }),
    "test:runner"
  );
  const soloConf = await prisma.confirmation.findUniqueOrThrow({ where: { id: solo.confirmation.id }, include: { rsvps: true } });
  check("quem recusou presença NÃO vê/escolhe presente", !hasConfirmedAttendance(soloConf));

  console.log("\n[7] Exclusão de convidado");
  const statsBefore = await computeStats();
  const enzo = await prisma.guest.findFirstOrThrow({ where: { fullName: "Enzo Teste" } });
  const delEnzo = await deleteGuest(enzo.id);
  check("exclui integrante e mantém o grupo", delEnzo?.fullName === "Enzo Teste" && delEnzo.groupRemoved === false);
  check("convidado e resposta foram apagados", (await prisma.guest.findUnique({ where: { id: enzo.id } })) === null && (await prisma.rsvp.findUnique({ where: { guestId: enzo.id } })) === null);
  const statsAfter = await computeStats();
  check("total de convidados diminuiu em 1", statsAfter.totalGuests === statsBefore.totalGuests - 1);
  const edGuest = await prisma.guest.findFirstOrThrow({ where: { fullName: "Eduardo Teste da Silva" } });
  await deleteGuest(edGuest.id); // era o responsável
  const respNow = await prisma.groupMember.findMany({ where: { groupId: group.id, role: "responsavel" } });
  check("ao excluir o responsável, outro integrante assume", respNow.length === 1);
  const rest = await prisma.groupMember.findMany({ where: { groupId: group.id } });
  for (const m of rest) await deleteGuest(m.guestId);
  check("ao excluir o último, grupo e confirmação (com presente) somem", (await prisma.confirmationGroup.findUnique({ where: { id: group.id } })) === null && (await prisma.confirmation.findUnique({ where: { id: confG.id } })) === null);
  check("excluir convidado inexistente retorna null", (await deleteGuest("nao-existe-123456")) === null);

  console.log(`\nResultado: ${pass} passaram, ${fail} falharam`);
  await prisma.$disconnect();
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
