# Base de Conhecimento em árvore (SEI Pro) — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar ao SEI Pro uma navegação por **pastas hierárquicas** na Base de Conhecimento nativa do SEI (estilo Confluence/ClickUp), organizada pela unidade, sem alterar os itens nativos.

**Architecture:** Novo pacote `base-conhecimento/` no padrão dos demais (TypeScript, content script em mundo isolado, Shadow DOM para a UI nova). A árvore (pastas + vínculos pasta↔item por `id_base_conhecimento_agrupador`) fica no armazenamento local via `Colecao` e é sincronizada entre colegas num **Texto Padrão da unidade** `[_SEIPRO_BC_UNIDADE]` pelo motor existente (`ControleTextoPadrao` do `sei-comum`). A leitura dos itens da unidade usa `sei-nucleo` (links assinados, paginação). A tela nativa (tabela `infraTable` + botões) é preservada: o módulo acrescenta painel de pastas, coluna "Pasta" e filtro por pasta.

**Tech Stack:** TypeScript 5.9, esbuild (IIFE, `target: ["chrome116","firefox115"]`, charset ascii), tsx + linkedom + `node:assert/strict` para testes; `sei-comum` (motor de sincronia, `Colecao`/`Area`, ordem por índice fracionário, `h`/`icone`); `sei-nucleo` (HTTP, links assinados, `criarArmazemTextoPadrao`, `lerContexto`, `paginaDe`).

**Spec:** `docs/base-conhecimento/desenho.md` (mockup: `docs/base-conhecimento/mockup.html`; captura real sanitizada: `docs/base-conhecimento/capturas/base_conhecimento_listar.html`).

## Global Constraints

- Mundo isolado sempre; `world: "MAIN"` é proibido; a UI nova vive em **Shadow DOM**; nunca `innerHTML` para conteúdo dinâmico (só `h()`/`textContent`); sem jQuery.
- A **única escrita no SEI** é o Texto Padrão da árvore `[_SEIPRO_BC_UNIDADE]`. Nunca criar/editar/liberar/excluir itens da Base de Conhecimento.
- Referência a item sempre por `id_base_conhecimento_agrupador` (nunca pelo id da versão); `titulo` do vínculo é cache; excluir pasta nunca apaga item (vínculos voltam a `pasta: null` = "Sem pasta").
- Motor de sincronia: `releituras: 3`, `intervaloPuxar: 120000`, `atrasoEnvio: 15000`, `lerSemConsentimento: true` (escopo unidade), teto `TETO_TEXTO = 100 * 1024`, aviso `AVISO_TEXTO = 80 * 1024`; árvore vazia não cria Texto Padrão (`vazio()`).
- WCAG 2.1 AA na UI nova: texto ≥ 4,5:1 (valores aprovados: `#212529`, `#495057`, `#155f9b` sobre `#e7f0f8`), ícones ≥ 3:1, alvo de clique ≥ 44 px, `:focus-visible` visível, `aria-current="true"` na pasta ativa; filtro por pasta **esconde** linhas (nunca esmaece texto).
- Opção liga/desliga: `baseconhecimento` em `opcoes-pagina/src/schema-dados.ts` (`tipo: "chave"`, `padrao: true`, `visivelEm: "lab"`); leitura via `opcaoLegadaLigada` (ligada por padrão). Falha ou opção desligada devolve a tela nativa intacta.
- Build: `dist/js/init_base_conhecimento.js` com `bundle, minify, format: "iife", target: ["chrome116","firefox115"], charset: "ascii", legalComments: "none", loader: { ".css": "text" }` + banner `/* GERADO por base-conhecimento/build.mjs. NAO EDITE. Rode: npm run build */` + portão byte-a-byte (nenhum byte > 127).
- Fixtures: primeira linha `<!-- url: ... -->`, dados anonimizados (logins `usuario.teste`, nomes `Fulano de Tal`/`Ciclano de Tal`, títulos "PROCEDIMENTO DE EXEMPLO"), hashes de sessão zerados (64 zeros). Fixtures sintéticas marcadas em comentário.
- Textos de UI e comentários em pt-BR. Bundle sem bytes não-ASCII (esbuild `charset: "ascii"`).

## Review Focus

1. **Item novo no SEI sem vínculo na árvore** → aparece em "Sem pasta" com título real, sem quebrar a exibição — teste em Task 5 (`montarExibicao`).
2. **Vínculo cujo item sumiu (órfão)** → exibido como removido (riscado, ação "esquecer"), sem erro — teste em Task 5.
3. **Usuário sem permissão de alterar Texto Padrão** → modo leitura/indisponível, e árvore vazia nunca cria o texto — testes em Tasks 6 (`vazio()`) e 7 (`soLeitura`).
4. **Dois usuários gravando ao mesmo tempo** → releitura antes de gravar (motor) + mesclagem por entidade com lápide — testes em Tasks 4 (`importar`/`mesclar`) e 7 (conferência na gravação).
5. **Título de item com HTML/entidades (escape duplo do SEI 5)** → renderizado como texto puro (sem injeção) — testes em Tasks 2 (parser) e 8 (painel sem `innerHTML`).

---

### Task 1: Esqueleto do pacote

**Files:**
- Create: `base-conhecimento/package.json`
- Create: `base-conhecimento/tsconfig.json`
- Create: `base-conhecimento/biome.json`
- Create: `base-conhecimento/build.mjs`
- Create: `base-conhecimento/src/css.d.ts`
- Create: `base-conhecimento/src/main.ts` (stub: exporta nada, só um comentário de propósito)
- Create: `base-conhecimento/tests/util.ts`
- Create: `base-conhecimento/tests/verificar.ts`

