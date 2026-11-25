/**
 * "Nova em contexto": intenção de uso único (a pasta escolhida) gravada ao
 * clicar em Nova, consumida no retorno do cadastro. Fica no chrome.storage.local,
 * expira em 10 minutos e só vale para o mesmo host/unidade. Nunca toca no SEI.
 */

import type { Area } from "@comum/armazenamento/area";
import type { IdentidadeArvore } from "../arvore/modelo";

export interface Intencao {
  host: string;
  unidade: string;
  pastaId: string;
  /** Caminho na hora do clique (para a faixa e os avisos). */
  caminho: string;
  criadoEm: number;
}

export const CHAVE_INTENCAO = "spro_bc_nova_pasta";
export const TTL_INTENCAO_MS = 10 * 60_000;

export async function gravarIntencao(
  area: Area,
  ident: IdentidadeArvore,
  pastaId: string,
  caminho: string,
  agora = Date.now(),
): Promise<void> {
  await area.gravar({
    [CHAVE_INTENCAO]: { host: ident.host, unidade: ident.unidade, pastaId, caminho, criadoEm: agora },
  });
}

function comoIntencao(v: unknown): Intencao | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Partial<Intencao>;
  if (
    typeof o.host !== "string" ||
    typeof o.unidade !== "string" ||
    typeof o.pastaId !== "string" ||
    typeof o.caminho !== "string" ||
    typeof o.criadoEm !== "number" ||
    !Number.isFinite(o.criadoEm)
  ) {
    return null;
  }
  return { host: o.host, unidade: o.unidade, pastaId: o.pastaId, caminho: o.caminho, criadoEm: o.criadoEm };
}

/** Válida (mesma identidade e dentro do TTL); null se ausente ou inválida. */
export async function lerIntencao(area: Area, ident: IdentidadeArvore, agora = Date.now()): Promise<Intencao | null> {
  const intencao = comoIntencao((await area.obter(CHAVE_INTENCAO))[CHAVE_INTENCAO]);
  if (!intencao) return null;
  if (intencao.host !== ident.host || intencao.unidade !== ident.unidade) return null;
  if (agora - intencao.criadoEm > TTL_INTENCAO_MS) return null;
  return intencao;
}

export async function limparIntencao(area: Area): Promise<void> {
  await area.remover(CHAVE_INTENCAO);
}

const ID_NUMERICO = /^\d+$/;

/** `{ id }` quando a URL é o retorno de criação; null nos demais casos. */
export function sinalDeCriacao(url: string): { id: string } | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const p = u.searchParams;
  if (p.get("acao") !== "base_conhecimento_listar") return null;
  if (p.get("acao_origem") !== "base_conhecimento_cadastrar") return null;
  if (p.get("resultado") !== "1") return null;
  const id = p.get("id_base_conhecimento");
  if (!id || !ID_NUMERICO.test(id)) return null;
  return { id };
}
