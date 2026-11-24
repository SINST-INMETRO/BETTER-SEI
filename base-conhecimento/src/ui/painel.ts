/**
 * Painel de pastas em Shadow DOM: árvore com subpastas, contagens, "Sem pasta"
 * (com os itens ainda não organizados) e órfãos riscados.
 *
 * A UI só lê o modelo e emite intenções (as `AcoesPainel`); quem fala com o SEI
 * e com o repositório é o main (T10). Nunca innerHTML com dado: títulos vão por
 * textContent.
 */

import { icone } from "@comum/ui/dom";
import type { PastaExibida } from "../arvore/mesclar";
import type { Vinculo } from "../arvore/modelo";
import type { ItemBase } from "../nucleo/tipos";

export interface EstadoPainel {
  pastas: PastaExibida[];
  semPasta: ItemBase[];
  orfaos: Vinculo[];
  selecionada: string | null;
  busca: string;
  /** Faixa de aviso (ex.: "Indisponível nesta unidade"). */
  aviso?: string;
  /** Itens da pasta selecionada (para mover de pasta). */
  itensDaSelecionada?: ItemBase[];
}

export interface AcoesPainel {
  aoSelecionar(id: string | null): void;
  aoNovaPasta(pai: string | null): void;
  aoRenomear(id: string): void;
  aoExcluir(id: string): void;
  aoMoverItem(agrupador: string): void;
  aoRemoverItem(agrupador: string): void;
  aoBuscar(texto: string): void;
}

export interface OpcoesPainel {
  doc?: Document;
  /** O CSS do painel (o main importa painel.css como texto; os testes passam o arquivo). */
  css?: string;
}