**Interfaces:**
- Consumes: nada (copia padrão de `grade-controle/` e `favoritos/`).
- Produces: `tests/util.ts` exporta `teste(nome: string, fn: () => void | Promise<void>): Promise<void>`, `checar(nome: string, cond: boolean): void`, `fixture(nome: string): string`, `docDe(html: string): Document`, `docFixture(nome: string): Document` (fixtures em `tests/fixtures/sei5/`), `httpRoteado(rotas: Record<string, (url: string) => Pagina>): Http` — todos os arquivos posteriores importam daqui.

- [ ] **Step 1: Copiar os arquivos de referência e ajustar nomes**

`package.json` igual ao de `grade-controle/` com `"name": "sei-pro-base-conhecimento"`, scripts `build`/`tipos`/`verificar`/`checar` e `@biomejs/biome ^2.2.0` a mais (padrão de `favoritos/`). `tsconfig.json` igual ao de `grade-controle/` (ES2022, `moduleResolution: "bundler"`, `strict`, `paths` `@comum/*`→`../sei-comum/src/*` e `@nucleo/*`→`../sei-nucleo/src/*`). `biome.json` igual ao de `favoritos/`. `build.mjs` igual ao de `grade-controle/`, com `entryPoints: src/main.ts`, outfile `../dist/js/init_base_conhecimento.js`, banner próprio e o laço de conferência ASCII byte a byte (como em `favoritos/build.mjs`).

- [ ] **Step 2: Rodar e verificar o build vazio**

Run: `cd base-conhecimento && npm install && npm run build`
Expected: gera `dist/js/init_base_conhecimento.js` (IIFE minificado) e imprime o tamanho; `npm run tipos` e `npm run verificar` passam.

- [ ] **Step 3: Commit**

```bash
git add base-conhecimento/package.json base-conhecimento/tsconfig.json base-conhecimento/biome.json base-conhecimento/build.mjs base-conhecimento/src/css.d.ts base-conhecimento/src/main.ts base-conhecimento/tests/util.ts base-conhecimento/tests/verificar.ts dist/js/init_base_conhecimento.js
git commit -m "feat(base-conhecimento): esqueleto do pacote"
```

### Task 2: Leitura dos itens da unidade (`nucleo/`)

**Files:**
- Create: `base-conhecimento/src/nucleo/tipos.ts`
- Create: `base-conhecimento/src/nucleo/itens.ts`
- Create: `base-conhecimento/tests/fixtures/sei5/base_conhecimento_listar.html` (da captura real)
- Create: `base-conhecimento/tests/fixtures/sei5/base_conhecimento_listar_p0.html` e `base_conhecimento_listar_p1.html` (sintéticas, paginadas)
- Create: `base-conhecimento/tests/t-nucleo-itens.ts`

**Interfaces:**
- Consumes: `Pagina`, `Http`, `OpcoesHttp`, `ErroSei` de `@nucleo/sessao/http`/`@nucleo/sessao/erros`; `Formulario` de `@nucleo/formulario/formulario`; `fixture`/`httpRoteado` de `tests/util` (Task 1).
- Produces:

```ts
// nucleo/tipos.ts
export interface ItemBase {
  agrupador: string;      // id_base_conhecimento_agrupador (estável entre versões)
  id: string;             // id_base_conhecimento da versão atual
  titulo: string;         // texto da célula "Descrição" (entidades HTML já decodificadas)
  gerador: string;        // login da coluna "Usuário Gerador" ("" se vazia)
  dataGeracao: string;    // "dd/mm/aaaa hh:mm:ss" como vem na célula
  liberado: boolean;      // colunas "Usuário Liberação"/"Data Liberação" preenchidas
  visualizar: string;     // href do link base_conhecimento_visualizar
}
// nucleo/itens.ts
export const MAX_PAGINAS_ITENS = 40;
export type SeiDosItens = Pick<Sei, "http" | "linkMenu">;
export function itensDaPagina(p: Pagina): ItemBase[];
export async function lerItensDaUnidade(sei: SeiDosItens, op?: OpcoesHttp): Promise<ItemBase[]>;
```

- [ ] **Step 1: Copiar e anonimizar a fixture real**

Copiar `docs/base-conhecimento/capturas/base_conhecimento_listar.html` para `tests/fixtures/sei5/base_conhecimento_listar.html`; prepender `<!-- url: https://sei.inmetro.gov.br/sei/controlador.php?acao=base_conhecimento_listar&infra_sistema=100000100&infra_unidade_atual=110000108&infra_hash=000... (64 zeros) -->`; trocar logins (`rlamaral`, `mdcastro`, `kwamado` → `usuario.teste`), nomes (`Roberto Lima do Amaral`, `Michael Douglas de Castro Sousa`, `Kaua Willians Lopes Amado` → `Fulano de Tal`) e os três títulos → `PROCEDIMENTO DE EXEMPLO A`/`B`/`C` (manter a estrutura das células).

- [ ] **Step 2: Criar as fixtures sintéticas de paginação**

A partir da real: `_p0.html` com os 3 itens e o idioma de paginação do SEI (`href="#" onclick="infraAcaoPaginar('+')"` na barra de paginação e formulário `hdnInfraPaginaAtual`); `_p1.html` com 2 itens a mais e `infraAcaoPaginar('-')`. Comentário `<!-- sintética, paginada -->` no topo de cada.

- [ ] **Step 3: Escrever os testes que falham**

Em `tests/t-nucleo-itens.ts` com `teste()`/`checar()`:
- `itensDaPagina` na fixture real: 3 itens; primeiro com `agrupador: "40"`, `titulo: "PROCEDIMENTO DE EXEMPLO A"`, `liberado: true`, `gerador: "usuario.teste"`; o que tem células de liberação vazias → `liberado: false`.
- Título com `&amp;` decodificado (`titulo` nunca contém `&amp;`).
- `lerItensDaUnidade` com `httpRoteado` que serve `p0` → `p1`: retorna 5 itens e faz 2 pedidos.
- `lerItensDaUnidade` com `linkMenu` lançando `SEI_ACAO_INDISPONIVEL` → propaga `ErroSei`.

