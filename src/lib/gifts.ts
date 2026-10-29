/**
 * Catálogo de presentes do chá de panela.
 *
 * Duas lojas:
 *  - Bigazine (Porto Velho): itens da proposta de 26/10/2026 (válida até 25/11/2026).
 *    O clique leva ao produto em bigazine.com.br; há também link da localização da loja.
 *  - Havan: itens da lista online. O clique leva à lista da Havan para pagamento.
 *
 * IMAGENS: coloque a foto de cada produto em  public/presentes/<codigo>.jpg
 * (ex.: public/presentes/112568.jpg). Se o arquivo não existir, aparece uma imagem padrão.
 */

export type GiftStore = "bigazine" | "havan";

export type Gift = {
  code: string; // código do produto na loja — é o que o convidado deve usar para comprar
  store: GiftStore;
  name: string;
  price?: number; // em reais (opcional)
  url: string; // para onde o clique leva (Bigazine: página do produto; Havan: pagamento)
  mapUrl?: string; // Bigazine: localização da loja
  image?: string; // foto do produto (preenchida automaticamente para a Bigazine)
};

export const STORE_LABELS: Record<GiftStore, string> = {
  bigazine: "Bigazine",
  havan: "Havan",
};

export const HAVAN_LIST_URL = "https://lista.havan.com.br/Convidado/ItensListaPresente/967684?aba=presentes";

export const BIGAZINE_MAPS_URL =
  "https://www.google.com/maps/place/Bigazine+Porto+Velho/@-8.7447143,-63.8680604,17z/data=!3m1!4b1!4m6!3m5!1s0x923243ed46bac109:0xab1a35abb2b466b7!8m2!3d-8.7447143!4d-63.8680604!16s%2Fg%2F11t7vqt50w?entry=ttu&g_ep=EgoyMDI2MTAyNS4wIKXMDSoASAFQAw%3D%3D";

export const BIGAZINE_SITE_URL = "https://www.bigazine.com.br";

const bigazine = (code: string, name: string, price: number): Gift => ({
  code,
  store: "bigazine",
  name,
  price,
  url: `${BIGAZINE_SITE_URL}/search?q=${code}`, // trocado pelo link real do produto no servidor
  mapUrl: BIGAZINE_MAPS_URL,
});

export const BIGAZINE_GIFTS: Gift[] = [
  bigazine("112568", "Aparelho de jantar/chá, 20 peças Eco Aura 9069", 299.9),
  bigazine("99871", "Bandeja para alimentos, formato maçã SNV-G018", 42.9),
  bigazine("128440", "Boleirinha com tampa, borboleta Premium AZ", 89.9),
  bigazine("133078", "Caixa para armazenamento, 430 ml CBT-1147", 19.9),
  bigazine("107466", "Colher vazada de silicone com cabo de madeira, 32,5 × 7 cm", 22.9),
  bigazine("107465", "Concha de silicone com cabo de madeira, 32,5 × 7,5 cm", 22.9),
  bigazine("134691", "Conjunto de tigelas de vidro CBT26-717", 89.9),
  bigazine("133174", "Caixa plástica com tampa CBT26-1144", 19.9),
  bigazine("119653", "Descanso de panela em bambu, 17 cm", 14.9),
  bigazine("107462", "Espátula de silicone com cabo de madeira, 33 cm", 22.9),
  bigazine("130377", "Ferro de passar a seco Arno Drygliss, 127 V", 129.0),
  bigazine("115339", "Forma de silicone, molde de coração 383", 19.99),
  bigazine("122099", "Jogo de copos de vidro, borda decorada, 6 peças, 280 ml Deli", 49.9),
  bigazine("128457", "Jogo de xícaras com pires, 12 peças AZ Glass", 59.9),
  bigazine("122137", "Jogo de jarra 1,8 L + taças 235 ml Luxury Glass", 69.9),
  bigazine("129905", "Jogo de panelas de alumínio, 5 peças Veronese BG Tramontina", 599.9),
  bigazine("104900", "Liquidificador Electrolux 700 W, 1,5 L EBS30, copo de vidro", 499.0),
  bigazine("130359", "Mixer 3 em 1 Power Grey CZ, 127 V", 219.0),
  bigazine("128749", "Pote hermético com tampa de madeira, 1,9 L AZ Glass", 21.9),
  bigazine("133077", "Pote para armazenamento, 950 ml CBT26-1146", 29.9),
  bigazine("133081", "Pote para armazenamento, 10 × 13 cm CBT26-1150", 21.9),
  bigazine("133082", "Pote plástico com tampa, 10 × 19 cm CBT26-1151", 29.9),
  bigazine("133359", "Queijeira de bambu + acessórios", 49.9),
  bigazine("121395", "Travessa quadrada com tampa de bambu, 1,1 L AZ", 39.9),
  bigazine("121394", "Travessa retangular com tampa de bambu, 2,2 L AZ", 49.9),
];

/**
 * Itens da lista da Havan. Preencha com os produtos da lista, um por linha:
 *   { code: "123456", store: "havan", name: "Nome do produto", price: 99.9, url: HAVAN_LIST_URL },
 * Enquanto estiver vazia, o site mostra um cartão único levando à lista completa da Havan.
 */
export const HAVAN_GIFTS: Gift[] = [];

export const ALL_GIFTS: Gift[] = [...BIGAZINE_GIFTS, ...HAVAN_GIFTS];

export function findGift(store: string, code: string): Gift | undefined {
  return ALL_GIFTS.find((g) => g.store === store && g.code === code);
}
