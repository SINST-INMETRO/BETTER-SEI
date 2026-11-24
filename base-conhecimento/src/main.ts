/**
 * Entrada do content script da Base de Conhecimento em pastas.
 *
 * Decide pela tela (`base_conhecimento_listar` monta; `base_conhecimento_pesquisar`
 * ganha o atalho "Ver pastas"), respeita o liga/desliga da página de opções e
 * devolve a tela nativa em qualquer falha. Só leitura nos itens do SEI; a única
 * escrita é o Texto Padrão da árvore, pela sincronia.
 */

import { areaChrome } from "@comum/armazenamento/area";
import { idDispositivo } from "@comum/armazenamento/dispositivo";
import { lerOpcaoLegada, opcaoLegadaLigada } from "@comum/opcoes/legadas";
import { travarComLocks, travarEsperando } from "@comum/sincronia/trava";
import { criarAbrirModal, criarConfirmar } from "@comum/ui/dialogo";
import { linkDoMenu } from "@nucleo/links/links";
import { lerContexto } from "@nucleo/sei";
import { criarHttp } from "@nucleo/sessao/http";
import { paginaDe } from "@nucleo/sessao/pagina";
import { caminhoDaPasta, type PastaExibida } from "./arvore/mesclar";
import { lerItensDaUnidade } from "./nucleo/itens";
import { armazemDoTexto } from "./pagina/armazem";
import { montar, telaAtual } from "./pagina/montar";
import cssPainel from "./ui/painel.css";

const OPCAO = "baseconhecimento";
const MARCA = "data-seipro-base-conhecimento";

let desfazer: (() => void) | null = null;
let montando = false;

const pagina = () => paginaDe(document, location.href);

/** Escolha da pasta de destino por prompt numerado (v1; o diálogo próprio vem depois). */
function escolherPasta(pastas: PastaExibida[], atual: string | null): { pasta: string | null } | null {
  const opcoes: Array<{ id: string | null; rotulo: string }> = [{ id: null, rotulo: "Sem pasta" }];
  const indexar = (lista: PastaExibida[]): void => {
    for (const p of lista) {
      opcoes.push({ id: p.id, rotulo: caminhoDaPasta(pastas, p.id) });
      indexar(p.filhas);
    }
  };
  indexar(pastas);
  const indiceAtual = opcoes.findIndex((o) => o.id === atual);
  const lista = opcoes.map((o, i) => `${i} = ${o.rotulo}`).join("\n");
  const resposta = window.prompt(`Mover para qual pasta?\n${lista}`, String(indiceAtual < 0 ? 0 : indiceAtual));
  if (resposta === null) return null;
  const n = Number(resposta.trim());
  const escolha = Number.isInteger(n) ? opcoes[n] : undefined;
  return escolha ? { pasta: escolha.id } : null;
}

/** Na tela de pesquisa, um atalho para a lista (onde a árvore vive). */
function injetarAtalho(): void {
  try {
    if (document.querySelector("#sproBcAtalho")) return;
    const href = linkDoMenu(pagina(), "base_conhecimento_listar");
    const alvo = document.querySelector("#frmBaseConhecimento") ?? document.querySelector("#divInfraAreaTelaD form");
    if (!alvo) return;
    const a = document.createElement("a");
    a.id = "sproBcAtalho";
    a.href = href;
    a.textContent = "Ver pastas";
    a.className = "infraButton";
    a.style.marginLeft = "8px";
    alvo.appendChild(a);
  } catch {
    // Sem o item no menu desta tela: nada a injetar.
  }
}

async function iniciar(): Promise<void> {
  if (montando) return;
  montando = true;
  try {
    const ctx = lerContexto(pagina());
    const area = areaChrome(chrome.storage.local, "local");
    const sync = areaChrome(chrome.storage.sync, "sync");
    const confirmar = criarConfirmar(criarAbrirModal());
    const sessao = { http: criarHttp(location.href), linkMenu: (acao: string) => linkDoMenu(pagina(), acao) };
    desfazer = await montar({
      doc: document,
      url: location.href,
      area,
      sync,
      ident: { host: ctx.host, unidade: ctx.unidade.id },
      contexto: {
        login: ctx.usuario.login,
        nome: ctx.usuario.nome,
        unidade: { id: ctx.unidade.id, sigla: ctx.unidade.sigla },
      },
      lerItens: () => lerItensDaUnidade(sessao),
      armazem: () => armazemDoTexto(document, location.href),
      perguntar: (texto, ok, nao) => confirmar(texto, ok, nao),
      pedirTexto: (rotulo, inicial) => window.prompt(rotulo, inicial ?? ""),
      confirmar: (texto) => window.confirm(texto),
      escolherPasta,
      avisar: (texto) => console.warn("[SEI Pro] base-conhecimento:", texto),
      idDispositivo: await idDispositivo(area),
      cssPainel,
      janela: window,
      docEventos: document,
      travar: travarComLocks,
      travarEsperando,
    });
  } finally {
    montando = false;
  }
}

async function partir(): Promise<void> {
  const tela = telaAtual();
  if (!tela) return;
  document.documentElement.setAttribute(MARCA, "");
  if (tela === "pesquisar") {
    injetarAtalho();
    return;
  }

  let ligada = true;
  try {
    ligada = await lerOpcaoLegada(OPCAO);
  } catch {
    ligada = true;
  }
  if (ligada) await iniciar().catch((e) => console.warn("[SEI Pro] base-conhecimento:", e));

  chrome.storage.onChanged.addListener((m, area) => {
    if (area !== "sync" || !("dataValues" in m)) return;
    const agora = opcaoLegadaLigada(m.dataValues?.newValue, OPCAO);
    if (!agora) {
      desfazer?.();
      desfazer = null;
    } else if (!desfazer) {
      void iniciar().catch((e) => console.warn("[SEI Pro] base-conhecimento:", e));
    }
  });
}

void partir();