- [ ] **Step 4: Rodar e verificar que falham**

Run: `cd base-conhecimento && npm run verificar`
Expected: FALHOU nos testes novos (módulos inexistentes).

- [ ] **Step 5: Implementar `itensDaPagina` e `lerItensDaUnidade`**

`itensDaPagina`: linhas de `table.infraTable tr`; agrupador do href `base_conhecimento_versoes` (`id_base_conhecimento_agrupador=`); id do checkbox ou de `id_base_conhecimento=` no link visualizar; células pelos cabeçalhos (nunca posição). `lerItensDaUnidade`: obtém `sei.linkMenu("base_conhecimento_listar")`, percorre a paginação como `textoPadrao.ts` (`Formulario.de(pagina, "#frmBaseConhecimentoLista", http).definir({ hdnInfraPaginaAtual: String(n+1) }).enviar(op)`, teto `MAX_PAGINAS_ITENS`, próxima página por `/infraAcaoPaginar\(\s*['"]\+['"]/`), acumula e devolve sem duplicatas (por `agrupador`).

- [ ] **Step 6: Rodar e verificar que passam**

Run: `cd base-conhecimento && npm run verificar && npm run tipos`
Expected: todos OK.

- [ ] **Step 7: Commit**

```bash
git add base-conhecimento/src/nucleo base-conhecimento/tests/fixtures/sei5 base-conhecimento/tests/t-nucleo-itens.ts
git commit -m "feat(base-conhecimento): leitura paginada dos itens da unidade"
```

### Task 3: Modelo e validação do envelope (`arvore/modelo.ts`)

**Files:**
- Create: `base-conhecimento/src/arvore/modelo.ts`
- Create: `base-conhecimento/tests/t-arvore-modelo.ts`

**Interfaces:**
- Consumes: `Versionada` de `@comum/sincronia/entidade`; `ValidacaoTexto`/`versaoMaisNova` de `@comum/sincronia/textoPadraoCodec`; `indiceValido` de `@comum/ordem/indice`; `id` de `@comum/id` (gerador de id curto).
- Produces:

```ts
export const FORMATO = "seipro-base-conhecimento";
export const VERSAO = 1;
export const TETO_TEXTO = 100 * 1024;
export const AVISO_TEXTO = 80 * 1024;
export const LIMITE_NOME_PASTA = 80;
export class ErroArvore extends Error { constructor(mensagem: string); }
export interface Pasta extends Versionada { id: string; nome: string; pai: string | null; ordem: string; }
export interface Vinculo extends Versionada { id: string /* = agrupador */; titulo: string; pasta: string | null; ordem: string; }
export interface EntidadesArvore { p: Pasta[]; v: Vinculo[]; }
export interface Envelope { v: typeof VERSAO; entidades: EntidadesArvore; }
export function pastaValida(x: unknown): x is Pasta;
export function vinculoValido(x: unknown): x is Vinculo;
export function validarEnvelope(bruto: unknown): ValidacaoTexto<Envelope>;
```

- [ ] **Step 1: Escrever os testes que falham**

- Envelope válido (`{v:1, entidades:{p:[{id:"p1",nome:"Fiscalização",pai:null,ordem:"a0",atualizadoEm:1,dispositivo:"d"}], v:[...]}}`) → `{ok}`.
- `v: 2` → `{maisNovo: true}` (via `versaoMaisNova(bruto, FORMATO, VERSAO)`); `v` ausente → `{invalido: "..."}`.
- Nome vazio ou > 80 → inválido; `pai` não-nulo sem pasta correspondente no mesmo envelope → inválido; `ordem` que falha `indiceValido` → inválido; id vazio → inválido.
- `removidoEm` presente (lápide) → entidade continua válida.

- [ ] **Step 2: Rodar e verificar que falham**

Run: `cd base-conhecimento && npm run verificar`
Expected: FALHOU.

- [ ] **Step 3: Implementar**

`pastaValida`/`vinculoValido`: shape estrito dos campos + regras acima; `validarEnvelope` reusa ambos e `versaoMaisNova`.

- [ ] **Step 4: Rodar e verificar que passam**

Run: `cd base-conhecimento && npm run verificar && npm run tipos`
Expected: todos OK.

- [ ] **Step 5: Commit**

```bash
git add base-conhecimento/src/arvore/modelo.ts base-conhecimento/tests/t-arvore-modelo.ts
git commit -m "feat(base-conhecimento): modelo e validação do envelope da árvore"
```

### Task 4: Repositório da árvore (`arvore/repositorio.ts`)

**Files:**
- Create: `base-conhecimento/src/arvore/repositorio.ts`
- Create: `base-conhecimento/tests/t-arvore-repositorio.ts`

**Interfaces:**
- Consumes: `Area`, `Colecao`, `areaMemoria` de `@comum`; `mesclar`/`purgarLapides` de `@comum/sincronia/entidade`; `indiceEntre` de `@comum/ordem/indice`; `ErroArvore`/`Pasta`/`Vinculo`/`EntidadesArvore`/`Envelope`/`VERSAO` (Task 3).
- Produces:

```ts
export interface Carimbo { agora: number; dispositivo: string; }
export interface DepsRepositorio { area: Area; carimbo: () => Carimbo; gerarId?: () => string; }
export const PREFIXO_PASTAS = "base-conhecimento/pastas";
export const PREFIXO_VINCULOS = "base-conhecimento/vinculos";
export class RepositorioArvore {
  readonly pastas: Colecao<Pasta>;
  readonly vinculos: Colecao<Vinculo>;
  constructor(d: DepsRepositorio);
  aoMudar(cb: () => void): () => void;
  async importar(ent: Partial<EntidadesArvore>, agora?: number): Promise<void>;
  async exportar(agora?: number): Promise<Envelope>;
  async criarPasta(nome: string, pai: string | null, antes?: string): Promise<Pasta>;
  async renomearPasta(id: string, nome: string): Promise<Pasta>;
  async moverPasta(id: string, pai: string | null): Promise<Pasta>;   // ErroArvore em ciclo
  async excluirPasta(id: string): Promise<void>;  // subpastas sobem p/ o pai; vínculos diretos → null; lápide
  async moverVinculo(agrupador: string, pasta: string | null, titulo: string): Promise<Vinculo>; // cria se ausente
  async removerVinculo(agrupador: string): Promise<void>;  // lápide
}
```

