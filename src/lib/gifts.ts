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
  illustrative?: boolean; // true = a foto é de um produto parecido, não do item exato
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

/**
 * Itens da Bigazine que não têm página no site online com este código:
 * usamos a foto de um produto parecido da própria loja, só como ilustração.
 * Para trocar pela foto real, salve public/presentes/<codigo>.jpg (tem prioridade).
 */
const BIGAZINE_ILLUSTRATIONS: Record<string, string> = {
  "99871": "shopify01-83204-83204-1_ab3a86d4-2aee-4ea8-ba0a-dfe21c0a1f21.jpg",
  "128440": "shopify01-128458-128458_4dcbec47-65f4-48d5-9c28-931326311517.jpg",
  "133078": "shopify01-68160-68160-1_2bf31363-fe31-4d27-98b9-df36830ee477.jpg",
  "107466": "shopify01-108476-108476-1_227c202c-22b4-463a-8d86-142939ec28d3.jpg",
  "107465": "shopify01-107582-107582-1_d7a356bb-6a6c-4b25-a8e3-2a8818fd2050.jpg",
  "134691": "shopify01-110705-110705_b647480a-bda0-4ffd-acee-15ac2e7a32c7.jpg",
  "133174": "shopify01-68175-68175-1_e9dc3ba4-006b-4004-929e-eded8a3f1dab.jpg",
  "119653": "shopify01-84588-84588-1_bb91b9ca-c1e4-4f24-8471-19387968cbbb.jpg",
  "107462": "shopify01-115324-115324-1_cfd6ed84-0f98-43b4-8fb2-452c04bd3f00.jpg",
  "115339": "shopify01-71913-71913-1_72476d12-eec2-439a-bd88-97ce5fb224a8.jpg",
  "122137": "shopify01-122335-122335_3b1a0f5c-e437-4c82-a6cf-978ec8075627.jpg",
  "129905": "shopify01-129904-129904_42bd6e37-c453-41b6-9593-b3b33ffa18d0.jpg",
  "133077": "shopify01-101399-101399-1_7704e6c6-61f6-45b4-a06b-287459d36bad.jpg",
  "133081": "shopify01-73875-73875-1_d526b306-2a46-400b-85ab-caf4ca93ca79.jpg",
  "133082": "shopify01-101398-101398-1_9ea54c46-4b66-40f3-ba67-74db37c52ca2.jpg",
  "133359": "shopify01-70927-70927-1_ff80ddf2-34cf-4c7e-af5a-65b447ae9bc7.jpg",
};
const BIGAZINE_CDN = "https://cdn.shopify.com/s/files/1/0964/7711/8753/files/";

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

for (const g of BIGAZINE_GIFTS) {
  const f = BIGAZINE_ILLUSTRATIONS[g.code];
  if (f) {
    g.image = BIGAZINE_CDN + f;
    g.illustrative = true;
  }
}

const havan = (code: string, name: string, price: number, imageId: string): Gift => ({
  code,
  store: "havan",
  name,
  price,
  url: HAVAN_LIST_URL, // leva à lista da Havan, onde o convidado faz o pagamento
  image: `https://lista.havan.com.br/api/imagem/produto/${imageId}`,
});

