import { areaMemoria } from "@comum/armazenamento/area";
import { CHAVE_INTENCAO, gravarIntencao, lerIntencao, limparIntencao, sinalDeCriacao, TTL_INTENCAO_MS } from "../src/pagina/novaEmContexto";
import { checar, teste } from "./util";

const IDENT = { host: "sei.exemplo.gov.br", unidade: "110000108" };
const AGORA = 1_000_000;
const URL_RETORNO =
  "https://sei.exemplo.gov.br/sei/controlador.php?acao=base_conhecimento_listar&acao_origem=base_conhecimento_cadastrar&id_base_conhecimento=54&resultado=1";

await teste("intencao grava e le a mesma pasta", async () => {
  const area = areaMemoria();
  await gravarIntencao(area, IDENT, "p1", "1. Fiscalização", AGORA);
  const lida = await lerIntencao(area, IDENT, AGORA + 1);
  checar("pasta", lida?.pastaId === "p1");
  checar("caminho", lida?.caminho === "1. Fiscalização");
  checar("identidade", lida?.host === IDENT.host && lida?.unidade === IDENT.unidade);
  checar("carimbo", lida?.criadoEm === AGORA);
});

await teste("intencao expira e so vale na mesma identidade", async () => {
  const area = areaMemoria();
  await gravarIntencao(area, IDENT, "p1", "Fiscalização", AGORA);
  checar("limite exato ainda vale", (await lerIntencao(area, IDENT, AGORA + TTL_INTENCAO_MS)) !== null);
  checar("passou do prazo", (await lerIntencao(area, IDENT, AGORA + TTL_INTENCAO_MS + 1)) === null);
  checar("outro host", (await lerIntencao(area, { ...IDENT, host: "outro.gov.br" }, AGORA)) === null);
  checar("outra unidade", (await lerIntencao(area, { ...IDENT, unidade: "9" }, AGORA)) === null);
  checar("sem intencao", (await lerIntencao(areaMemoria(), IDENT, AGORA)) === null);
  checar("valor estranho na chave", (await lerIntencao(areaMemoria({ [CHAVE_INTENCAO]: { pastaId: 1 } }), IDENT, AGORA)) === null);
});

await teste("limparIntencao remove a chave", async () => {
  const area = areaMemoria();
  await gravarIntencao(area, IDENT, "p1", "Fiscalização", AGORA);
  await limparIntencao(area);
  checar("chave removida", !(CHAVE_INTENCAO in (await area.obter(CHAVE_INTENCAO))));
  checar("ler devolve null", (await lerIntencao(area, IDENT, AGORA)) === null);
});

await teste("sinalDeCriacao le o retorno do cadastro", () => {
  checar("retorno real", JSON.stringify(sinalDeCriacao(URL_RETORNO)) === JSON.stringify({ id: "54" }));
  checar("lista comum", sinalDeCriacao("https://sei.exemplo.gov.br/sei/controlador.php?acao=base_conhecimento_listar") === null);
  checar(
    "pesquisa com resultado",
    sinalDeCriacao("https://sei.exemplo.gov.br/sei/controlador.php?acao=base_conhecimento_pesquisar&resultado=1") === null,
  );
  checar("resultado diferente de 1", sinalDeCriacao(URL_RETORNO.replace("resultado=1", "resultado=0")) === null);
  checar("id nao numerico", sinalDeCriacao(URL_RETORNO.replace("id_base_conhecimento=54", "id_base_conhecimento=abc")) === null);
  checar("sem id", sinalDeCriacao(URL_RETORNO.replace("&id_base_conhecimento=54", "")) === null);
  checar("url invalida", sinalDeCriacao("nao-e-url") === null);
});