- [ ] **Step 1: Escrever os testes que falham**

Com `areaMemoria()` e `carimbo` controlado:
- `criarPasta("Fiscalização", null)` e `criarPasta("Notas", "pai", "a0")`: ordem calculada com `indiceEntre` e ordenação correta na `listar`.
- `renomearPasta` com nome vazio ou > 80 → `ErroArvore`.
- `moverPasta(p1, p2)` em que p2 é descendente de p1 → `ErroArvore` (ciclo).
- `excluirPasta(pai)`: subpasta passa a `pai: null`; vínculo com `pasta: pai` passa a `null`; pasta some de `listar`.
- `moverVinculo("40", "p1", "titulo")` ausente → cria com carimbo; existente → só atualiza `pasta`/`titulo`.
- `removerVinculo` → lápide; `importar` de um envelope de outro "computador" com entidade mais recente vence (usar `mesclar`); `exportar` idempotente com carimbo fixo.

- [ ] **Step 2: Rodar e verificar que falham**

Run: `cd base-conhecimento && npm run verificar`
Expected: FALHOU.

- [ ] **Step 3: Implementar**

Coleções `Colecao<Pasta>`/`Colecao<Vinculo>` com os prefixos; mutações gravam com `carimbo()` (lápide = `removidoEm`); `importar` mescla com `mesclar`; `excluirPasta` resolve subpastas e vínculos antes de gravar a lápide.

- [ ] **Step 4: Rodar e verificar que passam**

Run: `cd base-conhecimento && npm run verificar && npm run tipos`
Expected: todos OK.

- [ ] **Step 5: Commit**

```bash
git add base-conhecimento/src/arvore/repositorio.ts base-conhecimento/tests/t-arvore-repositorio.ts
git commit -m "feat(base-conhecimento): repositório da árvore (pastas, vínculos, lápides)"
```

### Task 5: Exibição e mesclagem com a lista (`arvore/mesclar.ts`)

**Files:**
- Create: `base-conhecimento/src/arvore/mesclar.ts`
- Create: `base-conhecimento/tests/t-arvore-mesclar.ts`

**Interfaces:**
- Consumes: `Pasta`/`Vinculo`/`EntidadesArvore` (Task 3), `ItemBase` (Task 2).
- Produces:

```ts
export interface PastaExibida { id: string; nome: string; pai: string | null; ordem: string; filhas: PastaExibida[]; contagem: number; }
export interface Exibicao {
  pastas: PastaExibida[];          // raízes, ordenadas por ordem (índice fracionário)
  semPasta: ItemBase[];            // itens sem vínculo OU vínculo com pasta: null
  orfaos: Vinculo[];               // vínculos cujo agrupador não está na lista
}
export function montarExibicao(ent: EntidadesArvore, itens: ItemBase[]): Exibicao;
export function vinculosDesatualizados(ent: EntidadesArvore, itens: ItemBase[]): Vinculo[];
// vínculo cujo titulo difere do título real do item (para atualizar o cache)
export function caminhoDaPasta(pastas: PastaExibida[], id: string): string;
// "Fiscalização › Notas Técnicas" (raízes até a pasta; "" se não achar)
```

- [ ] **Step 1: Escrever os testes que falham**

- Item novo sem vínculo → em `semPasta` (Review Focus 1).
- Vínculo com `agrupador` ausente da lista → `orfaos` (Review Focus 2); `montarExibicao` não lança.
- Vínculo com `titulo` antigo e item presente → `vinculosDesatualizados` retorna o vínculo; título igual → vazio.
- Pastas aninhadas viram `filhas`; `contagem` = nº de vínculos com `pasta === id` (só diretos); ordenação por `ordem` (chaves `a0` < `a1`; comparar com `<`/`>`, nunca `localeCompare`).
- `caminhoDaPasta` para uma subpasta com raiz "Fiscalização" → `"Fiscalização › Notas Técnicas"`; pasta inexistente → `""`.

- [ ] **Step 2: Rodar e verificar que falham**

Run: `cd base-conhecimento && npm run verificar`
Expected: FALHOU.

- [ ] **Step 3: Implementar**

Funções puras (sem DOM, sem área): montar a árvore por `pai`, ordenar por índice, agrupar `semPasta`/`orfaos` num passe.

- [ ] **Step 4: Rodar e verificar que passam**

Run: `cd base-conhecimento && npm run verificar && npm run tipos`
Expected: todos OK.

- [ ] **Step 5: Commit**

```bash
git add base-conhecimento/src/arvore/mesclar.ts base-conhecimento/tests/t-arvore-mesclar.ts
git commit -m "feat(base-conhecimento): exibição da árvore e mesclagem com a lista"
```

### Task 6: Envelope de sincronia e adaptador do motor

**Files:**
- Create: `base-conhecimento/src/sincronia/envelope.ts`
- Create: `base-conhecimento/tests/t-sincronia-envelope.ts`

**Interfaces:**
- Consumes: `nomeDeTextoInterno`/`ValidacaoTexto` de `@comum/sincronia/textoPadraoCodec`; `assinaturaEstavel`/`porId` de `@comum/sincronia/assinatura`; `AdaptadorTexto` de `@comum/sincronia/motor`; `Envelope`/`validarEnvelope`/`TETO_TEXTO`/`AVISO_TEXTO` (Task 3); `RepositorioArvore` (Task 4).
- Produces:

