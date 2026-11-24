/**
 * Montagem da Base de Conhecimento em pastas na tela nativa.
 *
 * Lê os itens, sobe a árvore, liga a sincronia (Texto Padrão da unidade) e
 * monta o painel em Shadow DOM, a coluna "Pasta" e o botão "Pastas". As
 * operações de escrita pedem o "Entendi" na primeira vez e nunca tocam nos itens
 * do SEI: só em pastas e vínculos.
 *
 * As perguntas de UI (nome, confirmação, escolha de pasta, aviso) são injetadas
 * — o main usa prompt/confirm e o diálogo; os testes usam fakes.
 */

import type { Area } from "@comum/armazenamento/area";
import type { ArmazemTexto } from "@comum/sincronia/controlePagina";
import type { Travar, TravarEsperando } from "@comum/sincronia/trava";
import { caminhoDaPasta, type Exibicao, montarExibicao, type PastaExibida, vinculosDesatualizados } from "../arvore/mesclar";
import type { EntidadesArvore, IdentidadeArvore } from "../arvore/modelo";
import { RepositorioArvore } from "../arvore/repositorio";
import { agrupadorDoTr } from "../nucleo/itens";
import type { ItemBase } from "../nucleo/tipos";
import { garantirBotaoPastas, ID_BOTAO, type Modo } from "../ui/botao";
import { atualizarCaption, filtrarPorPasta, ligarAoSortDaTabela, pintarPastas, prepararTabela } from "../ui/colunaPasta";
import { type AcoesPainel, montarPainel } from "../ui/painel";
import { armazemNaTela } from "./armazem";
import { consentimentoBase, type Perguntar, perguntarEntendi } from "./consentir";
import { ligarSincronia, type SincroniaBase } from "./sincronia";

export function telaAtual(url = globalThis.location?.href ?? ""): "listar" | "pesquisar" | null {
  let acao: string | null = null;
  try {
    acao = new URL(url).searchParams.get("acao");
  } catch {
    return null;
  }
  return acao === "base_conhecimento_listar" ? "listar" : acao === "base_conhecimento_pesquisar" ? "pesquisar" : null;
}

export interface DepsMontar {
  doc: Document;
  url: string;
  area: Area;
  sync: Area;
  ident: IdentidadeArvore;
  contexto: { login: string; nome?: string; unidade: { id: string; sigla: string } };
  lerItens: () => Promise<ItemBase[]>;
  armazem: () => ArmazemTexto;
  perguntar: Perguntar;
  pedirTexto: (rotulo: string, valorInicial?: string) => string | null;
  confirmar: (texto: string) => boolean;
  escolherPasta: (pastas: PastaExibida[], atual: string | null) => { pasta: string | null } | null;
  avisar: (texto: string) => void;
  idDispositivo: string;
  cssPainel: string;
  janela: Pick<EventTarget, "addEventListener">;
  docEventos: Pick<EventTarget, "addEventListener"> & { readonly visibilityState: DocumentVisibilityState };
  agora?: () => number;
  travar?: Travar;
  travarEsperando?: TravarEsperando;
}