export function montarPainel(
  acoes: AcoesPainel,
  o: OpcoesPainel = {},
): { host: HTMLElement; render(estado: EstadoPainel): void; destruir(): void } {
  const doc = o.doc ?? document;
  const host = doc.createElement("div");
  host.className = "spro-bc-host";
  const raiz = host.attachShadow({ mode: "open" });

  if (o.css) {
    const estilo = doc.createElement("style");
    estilo.textContent = o.css;
    raiz.appendChild(estilo);
  }

  const painel = doc.createElement("div");
  painel.className = "painel";

  const topo = doc.createElement("div");
  topo.className = "topo";
  const titulo = doc.createElement("span");
  titulo.className = "titulo";
  titulo.textContent = "Pastas";
  const nova = doc.createElement("button");
  nova.type = "button";
  nova.className = "nova";
  nova.setAttribute("aria-label", "Nova pasta");
  nova.textContent = "＋ Nova pasta";
  nova.addEventListener("click", () => acoes.aoNovaPasta(null));
  const busca = doc.createElement("input");
  busca.type = "search";
  busca.className = "busca";
  busca.placeholder = "Buscar…";
  busca.setAttribute("aria-label", "Buscar na árvore");
  busca.addEventListener("input", () => acoes.aoBuscar(busca.value));
  topo.append(titulo, nova, busca);

  const arvore = doc.createElement("div");
  arvore.className = "arvore";

  const avisoEl = doc.createElement("div");
  avisoEl.className = "aviso";
  avisoEl.setAttribute("role", "status");
  avisoEl.hidden = true;

  const itensPasta = doc.createElement("div");
  itensPasta.className = "itens-pasta";

  const nota = doc.createElement("div");
  nota.className = "nota";
  nota.textContent = "Use Mover para… nos itens. No menu ⋯ da pasta: renomear, nova subpasta, excluir.";

  painel.append(topo, avisoEl, arvore, itensPasta, nota);
  raiz.appendChild(painel);

  let atual: EstadoPainel = { pastas: [], semPasta: [], orfaos: [], selecionada: null, busca: "" };

  const el = (tag: string, classe?: string): HTMLElement => {
    const e = doc.createElement(tag);
    if (classe) e.className = classe;
    return e;
  };

  const combina = (texto: string): boolean => {
    const b = atual.busca.trim().toLowerCase();
    return b === "" || texto.toLowerCase().includes(b);
  };
  const pastaCombina = (p: PastaExibida): boolean => combina(p.nome) || p.filhas.some(pastaCombina);

  function linhaPasta(p: PastaExibida): HTMLElement {
    const li = el("li");
    const linha = el("div", "linha");
    const botao = el("button", "pasta");
    botao.setAttribute("type", "button");
    if (atual.selecionada === p.id) botao.setAttribute("aria-current", "true");
    const ic = icone("pasta", 18, doc);
    ic.setAttribute("aria-hidden", "true");
    const nome = el("span");
    nome.textContent = p.nome;
    const cont = el("span", "contagem");
    cont.textContent = String(p.contagem);
    botao.append(ic, nome, cont);
    botao.addEventListener("click", () => acoes.aoSelecionar(p.id));

    const menu = el("button", "menu");
    menu.setAttribute("type", "button");
    menu.setAttribute("aria-label", "Ações da pasta");
    menu.textContent = "⋯";
    const acoesDiv = el("div", "acoes oculto");
    const renomear = el("button");
    renomear.setAttribute("type", "button");
    renomear.textContent = "Renomear";
    renomear.addEventListener("click", () => acoes.aoRenomear(p.id));
    const sub = el("button");
    sub.setAttribute("type", "button");
    sub.textContent = "Nova subpasta";
    sub.addEventListener("click", () => acoes.aoNovaPasta(p.id));
    const excluir = el("button");
    excluir.setAttribute("type", "button");
    excluir.textContent = "Excluir";
    excluir.addEventListener("click", () => acoes.aoExcluir(p.id));
    acoesDiv.append(renomear, sub, excluir);
    menu.addEventListener("click", () => acoesDiv.classList.toggle("oculto"));

    linha.append(botao, menu);
    li.append(linha, acoesDiv);
    if (p.filhas.length) {
      const ul = el("ul", "filhas");
      for (const f of p.filhas) ul.append(linhaPasta(f));
      li.append(ul);
    }
    return li;
  }

  function linhaItem(texto: string, rotuloAcao: string, agir: () => void, orfao: boolean): HTMLElement {
    const li = el("li");
    const div = el("div", orfao ? "item orfao" : "item");
    const ic = icone(orfao ? "alerta" : "nota", 16, doc);
    ic.setAttribute("aria-hidden", "true");
    const rotulo = el("span", "rotulo");
    rotulo.textContent = texto;
    const acao = el("button", "acao-item");
    acao.setAttribute("type", "button");
    acao.textContent = rotuloAcao;
    acao.addEventListener("click", agir);
    div.append(ic, rotulo, acao);
    li.append(div);
    return li;
  }

  function render(estado: EstadoPainel): void {
    atual = estado;
    arvore.replaceChildren();
    avisoEl.hidden = !estado.aviso;
    avisoEl.textContent = estado.aviso ?? "";

    const ul = el("ul");
    for (const p of estado.pastas) if (pastaCombina(p)) ul.append(linhaPasta(p));
    arvore.append(ul);

    itensPasta.replaceChildren();
    const daPasta = estado.itensDaSelecionada ?? [];
    if (estado.selecionada !== null && daPasta.length) {
      const rotuloSecao = el("div", "rotulo-secao");
      rotuloSecao.textContent = "Itens desta pasta";
      const ulPasta = el("ul");
      for (const i of daPasta)
        if (combina(i.titulo)) ulPasta.append(linhaItem(i.titulo, "Mover para…", () => acoes.aoMoverItem(i.agrupador), false));
      itensPasta.append(rotuloSecao, ulPasta);
    }

    const liSem = el("li");
    const linhaSem = el("div", "linha");
    const botaoSem = el("button", "pasta sem-pasta");
    botaoSem.setAttribute("type", "button");
    if (estado.selecionada === null) botaoSem.setAttribute("aria-current", "true");
    const icSem = icone("nota", 18, doc);
    icSem.setAttribute("aria-hidden", "true");
    const nomeSem = el("span");
    nomeSem.textContent = "Sem pasta";
    const contSem = el("span", "contagem");
    contSem.textContent = String(estado.semPasta.length);
    botaoSem.append(icSem, nomeSem, contSem);
    botaoSem.addEventListener("click", () => acoes.aoSelecionar(null));
    linhaSem.append(botaoSem);
    liSem.append(linhaSem);

    const ulItens = el("ul", "filhas");
    for (const i of estado.semPasta)
      if (combina(i.titulo)) ulItens.append(linhaItem(i.titulo, "Mover para…", () => acoes.aoMoverItem(i.agrupador), false));
    for (const v of estado.orfaos)
      if (combina(v.titulo)) ulItens.append(linhaItem(v.titulo, "esquecer", () => acoes.aoRemoverItem(v.id), true));
    if (ulItens.childNodes.length) liSem.append(ulItens);
    arvore.append(liSem);
  }

  return {
    host,
    render,
    destruir: () => host.remove(),
  };
}