```ts
export function nomeDoTexto(): string;           // nomeDeTextoInterno("BC", "UNIDADE") → "[_SEIPRO_BC_UNIDADE]"
export function descricaoDoTexto(): string;
export function legivelEnvelope(sigla: string, nomeUsuario: string): string;
export function assinaturaEnvelope(env: Envelope): string;
// estável: desconsidera atualizadoEm/dispositivo; inclui removidoEm (lápide muda o estado)
export async function textoComoGravado(lido: Envelope, agora: number): Promise<Envelope>;
// = exportar(importar(lido)) num RepositorioArvore de memória: implementa o normalizar
export const chaveSubstituido = "base-conhecimento/sync/tp/substituido";
export function adaptadorBaseConhecimento(d: { repo: RepositorioArvore; area: Area; sigla: string; nomeUsuario: string }): AdaptadorTexto<Envelope>;
```

- [ ] **Step 1: Escrever os testes que falham**

- `nomeDoTexto()` === `"[_SEIPRO_BC_UNIDADE]"`; `legivelEnvelope` contém a sigla e o nome.
- `assinaturaEnvelope` igual para dois envelopes que diferem só em `atualizadoEm`/`dispositivo`; diferente quando uma lápide aparece.
- `adaptadorBaseConhecimento`: `validar` com envelope bom → `{ok}`, inválido → `{invalido}`, `v: 2` → `{maisNovo}`; `vazio` true para `{p:[],v:[]}` e false com qualquer pasta ou vínculo; `importar`/`exportar` roundtrip num repo de `areaMemoria`; `normalizar` idempotente; `antesDeRegravarInvalido` grava em `chaveSubstituido` na área; `teto`/`aviso` === `TETO_TEXTO`/`AVISO_TEXTO`; `chaveStatus` === `"base-conhecimento/sync/tp/unidade"`.

- [ ] **Step 2: Rodar e verificar que falham**

Run: `cd base-conhecimento && npm run verificar`
Expected: FALHOU.

- [ ] **Step 3: Implementar**

O adaptador segue o molde de `demandas/src/sincronia/textoPadrao.ts` (`modulo: "base-conhecimento"`), com um texto só (escopo unidade).

- [ ] **Step 4: Rodar e verificar que passam**

Run: `cd base-conhecimento && npm run verificar && npm run tipos`
Expected: todos OK.

- [ ] **Step 5: Commit**

```bash
git add base-conhecimento/src/sincronia/envelope.ts base-conhecimento/tests/t-sincronia-envelope.ts
git commit -m "feat(base-conhecimento): adaptador do motor de sincronia"
```

### Task 7: Armazém do SEI, consentimento e orquestração da sincronia (`pagina/`)

**Files:**
- Create: `base-conhecimento/src/pagina/armazem.ts`
- Create: `base-conhecimento/src/pagina/consentir.ts`
- Create: `base-conhecimento/src/pagina/sincronia.ts`
- Create: `base-conhecimento/tests/t-pagina-sincronia.ts`

**Interfaces:**
- Consumes: `criarArmazemTextoPadrao`/`ArmazemTextoPadrao` de `@nucleo/dominio/textoPadrao`; `criarHttp` de `@nucleo/sessao/http`; `paginaDe` de `@nucleo/sessao/pagina`; `linkDoMenu` de `@nucleo/links/links`; `lerContexto`/`ContextoSei` de `@nucleo/sei`; `ControleTextoPadrao` de `@comum/sincronia/controlePagina`; `PortaConsentimento`/`consentimentoNaArea`/`chaveConsentimento` de `@comum/sincronia/consentimento`; `ArmazemTexto`/`StatusSync` de `@comum/sincronia/controlePagina`; `Travar` de `@comum/sincronia/trava`; `AbrirModal` de `@comum/ui/dialogo`; `adaptadorBaseConhecimento`/`nomeDoTexto` (Task 6); `RepositorioArvore` (Task 4).
- Produces:

```ts
// pagina/armazem.ts
export function armazemNaTela(doc: Document, url: string): boolean;
// o menu tem o item "texto_padrao_interno_listar"? (linkDoMenu sem requisição)
export function armazemDoTexto(doc: Document, url: string): ArmazemTexto;
// { http: criarHttp(url), linkMenu: (a) => linkDoMenu(paginaDe(doc, url), a) } → criarArmazemTextoPadrao(..., { nome: nomeDoTexto(), descricao: descricaoDoTexto() })
// pagina/consentir.ts
export const CHAVE_CONSENTIMENTO = "base-conhecimento/consentimento";  // storage.sync
export function consentimentoBase(sync: Area, host: string, login: string, idUnidade: string): PortaConsentimento;
export const TEXTO_ENTENDI: string;   // parágrafo do aviso (menciona o Texto Padrão da unidade)
export function perguntarEntendi(montar: AbrirModal, sigla: string): Promise<boolean>;
// pagina/sincronia.ts
export const INTERVALO_PUXAR = 2 * 60_000;
export interface DepsSincronia {
  ctx: { host: string; login: string; nome?: string };
  unidade: { id: string; sigla: string };
  area: Area; sync: Area;
  repo: RepositorioArvore;
  armazem(): ArmazemTexto;
  travar: Travar; travarEsperando: Travar;
  atrasoEnvio?: number;
}
export class SincroniaBase {
  constructor(d: DepsSincronia);
  consentimento(): PortaConsentimento;
  iniciar(o: { puxar: boolean }): Promise<void>;
  puxar(): Promise<void>;
  agora(): Promise<StatusSync>;
  parar(): void;
}
export function ligarSincronia(d: DepsSincronia & { janela: Pick<EventTarget, "addEventListener">; doc: Pick<EventTarget, "addEventListener"> & { readonly visibilityState: DocumentVisibilityState }; temArmazem: () => boolean }): SincroniaBase | null;
```

