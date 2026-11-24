import { areaMemoria } from "@comum/armazenamento/area";
import type { ArmazemTexto } from "@comum/sincronia/controlePagina";
import { disparar } from "../../sei-comum/tests/util";
import { itensDaPagina } from "../src/nucleo/itens";
import { consentimentoBase } from "../src/pagina/consentir";
import { type DepsMontar, montar, telaAtual } from "../src/pagina/montar";
import { checar, docFixture, paginaFixture, teste } from "./util";

const IDENT = { host: "sei.exemplo.gov.br", unidade: "110000108" };
const URL_LISTAR = "https://sei.exemplo.gov.br/sei/controlador.php?acao=base_conhecimento_listar";

function armazemVazio(): ArmazemTexto {
  return {
    async ler() {
      return null;
    },
    async gravar() {},
    async gravarConferindo() {
      return { gravado: true };
    },
    async localizar() {
      return null;
    },
    async excluir() {
      return false;
    },
  };
}

function deps(over: Partial<DepsMontar> = {}): DepsMontar {
  return {
    doc: docFixture("base_conhecimento_listar.html"),
    url: URL_LISTAR,
    area: areaMemoria(),
    sync: areaMemoria(),
    ident: IDENT,
    contexto: { login: "usuario.teste", nome: "Fulano de Tal", unidade: { id: IDENT.unidade, sigla: "Sinst" } },
    lerItens: async () => itensDaPagina(paginaFixture("base_conhecimento_listar.html")),
    armazem: () => armazemVazio(),
    perguntar: async () => true,
    pedirTexto: () => "Fiscalizacao",
    confirmar: () => true,
    escolherPasta: () => ({ pasta: null }),
    avisar: () => {},
    idDispositivo: "d1",
    cssPainel: "",
    janela: new EventTarget(),
    docEventos: Object.assign(new EventTarget(), { visibilityState: "visible" as DocumentVisibilityState }),
    agora: () => 100,
    ...over,
  };
}

const sombra = (doc: Document): DocumentFragment =>
  (doc.querySelector(".spro-bc-host") as HTMLElement).shadowRoot as unknown as DocumentFragment;

async function esperar(): Promise<void> {
  for (let i = 0; i < 10; i++) await new Promise((r) => setTimeout(r, 0));
}

await teste("telaAtual identifica as telas certas", () => {
  checar("listar", telaAtual(URL_LISTAR) === "listar");
  checar("pesquisar", telaAtual("https://sei.exemplo.gov.br/sei/controlador.php?acao=base_conhecimento_pesquisar") === "pesquisar");
  checar("outra", telaAtual("https://sei.exemplo.gov.br/sei/controlador.php?acao=procedimento_controlar") === null);
  checar("sem url", telaAtual("nao-e-url") === null);
});

await teste("montar pinta painel, coluna, botao e caption da tela", async () => {
  const d = deps();
  const desfazer = await montar(d);
  checar("painel", d.doc.querySelector(".spro-bc-host") !== null);
  const ths = [...d.doc.querySelectorAll("table.infraTable thead th")].map((t) => (t.textContent ?? "").trim());
  checar("coluna pasta", ths[1] === "Pasta");
  checar("botao pastas", d.doc.querySelector("#btnSproPastas") !== null);
  checar("caption", (d.doc.querySelector("caption.infraCaption")?.textContent ?? "").endsWith("(3 registros):"));
  desfazer();
  checar("painel removido", d.doc.querySelector(".spro-bc-host") === null);
  checar("botao removido", d.doc.querySelector("#btnSproPastas") === null);
});

await teste("montar devolve a tela nativa quando a leitura falha", async () => {
  const d = deps({
    lerItens: async () => {
      throw new Error("sem lista");
    },
  });
  const desfazer = await montar(d);
  checar("sem painel", d.doc.querySelector(".spro-bc-host") === null);
  desfazer();
});

await teste("nova pasta pede o Entendi e aparece na arvore", async () => {
  const d = deps();
  const desfazer = await montar(d);
  const s = sombra(d.doc);
  disparar(s.querySelector('[aria-label="Nova pasta"]') as Element, "click");
  await esperar();
  checar(
    "pasta criada",
    [...s.querySelectorAll(".pasta")].some((b) => b.textContent?.startsWith("Fiscalizacao")),
  );
  checar("consentimento ligado", (await consentimentoBase(d.sync, IDENT.host, "usuario.teste", IDENT.unidade).estado()) === "ligado");
  desfazer();
});

await teste("sem o Entendi nao cria pasta", async () => {
  const d = deps({ perguntar: async () => false });
  const desfazer = await montar(d);
  const s = sombra(d.doc);
  disparar(s.querySelector('[aria-label="Nova pasta"]') as Element, "click");
  await esperar();
  checar("nenhuma pasta", s.querySelectorAll(".pasta:not(.sem-pasta)").length === 0);
  checar("consentimento nao ligado", (await consentimentoBase(d.sync, IDENT.host, "usuario.teste", IDENT.unidade).estado()) !== "ligado");
  desfazer();
});