/** Itens da lista da Havan (lista 967684): 28 produtos. */
export const HAVAN_GIFTS: Gift[] = [
  havan("1869081", "Manteigueira De Bambu Com Tampa Havan Casa 19 Cm", 19.99, "84befc4d-1d1e-45ef-a9cd-1c45313ea1a2"),
  havan("2249654", "Manteigueira Retangular 15cm Hauskraft", 39.99, "d8b3ea66-bf91-4a30-8b3b-51c9ec80d7ce"),
  havan("2004921", "Bandeja De Bambu Retangular Havan Casa", 99.99, "d897fb67-96d0-49e6-bfd4-255228e58edf"),
  havan("1858191", "Petisqueira Havan Casa Com 5 Divisões 28 cm", 69.99, "98a9df93-4c52-49c2-a6fc-8f7df5b33161"),
  havan("2250677", "Frigideira Malibu 24cm Havan Casa", 49.99, "3a67e9c6-8ea5-45d2-9ec1-77953c6aa503"),
  havan("2065777", "Jogo De Travessas Lisboa Havan Casa 2 Peças", 199.99, "723741bf-3374-4eed-bfc8-57f84bfa1d9f"),
  havan("2116108", "Forma Redonda Antiaderente Lisa Havan Casa 23Cm", 39.99, "526459ac-4d46-484c-b6ae-a91f2256b75b"),
  havan("143794", "Forma Retangular Com Alça E Grelha Havan Casa", 99.99, "06e85ab4-e8b3-4622-ad83-9c3cfc285b88"),
  havan("1597464", "Centro de Mesa com Pé Lyor Deli 32,5cm", 199.99, "c7123714-2bdd-4759-82a3-748fd16ce962"),
  havan("1861575", "Centro De Mesa Com Pé Queen Wolff 25 Cm", 159.99, "12ffcec1-2b19-48f1-b869-57b8a1126b2b"),
  havan("2259241", "Centro De Mesa Com Pé Valência Havan Casa 23,5 cm", 89.99, "27527f37-b1ab-4398-9394-3a299604501c"),
  havan("2259238", "Prato De Bolo Com Pé E Tampa Valência 30 cm Havan Casa", 179.99, "353293f1-01b8-40b6-839c-6433453281e4"),
  havan("1742004", "Bowl de Porcelana Lyor Diamond 380ml", 9.99, "6170efb7-a526-47a4-8db8-757f992be067"),
  havan("1509104", "Pote Hermético Retangular Havan Casa 840ml", 39.99, "8dc2d5da-f98c-4f12-99bd-ce5ef58637f6"),
  havan("1509095", "Pote Hermético Retangular Havan Casa 1,5 Litros", 49.99, "d7eca017-2ed8-48ef-b58d-e36ba64d8b0a"),
  havan("1509105", "Pote Hermético Retangular Havan Casa 370ml", 19.99, "6f24d498-4e4f-46f8-b922-93240ef3fd9f"),
  havan("2263453", "Jogo de Potes Retangulares Camerata 3 Peças Havan Casa", 59.99, "a8408abc-6aae-405f-a402-eb2a7986a1d7"),
  havan("2165249", "Pote Hermético Com Medidor 2,3 Litros Drop Ou", 59.99, "a46856e5-6cb7-47b5-a123-5a5a20d9ac6d"),
  havan("2137192", "Pote Com Medidor New Retro Coza 1,5 Litros", 49.99, "e8660393-1986-4830-9794-6886643b2b42"),
  havan("1527545", "Ralador Com Pote Coletor Oval Inox Havan Casa", 39.99, "a3d619e1-7e7a-4657-8dc8-5c7a80c23aa8"),
  havan("1086439", "Moedor de Pimenta 15cm Finecasa", 39.99, "fa9b4eed-03f6-478b-a138-c9a07e5f72d7"),
  havan("2033514", "Tapete Protetor de Silicone Redondo para Air Fryer 18,5cm Naxos", 14.99, "9638ac90-4d31-4316-a1dd-4f3cef8c1451"),
  havan("2074387", "Faqueiro Positano Inox Lyor 24 Peças", 129.99, "ceb45d72-9e87-4b9c-a96f-b9dfdc505504"),
  havan("2257719", "Panela De Pressão Com Revestimento Cerâmico 4,2 Litros Brinox", 219.99, "067e7e98-5eef-445d-bdc1-84175d9febcc"),
  havan("2265769", "Varal de Parede Sanfonado em Alumínio 1 Metro Mahil", 99.99, "1bcfa9d3-a7a8-41ac-97e3-9bc2a2953c00"),
  havan("2249039", "Cesto De Canto Para Roupas Dobrável Havan Casa 40 Litros", 149.99, "f9f8b0a5-51d7-4571-b81f-e7305c208b46"),
  havan("2264564", "MESA DE PASSAR MULTIFUNCIONAL IDEAL MED MOR", 399.9, "55297de4-e190-44d4-af8d-cd9ea3a606e9"),
  havan("2044025", "Centrífuga Seca Salada 4,5L Alves Plastic", 39.99, "15e92574-983f-4317-b803-07bf7ea7f6a3"),
];

export const ALL_GIFTS: Gift[] = [...BIGAZINE_GIFTS, ...HAVAN_GIFTS];

export function findGift(store: string, code: string): Gift | undefined {
  return ALL_GIFTS.find((g) => g.store === store && g.code === code);
}