- [ ] **Step 1: Escrever os testes que falham**

- `armazemNaTela` na fixture real (`base_conhecimento_listar.html`) → true; num doc sem o item de menu → false.
- `consentimentoBase` com `areaMemoria`: estado "nao-perguntado" → definir "ligado" → "ligado".
- `ligarSincronia` com fakes (armazém em memória, consent fake, repo em `areaMemoria`, `travar` imediato): com consentimento desligado, `iniciar({puxar: true})` lê (importa) mas **não grava**; com ligado, mudança no repo + `agora()` grava o HTML gerado por `gerarConteudoTexto`; armazém sem link de alterar → `status().estado === "indisponivel"` (Review Focus 3); `puxar()` após o texto sumir → mescla de novo; `agora()` com `gravarConferindo` devolvendo `{gravado: false}` → status com `mensagem` de "mudou durante a gravação" (Review Focus 4).

- [ ] **Step 2: Rodar e verificar que falham**

Run: `cd base-conhecimento && npm run verificar`
Expected: FALHOU.

- [ ] **Step 3: Implementar**

`SincroniaBase` cria **um** `ControleTextoPadrao<Envelope>` (escopo unidade) com `adaptadorBaseConhecimento`, `consentimento: consentimentoBase(...)`, `releituras: 3`, `lerSemConsentimento: true`, `intervaloPuxar: INTERVALO_PUXAR`, `armazem: () => d.armazem()`, `aoMudarLocal: repo.aoMudar`, `travar`/`travarEsperando`.

- [ ] **Step 4: Rodar e verificar que passam**

Run: `cd base-conhecimento && npm run verificar && npm run tipos`
Expected: todos OK.

- [ ] **Step 5: Commit**

```bash
git add base-conhecimento/src/pagina/armazem.ts base-conhecimento/src/pagina/consentir.ts base-conhecimento/src/pagina/sincronia.ts base-conhecimento/tests/t-pagina-sincronia.ts
git commit -m "feat(base-conhecimento): armazém, consentimento e sincronia da página"
```

### Task 8: Painel de pastas em Shadow DOM (`ui/painel.ts`)

**Files:**
- Create: `base-conhecimento/src/ui/painel.ts`
- Create: `base-conhecimento/src/ui/painel.css` (importado como texto; entra no `<style>` do Shadow DOM)
- Create: `base-conhecimento/tests/t-ui-painel.ts`

**Interfaces:**
- Consumes: `h`/`icone`/`NomeIcone` de `@comum/ui/dom`; `PastaExibida`/`Exibicao` (Task 5); `ItemBase` (Task 2); `Vinculo` (Task 3).
- Produces:

```ts
export interface EstadoPainel {
  pastas: PastaExibida[];
  semPasta: ItemBase[];
  orfaos: Vinculo[];
  selecionada: string | null;
  busca: string;
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
export function montarPainel(acoes: AcoesPainel, doc?: Document):
  { host: HTMLElement; render(estado: EstadoPainel): void; destruir(): void };
```

- [ ] **Step 1: Escrever os testes que falham**

Com linkedom (o analisador já instalado em `tests/util.ts`):
- `render` monta as pastas com indentação (subpasta dentro do `<li>` do pai), contagens à direita, "Sem pasta" com os itens e órfãos riscados com ação "esquecer".
- Pasta selecionada tem `aria-current="true"`; botão "nova pasta" tem `aria-label="Nova pasta"`; ícones têm `alt=""`.
- Título contendo `<b>injetado</b>` renderiza como texto puro (sem elemento filho) — Review Focus 5.
- Eventos: clique na pasta → `aoSelecionar(id)`; clique no botão nova pasta → `aoNovaPasta(pai: null)`; ação excluir de uma pasta → `aoExcluir(id)`; ação "Mover para…" de um item → `aoMoverItem(agrupador)`; input de busca → `aoBuscar(texto)`.
- `destruir()` remove o host do documento.
- Altura mínima do item da árvore ≥ 44 px (estilo no Shadow DOM: `min-height: 44px`).

- [ ] **Step 2: Rodar e verificar que falham**

Run: `cd base-conhecimento && npm run verificar`
Expected: FALHOU.

- [ ] **Step 3: Implementar**

`host` recebe `attachShadow({mode: "open"})`; `<style>` com `painel.css` (tokens aprovados: fundo branco, texto `#212529`, secundários `#495057`, pasta ativa `#155f9b` sobre `#e7f0f8`, `:focus-visible` com contorno, `min-height: 44px`, borda direita `#dee2e6`); nunca `innerHTML` com dados (títulos vão por `textContent`).

- [ ] **Step 4: Rodar e verificar que passam**

Run: `cd base-conhecimento && npm run verificar && npm run tipos`
Expected: todos OK.

- [ ] **Step 5: Commit**

```bash
git add base-conhecimento/src/ui/painel.ts base-conhecimento/src/ui/painel.css base-conhecimento/tests/t-ui-painel.ts
git commit -m "feat(base-conhecimento): painel de pastas em Shadow DOM"
```

### Task 9: Coluna "Pasta", filtro e botão alternador na tela nativa

**Files:**
- Create: `base-conhecimento/src/ui/colunaPasta.ts`
- Create: `base-conhecimento/src/ui/botao.ts`
- Create: `base-conhecimento/tests/t-ui-coluna.ts`

**Interfaces:**
- Consumes: `Area`/`areaMemoria` de `@comum`; `ItemBase` (Task 2); `caminhoDaPasta`/`PastaExibida` (Task 5); fixture da tabela real (Task 2).
- Produces:

