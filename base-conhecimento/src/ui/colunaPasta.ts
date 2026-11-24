/**
 * Coluna "Pasta" e filtro na tabela nativa da Base de Conhecimento.
 *
 * Só mexe no DOM da própria tela: insere a coluna, marca cada linha com o
 * agrupador, pinta o caminho e esconde as linhas fora da pasta selecionada
 * (filtro de verdade; nada de esmaecer texto). O tablesorter reordena as linhas
 * sem recriá-las, então o filtro é reaplicado no `sortEnd`.
 */

export const ATRIBUTO_AGRUPADOR = "data-spro-agrupador";
export const ATRIBUTO_CELULA = "data-spro-cel-pasta";
export const ATRIBUTO_TH = "data-spro-th-pasta";

const tabelaDe = (doc: Document): HTMLTableElement | null => doc.querySelector("table.infraTable");

export function prepararTabela(doc: Document, agrupadorDaLinha: (tr: HTMLTableRowElement) => string | null): void {
  const tabela = tabelaDe(doc);
  if (!tabela) return;

  const cabecalho = tabela.querySelector("thead tr");
  const primeiroTh = cabecalho?.querySelector("th");
  if (cabecalho && primeiroTh && !tabela.querySelector(`[${ATRIBUTO_TH}]`)) {
    const th = doc.createElement("th");
    th.className = "infraTh";
    th.setAttribute(ATRIBUTO_TH, "");
    th.textContent = "Pasta";
    primeiroTh.after(th);
  }

  for (const tr of tabela.querySelectorAll("tr")) {
    if (tr.hasAttribute(ATRIBUTO_AGRUPADOR)) continue;
    const linha = tr as HTMLTableRowElement;
    const primeiroTd = linha.querySelector("td");
    if (!primeiroTd) continue;
    const agrupador = agrupadorDaLinha(linha);
    if (!agrupador) continue;
    linha.setAttribute(ATRIBUTO_AGRUPADOR, agrupador);
    const td = doc.createElement("td");
    td.className = "spro-cel-pasta";
    td.setAttribute(ATRIBUTO_CELULA, "");
    primeiroTd.after(td);
  }
}

export function pintarPastas(doc: Document, rotuloDe: (agrupador: string) => string): void {
  for (const tr of doc.querySelectorAll(`tr[${ATRIBUTO_AGRUPADOR}]`)) {
    const agrupador = tr.getAttribute(ATRIBUTO_AGRUPADOR);
    if (!agrupador) continue;
    const celula = tr.querySelector(`td[${ATRIBUTO_CELULA}]`);
    if (celula) celula.textContent = rotuloDe(agrupador);
  }
}

/** null limpa o filtro; senão esconde (display:none) as linhas fora do conjunto. */
export function filtrarPorPasta(doc: Document, agrupadores: ReadonlySet<string> | null): void {
  for (const tr of doc.querySelectorAll(`tr[${ATRIBUTO_AGRUPADOR}]`)) {
    const linha = tr as HTMLElement;
    const agrupador = linha.getAttribute(ATRIBUTO_AGRUPADOR) ?? "";
    const mostrar = agrupadores === null || agrupadores.has(agrupador);
    linha.style.display = mostrar ? "" : "none";
  }
}

export function atualizarCaption(doc: Document, total: number): void {
  const caption = doc.querySelector("caption.infraCaption");
  if (!caption) return;
  caption.textContent = `Lista de Procedimentos (${total} ${total === 1 ? "registro" : "registros"}):`;
}

/** Reaplica o filtro depois de o tablesorter reordenar. Devolve a função que desliga. */
export function ligarAoSortDaTabela(doc: Document, reaplicar: () => void): () => void {
  const tabela = tabelaDe(doc);
  if (!tabela) return () => undefined;
  const ouvinte = (): void => reaplicar();
  tabela.addEventListener("sortEnd", ouvinte);
  return () => tabela.removeEventListener("sortEnd", ouvinte);
}