/** Monta tudo e devolve o desfazer. Nunca rejeita: falha de leitura devolve a tela nativa. */
export async function montar(d: DepsMontar): Promise<() => void> {
  const doc = d.doc;
  const agora = d.agora ?? (() => Date.now());

  let itens: ItemBase[];
  try {
    itens = await d.lerItens();
  } catch (e) {
    console.warn("[SEI Pro] base-conhecimento: nao foi possivel ler a lista:", e);
    return () => undefined;
  }

  const repo = new RepositorioArvore({
    area: d.area,
    ident: d.ident,
    carimbo: () => ({ agora: agora(), dispositivo: d.idDispositivo }),
  });

  // Atualiza o título em cache dos vínculos (o real manda).
  for (const v of vinculosDesatualizados(await repo.listar(), itens)) {
    const item = itens.find((i) => i.agrupador === v.id);
    if (item) await repo.moverVinculo(v.id, v.pasta, item.titulo);
  }

  let ent: EntidadesArvore = await repo.listar();
  let exibicao: Exibicao = montarExibicao(ent, itens);
  let selecionada: string | null = exibicao.pastas[0]?.id ?? null;
  let busca = "";
  let modo: Modo = "arvore";

  let sync: SincroniaBase | null = null;
  try {
    sync = ligarSincronia({
      ctx: { host: d.ident.host, login: d.contexto.login, nome: d.contexto.nome },
      unidade: d.contexto.unidade,
      area: d.area,
      sync: d.sync,
      repo,
      armazem: d.armazem,
      travar: d.travar ?? (async (_nome, fn) => fn()),
      travarEsperando: d.travarEsperando ?? (async (_nome, fn) => fn()),
      janela: d.janela,
      doc: d.docEventos,
      temArmazem: () => armazemNaTela(doc, d.url),
    });
  } catch (e) {
    console.warn("[SEI Pro] base-conhecimento: sincronia nao ligada:", e);
  }

  const acoes: AcoesPainel = {
    aoSelecionar: (id) => {
      selecionada = id;
      render();
    },
    aoNovaPasta: (pai) => void novaPasta(pai),
    aoRenomear: (id) => void renomear(id),
    aoExcluir: (id) => void excluir(id),
    aoMoverItem: (agrupador) => void moverItem(agrupador),
    aoRemoverItem: (agrupador) => void esquecer(agrupador),
    aoBuscar: (texto) => {
      busca = texto;
      render();
    },
  };

  const painel = montarPainel(acoes, { doc, css: d.cssPainel });
  const areaTabela = doc.querySelector("#divInfraAreaTabela");
  let wrapper: HTMLElement | null = null;
  if (areaTabela?.parentNode) {
    wrapper = doc.createElement("div");
    wrapper.className = "d-flex align-items-start";
    areaTabela.parentNode.insertBefore(wrapper, areaTabela);
    wrapper.append(painel.host, areaTabela);
  }
  prepararTabela(doc, agrupadorDoTr);
  garantirBotaoPastas(doc, d.area, (m) => {
    modo = m;
    painel.host.style.display = m === "arvore" ? "" : "none";
    aplicarFiltro();
  });
  const desligarSort = ligarAoSortDaTabela(doc, () => aplicarFiltro());

  async function garantirConsentimento(): Promise<boolean> {
    const porta = consentimentoBase(d.sync, d.ident.host, d.contexto.login, d.contexto.unidade.id);
    if ((await porta.estado()) === "ligado") return true;
    const aceitou = await perguntarEntendi(d.perguntar, d.contexto.unidade.sigla);
    if (!aceitou) {
      d.avisar('Sem o "Entendi", a organizacao nao e gravada no SEI.');
      return false;
    }
    await porta.definir("ligado");
    return true;
  }

  async function refrescar(): Promise<void> {
    ent = await repo.listar();
    exibicao = montarExibicao(ent, itens);
    render();
  }

  async function novaPasta(pai: string | null): Promise<void> {
    const nome = d.pedirTexto("Nome da pasta", "");
    if (nome === null) return;
    if (!(await garantirConsentimento())) return;
    try {
      await repo.criarPasta(nome, pai);
      await refrescar();
    } catch (e) {
      d.avisar(e instanceof Error ? e.message : String(e));
    }
  }

  async function renomear(id: string): Promise<void> {
    const atual = nomesDasPastas().get(id) ?? "";
    const nome = d.pedirTexto("Renomear pasta", atual);
    if (nome === null) return;
    if (!(await garantirConsentimento())) return;
    try {
      await repo.renomearPasta(id, nome);
      await refrescar();
    } catch (e) {
      d.avisar(e instanceof Error ? e.message : String(e));
    }
  }

  async function excluir(id: string): Promise<void> {
    if (!d.confirmar('Excluir a pasta? Os itens dela voltam para "Sem pasta".')) return;
    if (!(await garantirConsentimento())) return;
    await repo.excluirPasta(id);
    if (selecionada === id) selecionada = null;
    await refrescar();
  }

  async function moverItem(agrupador: string): Promise<void> {
    const vinculo = ent.v.find((v) => v.id === agrupador && v.removidoEm === undefined);
    const escolha = d.escolherPasta(exibicao.pastas, vinculo?.pasta ?? null);
    if (!escolha) return;
    if (!(await garantirConsentimento())) return;
    const item = itens.find((i) => i.agrupador === agrupador);
    await repo.moverVinculo(agrupador, escolha.pasta, item?.titulo ?? vinculo?.titulo ?? "");
    await refrescar();
  }

  async function esquecer(agrupador: string): Promise<void> {
    if (!d.confirmar("Esquecer este vinculo? O item continua no SEI.")) return;
    if (!(await garantirConsentimento())) return;
    await repo.removerVinculo(agrupador);
    await refrescar();
  }

  function nomesDasPastas(): Map<string, string> {
    const mapa = new Map<string, string>();
    const indexar = (lista: PastaExibida[]): void => {
      for (const p of lista) {
        mapa.set(p.id, p.nome);
        indexar(p.filhas);
      }
    };
    indexar(exibicao.pastas);
    return mapa;
  }

  function agrupadoresDaPasta(id: string | null): Set<string> {
    if (id === null) return new Set(exibicao.semPasta.map((i) => i.agrupador));
    return new Set(ent.v.filter((v) => v.removidoEm === undefined && v.pasta === id).map((v) => v.id));
  }

  function rotuloDe(agrupador: string): string {
    const vinculo = ent.v.find((v) => v.id === agrupador && v.removidoEm === undefined);
    if (!vinculo || vinculo.pasta === null) return "Sem pasta";
    return caminhoDaPasta(exibicao.pastas, vinculo.pasta) || "Sem pasta";
  }

  function aplicarFiltro(): void {
    pintarPastas(doc, rotuloDe);
    if (modo === "lista" || busca.trim() !== "") {
      const filtro =
        busca.trim() === ""
          ? null
          : new Set(itens.filter((i) => i.titulo.toLowerCase().includes(busca.trim().toLowerCase())).map((i) => i.agrupador));
      filtrarPorPasta(doc, filtro);
      atualizarCaption(doc, filtro === null ? itens.length : itens.filter((i) => filtro.has(i.agrupador)).length);
      return;
    }
    const conjunto = agrupadoresDaPasta(selecionada);
    filtrarPorPasta(doc, conjunto);
    atualizarCaption(doc, itens.filter((i) => conjunto.has(i.agrupador)).length);
  }

  function render(): void {
    painel.render({
      pastas: exibicao.pastas,
      semPasta: exibicao.semPasta,
      orfaos: exibicao.orfaos,
      selecionada,
      busca,
    });
    aplicarFiltro();
  }

  render();

  return () => {
    desligarSort();
    sync?.parar();
    painel.destruir();
    if (wrapper?.parentNode && areaTabela) wrapper.parentNode.insertBefore(areaTabela, wrapper);
    wrapper?.remove();
    doc.querySelector(`#${ID_BOTAO}`)?.remove();
    filtrarPorPasta(doc, null);
    atualizarCaption(doc, itens.length);
  };
}