```ts
// ui/colunaPasta.ts
export const ATRIBUTO_AGRUPADOR = "data-spro-agrupador";
export function prepararTabela(doc: Document, agrupadorDaLinha: (tr: HTMLTableRowElement) => string | null): void;
// th "Pasta" após o th do checkbox; td vazio após o td do checkbox em cada linha com agrupador; grava o atributo
export function pintarPastas(doc: Document, rotuloDe: (agrupador: string) => string): void;
export function filtrarPorPasta(doc: Document, agrupadores: ReadonlySet<string> | null): void;
// null limpa o filtro; senão esconde (display:none) as linhas cujo agrupador não está no conjunto
export function atualizarCaption(doc: Document, total: number): void;
// "Lista de Procedimentos (N registro(s)):" no caption.infraCaption
export function ligarAoSortDaTabela(doc: Document, reaplicar: () => void): () => void;
// escuta o evento sortEnd do tablesorter na tabela (fixture: class tablesorter) e reaplica
// ui/botao.ts
export const CHAVE_MODO = "spro_bc_modo";   // "arvore" | "lista" em chrome.storage.local
export type Modo = "arvore" | "lista";
export function garantirBotaoPastas(doc: Document, area: Area, aoAlternar: (modo: Modo) => void): void;
// button.infraButton com <span class="infraTeclaAtalho">P</span>astas na #divInfraBarraComandosSuperior;
// ativo (modo arvore) ganha style background:#e7f0f8;font-weight:600; persiste a alternância
```

- [ ] **Step 1: Escrever os testes que falham**

- `prepararTabela` na fixture: cabeçalho ganha th "Pasta" após o checkbox; cada linha com item ganha td e `data-spro-agrupador` correto (linha do "PROCEDIMENTO DE EXEMPLO A" → `"40"`).
- `pintarPastas` preenche os tds com `caminhoDaPasta` ("Fiscalização › Notas Técnicas"; item sem pasta → "Sem pasta").
- `filtrarPorPasta(doc, new Set(["40"]))` esconde as demais linhas (offsetParent/computed display none) e mantém a linha 40; `filtrarPorPasta(doc, null)` restaura todas.
- `atualizarCaption(doc, 1)` → caption termina em "(1 registro):"; `(doc, 3)` → "(3 registros):".
- `ligarAoSortDaTabela`: despachar evento `sortEnd` sintético reaplica o filtro (contador do callback).
- `garantirBotaoPastas` com `areaMemoria`: cria o botão na barra; clique alterna e chama `aoAlternar` com "lista" e depois "arvore"; modo persiste na chave `CHAVE_MODO`.

- [ ] **Step 2: Rodar e verificar que falham**

Run: `cd base-conhecimento && npm run verificar`
Expected: FALHOU.

- [ ] **Step 3: Implementar**

Só DOM nativo (sem Shadow DOM aqui — a tabela é da página; classes `spro-bc-*`).

- [ ] **Step 4: Rodar e verificar que passam**

Run: `cd base-conhecimento && npm run verificar && npm run tipos`
Expected: todos OK.

- [ ] **Step 5: Commit**

```bash
git add base-conhecimento/src/ui/colunaPasta.ts base-conhecimento/src/ui/botao.ts base-conhecimento/tests/t-ui-coluna.ts
git commit -m "feat(base-conhecimento): coluna Pasta, filtro e botão Pastas"
```

### Task 10: Montagem, entrada, manifest, opções e documentação

**Files:**
- Create: `base-conhecimento/src/pagina/montar.ts`
- Create: `base-conhecimento/src/pagina/consentir-ui.ts` (modal "Entendi" com `criarAbrirModal`)
- Modify: `base-conhecimento/src/main.ts`
- Create: `base-conhecimento/tests/t-montar.ts`
- Modify: `dist/manifest.json`
- Modify: `opcoes-pagina/src/schema-dados.ts`
- Create: `pages/BASECONHECIMENTO.md`
- Modify: `README.md`
- Modify: `docs/mapa-do-legado.md`

**Interfaces:**
- Consumes: Tasks 2–9; `opcaoLegadaLigada`/`lerOpcaoLegada` de `@comum/opcoes/legadas`; `areaChrome` de `@comum/armazenamento/area`; `idDispositivo` de `@comum/armazenamento/dispositivo`; `lerContexto` de `@nucleo/sei`; `travarComLocks`/`travarEsperando` de `@comum/sincronia/trava`; `criarAbrirModal`/`criarConfirmar` de `@comum/ui/dialogo`; `avisar` de `@comum/ui/aviso`.
- Produces:

```ts
// pagina/montar.ts
export function telaAtual(): "listar" | "pesquisar" | null;  // por new URL(location.href).searchParams.get("acao")
export interface DepsMontar { /* área, armazém, sync, leitura, UI — substituíveis em teste */ }
export async function montar(deps: DepsMontar): Promise<() => void>;  // devolve desfazer
// main.ts: side effect — telaAtual() → porta de opção (baseconhecimento) → montar; erro → devolve nativa
```

- [ ] **Step 1: Escrever os testes que falham**

- `telaAtual()` para `acao=base_conhecimento_listar` → "listar"; `acao=base_conhecimento_pesquisar` → "pesquisar"; outra → null.
- `montar` com fakes (itens via `httpRoteado`, repo `areaMemoria`, sync fake, doc da fixture): pinta o painel, prepara a coluna, aplica o filtro da pasta selecionada e o caption; falha do HTTP → chama a devolução da tela nativa (sem lançar para fora).
- `montar` com `acao=base_conhecimento_pesquisar`: injeta só o link "Ver pastas" (href do menu `base_conhecimento_listar`).

- [ ] **Step 2: Rodar e verificar que falham**

Run: `cd base-conhecimento && npm run verificar`
Expected: FALHOU.

- [ ] **Step 3: Implementar `montar`/`main`**

