"use client";

import { useEffect, useState } from "react";

type Gift = { code: string; store: "bigazine" | "havan"; name: string; price?: number; url: string; mapUrl?: string; image?: string; illustrative?: boolean };
type Chosen = { store: string; code: string } | null;
type GiftData = { bigazine: Gift[]; havan: Gift[]; havanListUrl: string; chosen: Chosen };

const PLACEHOLDER = "/presentes/placeholder.svg";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function GiftImage({ gift }: { gift: Gift }) {
  // Foto exata: loja -> arquivo local. Foto ilustrativa: arquivo local (se existir) -> ilustração.
  const local = `/presentes/${gift.code}.jpg`;
  const sources = (gift.illustrative ? [local, gift.image, PLACEHOLDER] : [gift.image, local, PLACEHOLDER]).filter(Boolean) as string[];
  const [i, setI] = useState(0);
  const showingIllustration = !!gift.illustrative && sources[i] === gift.image;
  return (
    <div className="relative">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={sources[i]}
        alt={gift.name}
        loading="lazy"
        className="aspect-square w-full object-cover"
        onError={() => setI((n) => Math.min(n + 1, sources.length - 1))}
      />
      {showingIllustration && (
        <span className="absolute bottom-2 right-2 rounded-full bg-white/85 px-2 py-0.5 text-[10px] text-inox-600">
          Foto ilustrativa
        </span>
      )}
    </div>
  );
}

/**
 * Mensagem de compra + lista de presentes. Só aparece para quem confirmou presença.
 * Clicar em um item abre a loja (Havan: pagamento; Bigazine: localização) e registra a escolha.
 */
export default function GiftSection({ token }: { token: string }) {
  const [data, setData] = useState<GiftData | null>(null);
  const [chosen, setChosen] = useState<Chosen>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/gifts?t=${encodeURIComponent(token)}`, { cache: "no-store" });
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(json.error || "Não foi possível carregar a lista de presentes.");
          return;
        }
        setData(json);
        setChosen(json.chosen);
      } catch {
        if (!cancelled) setError("Falha de conexão ao carregar a lista de presentes.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // Registra a escolha sem atrapalhar a abertura do link (que é feita pelo próprio <a>).
  function registerChoice(gift: Gift) {
    setChosen({ store: gift.store, code: gift.code });
    fetch("/api/gifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, store: gift.store, code: gift.code }),
      keepalive: true,
    }).catch(() => {
      /* se falhar, o convidado ainda consegue abrir a loja; os noivos só não verão a escolha */
    });
  }

  function renderCard(gift: Gift) {
    const selected = chosen?.store === gift.store && chosen?.code === gift.code;
    return (
      <li key={`${gift.store}-${gift.code}`}>
        <div className={`card group flex h-full flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg ${selected ? "ring-2 ring-ink" : ""}`}>
        <a
          href={gift.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => registerChoice(gift)}
          className="block flex-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-inox-400"
          aria-label={`${gift.name} — código ${gift.code}. Abre ${gift.store === "havan" ? "a Havan" : "o produto na Bigazine"} em nova aba`}
        >
          <div className="relative">
            <GiftImage gift={gift} />
            {selected && (
              <span className="absolute left-2 top-2 rounded-full bg-ink px-2.5 py-1 text-[10px] uppercase tracking-wide text-bamboo-50">
                Seu presente
              </span>
            )}
          </div>
          <div className="p-4">
            <p className="text-sm font-medium leading-snug">{gift.name}</p>
            <p className="mt-2 text-xs text-inox-600">Código {gift.code}</p>
            {gift.price !== undefined && <p className="mt-1 text-xs text-inox-600">{brl(gift.price)}</p>}
            <p className="mt-3 text-xs uppercase tracking-[0.14em] text-inox-800 group-hover:underline">
              {gift.store === "havan" ? "Ir para o pagamento →" : "Ver produto na loja →"}
            </p>
          </div>
        </a>
        {gift.mapUrl && (
          <a
            href={gift.mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="border-t border-bamboo-200 px-4 py-2 text-center text-xs text-inox-600 hover:underline"
          >
            Ver localização da loja
          </a>
        )}
        </div>
      </li>
    );
  }

  return (
    <section className="mt-12 animate-fade-up" aria-labelledby="presentes-titulo">
      <div className="rounded-2xl border border-bamboo-200 bg-bamboo-50 p-6 text-center">
        <h2 id="presentes-titulo" className="font-display text-2xl">
          Por favor comprar conforme os códigos. Lista disponível na Loja Havan e Bigazine
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-inox-800">
          Pedimos, por gentileza, que os presentes sejam escolhidos conforme os códigos indicados na lista. Os itens
          estão disponíveis nas lojas Havan e Bigazine. 💚
        </p>
      </div>

      {error && (
        <p role="alert" className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </p>
      )}

      {data && (
        <div className="mt-10 space-y-12">
          <div>
            <h3 className="section-title text-center !text-2xl sm:!text-3xl">Loja Bigazine</h3>
            <p className="mt-2 text-center text-sm text-inox-600">
              Toque no presente para ver o produto na Bigazine. Informe o código ao comprar.
            </p>
            <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {data.bigazine.map(renderCard)}
            </ul>
          </div>

          <div>
            <h3 className="section-title text-center !text-2xl sm:!text-3xl">Loja Havan</h3>
            {data.havan.length > 0 ? (
              <>
                <p className="mt-2 text-center text-sm text-inox-600">
                  Toque no presente para ir ao site da Havan e efetuar o pagamento.
                </p>
                <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {data.havan.map(renderCard)}
                </ul>
              </>
            ) : (
              <div className="mt-6 text-center">
                <a href={data.havanListUrl} target="_blank" rel="noopener noreferrer" className="btn-primary">
                  Ver lista na Havan
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
