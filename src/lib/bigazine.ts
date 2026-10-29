/**
 * Descobre, no site da Bigazine (loja Shopify), o link e a foto de cada produto pelo código.
 * Nunca lança erro: se o site não responder, o item mantém o link de busca e a foto padrão.
 */
import type { Gift } from "./gifts";

const SITE = "https://www.bigazine.com.br";
const IMAGE_HOSTS = ["cdn.shopify.com", "www.bigazine.com.br", "bigazine.com.br"];

type SuggestProduct = { url?: string; handle?: string; image?: string; featured_image?: { url?: string } };
export type Resolved = { url: string; image?: string };

function cleanImage(raw?: string): string | undefined {
  if (!raw) return undefined;
  try {
    const u = new URL(raw.startsWith("//") ? `https:${raw}` : raw);
    if (u.protocol !== "https:" || !IMAGE_HOSTS.includes(u.hostname)) return undefined;
    u.search = u.searchParams.get("v") ? `?v=${u.searchParams.get("v")}` : "";
    return u.toString();
  } catch {
    return undefined;
  }
}

/** Escolhe, entre os resultados da busca, o produto cujo link termina com o código. */
export function pickBigazineProduct(products: SuggestProduct[], code: string): Resolved | null {
  const re = new RegExp(`-${code}(?:-|$)`);
  for (const p of products) {
    try {
      const u = new URL(p.url || `/products/${p.handle ?? ""}`, SITE);
      if (u.protocol !== "https:" || u.hostname !== "www.bigazine.com.br") continue;
      if (!u.pathname.startsWith("/products/") || !re.test(u.pathname)) continue;
      return { url: `${SITE}${u.pathname}`, image: cleanImage(p.image || p.featured_image?.url) };
    } catch {
      /* ignora item inválido */
    }
  }
  return null;
}

const cache = new Map<string, { at: number; value: Resolved | null }>();
const OK_MS = 24 * 3600_000;
const FAIL_MS = 10 * 60_000;

async function resolveOne(code: string): Promise<Resolved | null> {
  const hit = cache.get(code);
  if (hit && Date.now() - hit.at < (hit.value ? OK_MS : FAIL_MS)) return hit.value;
  let value: Resolved | null = null;
  try {
    const res = await fetch(
      `${SITE}/search/suggest.json?q=${encodeURIComponent(code)}&resources[type]=product&resources[limit]=5`,
      { signal: AbortSignal.timeout(4000), headers: { Accept: "application/json" } }
    );
    if (res.ok) {
      const json = await res.json();
      value = pickBigazineProduct(json?.resources?.results?.products ?? [], code);
    }
  } catch {
    /* sem rede / timeout: usa o fallback */
  }
  cache.set(code, { at: Date.now(), value });
  return value;
}

export async function withBigazineLinks(gifts: Gift[]): Promise<Gift[]> {
  try {
    const found = await Promise.all(gifts.map((g) => resolveOne(g.code)));
    return gifts.map((g, i) => ({ ...g, url: found[i]?.url ?? g.url, image: found[i]?.image ?? g.image, illustrative: found[i]?.image ? false : g.illustrative }));
  } catch {
    return gifts;
  }
}