`main.ts`: marca `document.documentElement` com `data-seipro-base-conhecimento` no `document_start`; decide por `telaAtual()`; lê `baseconhecimento` via `opcaoLegadaLigada` (com `chrome.storage.onChanged` para religar/desligar); monta `carimbo` com `idDispositivo`; cria o `RepositorioArvore`, a `SincroniaBase` (com `armazemDoTexto` quando `armazemNaTela`), o painel, a coluna/filtro e o botão; "Entendi" via `perguntarEntendi` antes da primeira gravação; qualquer falha desfaz e devolve a tela nativa.

- [ ] **Step 4: Rodar e verificar que passam (build completo)**

Run: `cd base-conhecimento && npm run verificar && npm run tipos && npm run build && npm run checar`
Expected: todos OK; bundle ASCII (portão do build).

- [ ] **Step 5: Registrar no manifest e nas opções**

Em `dist/manifest.json`, inserir após o bloco de `js/init_grade_controle.js` um bloco idêntico (mesmos `matches`/`exclude_matches` canônicos, `all_frames: true`, `run_at: "document_start"`) com `"js": ["js/init_base_conhecimento.js"]`. Em `opcoes-pagina/src/schema-dados.ts`, acrescentar em `SECOES_GERAL`:

```ts
{
  nome: "baseconhecimento",
  rotulo: "Base de Conhecimento em pastas (árvore de pastas e coluna 'Pasta' na lista)",
  ajuda: "Organiza a Base de Conhecimento da unidade em pastas hierárquicas, com filtro por pasta na lista. A organização fica num Texto Padrão da unidade (consentimento na primeira gravação).",
  tipo: "chave",
  icone: "fa fa-folder-open",
  manual: "BASECONHECIMENTO",
  padrao: true,
  visivelEm: "lab",
},
```

- [ ] **Step 6: Documentação**

`pages/BASECONHECIMENTO.md` no molde das páginas de ajuda (o que faz, como organizar, consentimento/privacidade — nada além de ids+títulos vai ao Texto Padrão —, solução de problemas). `README.md`: bullet na seção "Ferramentas do processo" com `![...](img/icon-agruparlista.png) [Base de Conhecimento em pastas](./pages/BASECONHECIMENTO.md)`. `docs/mapa-do-legado.md`: acrescentar `base-conhecimento` à tabela "Já refatorado" e nota em 4.1 sobre o bloco novo no manifest (receita do Firefox em `tools/`, privada, fica para o autor).

- [ ] **Step 7: Rodar tudo e conferir**

Run: `cd base-conhecimento && npm run verificar && npm run tipos && npm run build && npm run checar; cd ../opcoes-pagina && npm run tipos && npm run verificar`
Expected: todos OK.

- [ ] **Step 8: Commit**

```bash
git add base-conhecimento/src/pagina/montar.ts base-conhecimento/src/pagina/consentir-ui.ts base-conhecimento/src/main.ts base-conhecimento/tests/t-montar.ts dist/manifest.json opcoes-pagina/src/schema-dados.ts pages/BASECONHECIMENTO.md README.md docs/mapa-do-legado.md dist/js/init_base_conhecimento.js
git commit -m "feat(base-conhecimento): montagem na tela, manifest, opção e documentação"
```

### Task 11: Validação ao vivo e roteiro de teste

**Files:**
- Create: `docs/base-conhecimento/roteiro-teste.md`

**Interfaces:**
- Consumes: tudo (extensão carregada como descompactada com `dist/`).

- [ ] **Step 1: Escrever o roteiro de teste manual**

Cenários, um por seção: carregar a extensão (`chrome://extensions` → Carregar sem compactação → `dist/`); abrir `base_conhecimento_listar`; criar pasta; mover itens por arrastar e pelo menu; filtro ao clicar na pasta (linhas escondidas, caption atualizado); excluir pasta → itens em "Sem pasta"; reordenar tabela (tablesorter) → filtro reaplicado; desligar a opção nas configurações → tela nativa; outro perfil de navegador com o mesmo SEI → árvore chega pelo Texto Padrão; consentimento "Entendi" aparece antes da primeira gravação; usuário sem permissão de Texto Padrão → aviso de leitura; **conferir que nenhum item da Base de Conhecimento foi criado/alterado/excluído** (só o Texto Padrão `[_SEIPRO_BC_UNIDADE]`). Comando de conferência de portões: `node tools/check-dom-injection.mjs` e `node tools/patch-manifests.mjs --check` (se existirem na máquina do autor).

- [ ] **Step 2: Executar o roteiro no SEI real**

Rodar com o usuário (navegador real + Chrome DevTools MCP, somente leitura nas telas nativas; escritas só nas pastas da árvore e no Texto Padrão da unidade). Registrar o resultado no próprio roteiro (data e ambiente).

- [ ] **Step 3: Commit**

```bash
git add docs/base-conhecimento/roteiro-teste.md
git commit -m "docs(base-conhecimento): roteiro de teste ao vivo"
```

---

## Self-review

1. **Spec coverage:** desenho.md coberto — leitura paginada (T2), envelope/contrato (T3/T6), CRUD de pastas (T4), mesclagem/"Sem pasta"/órfãos (T5), motor + consentimento + modo leitura (T6/T7), painel Shadow DOM com acessibilidade (T8), coluna/filtro/botão (T9), montagem/opção/manifest/docs (T10), prova ao vivo (T11).
2. **Step scan:** cada passo tem um resultado conferível (comando + esperado ou assinatura exata).
3. **Type consistency:** nomes usados igualmente entre tarefas (`RepositorioArvore`, `montarExibicao`, `caminhoDaPasta`, `adaptadorBaseConhecimento`, `ligarSincronia`, `montarPainel`, `prepararTabela`, `CHAVE_MODO`).
4. **Review Focus:** os 5 itens têm teste na tarefa dona (T5×2, T6/T7, T4/T7, T2/T8).
5. **Proportion:** plano enxuto em relação ao spec + 2 relatórios de padrões; corpos só onde o implementador não decidiria sozinho.
