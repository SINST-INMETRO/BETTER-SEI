# Base de Conhecimento: criar em contexto e numerar pastas — plano

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** (1) Criar um item da Base de Conhecimento pelo botão **Nova** do SEI com uma pasta selecionada passa a organizá-lo **naquela pasta** — com prévia do destino, desfazer e regras de segurança; (2) as pastas podem ser exibidas com **numeradores** de ordem ("1. Pasta", "1.1 Sub-pasta", "1.1.1 Sub-sub-pasta"), ligados/desligados na **aba "Conhecimento" do painel lateral** (clique no ícone da extensão).

**Architecture:** O SEI cria o item no nível dele e volta à lista com `acao_origem=base_conhecimento_cadastrar&id_base_conhecimento=<id>&resultado=1` (sinal confirmado ao vivo). O módulo grava uma **intenção de uso único** (pasta escolhida) ao clicar em `#btnNova`, mostra a prévia na tela de cadastro e, ao detectar o retorno, associa o item à pasta via `repo.moverVinculo` (escrita normal, com consentimento e modo leitura respeitados). A numeração é **só apresentação**: calculada da posição dos irmãos na árvore exibida (`PastaExibida[]`, já ordenada por `ordem`), controlada pela preferência `spro_bc_numerar` em `chrome.storage.local` (padrão: desligada) e aplicada na árvore, nos caminhos e na coluna "Pasta"; o Texto Padrão da unidade **nunca** recebe números. Novo módulo `arvore/numeracao.ts` e `pagina/novaEmContexto.ts`; `ui/aviso.ts` ganha ação; o painel lateral ganha a aba "Conhecimento" (mesmo padrão de abas de favoritos/histórico/projetos/demandas — shell intocado em `sei-comum`).

**Tech Stack:** TypeScript 5.9, esbuild (IIFE/ESM, chrome116/firefox115, ASCII), tsx+linkedom, `sei-comum` (`Area`, `@comum/painel/shell`, `@comum/ui/dom`), repositório/motor existentes do pacote. Sem jQuery, sem `innerHTML`, sem mudança de manifest (a tela `base_conhecimento_cadastrar` já é coberta pelos `matches`; `js/init_base_conhecimento.js` já está nos content scripts).

**Spec:** regras aprovadas no brainstorm de 25/11/2026 (abaixo, seção "Regras de mitigação"); decisões de numeração aprovadas em 25/11/2026 (abaixo, seção "Numeração"); base do módulo em `docs/base-conhecimento/desenho.md`.

## Regras de mitigação (spec)

1. **Criar em contexto, nunca às cegas.** Só há intenção quando uma pasta está selecionada ao clicar em **Nova**. "Sem pasta"/nada selecionado = comportamento atual (raiz).
2. **Mostrar o destino antes.** Na tela de cadastro, uma faixa no visual do SEI: “Será organizado em: `{caminho}`” com botão **Não organizar** (limpa a intenção; nada é gravado).
3. **Nunca silencioso.** Ao voltar, um aviso diz onde o documento ficou — ou o que impediu a organização.
4. **Desfazer.** O aviso de sucesso tem a ação **Desfazer**, que devolve o item a "Sem pasta".
5. **Intenção de uso único e com prazo.** A intenção vale **uma vez**, expira em **10 min**, e é limpa quando: aplicada, cancelada ("Não organizar"), a lista volta **sem** o sinal de criação, o host/unidade não bate, ou a pasta deixou de existir.
6. **Nunca sobrescrever organização existente.** Se o item já tem vínculo vivo em uma pasta (ex.: colega organizou antes), a intenção é descartada sem aviso e sem gravação.
7. **Consentimento e permissão (decisão A).** Sem o "Entendi" ou em modo leitura, **não organiza**: o item fica em "Sem pasta" e o aviso oferece a ação **Entendi e organizar** (pergunta o "Entendi" e então associa). Leitura estrita não oferece a ação.
8. **Concorrência segura.** A associação usa `repo.moverVinculo` (upsert com carimbo); a mesclagem do motor segue intacta; nada se perde.
9. **Só no fluxo de criação.** Nada acontece em edição ou "Nova versão" (o vínculo é pelo `agrupador`, estável entre versões).
10. **Acessibilidade.** Faixa e aviso: texto legível (contraste AA), ação por teclado (botão de 44 px, foco visível), `aria-live`/`role=status` no aviso; sem `window.prompt`/`confirm`/`alert`.

## Numeração (spec, decisões aprovadas)

- **Formato posicional:** `1.`, `1.1`, `1.1.1` — posição dos irmãos (1-based), recalculada na exibição; **mover ou inserir pasta renumera os irmãos** (nada é gravado; a ordem é a da árvore exibida). Nome exibido: `"{n}. {nome}"` ("1. Fiscalização"); caminho: "1. Fiscalização › 1.1 Notas Técnicas".
- **Preferência:** chave `spro_bc_numerar` em `chrome.storage.local`, valores `"sim" | "nao"`, **padrão `"nao"`** (desligada — quem instala não muda o comportamento atual; contribuição segura ao repositório original). **Por navegador**, só apresentação.
- **Onde aparece (quando ligada):** árvore de pastas, coluna "Pasta" da lista, diálogo "Mover para…", avisos, faixa do cadastro. "Sem pasta" nunca é numerado.
- **Ao vivo:** mudar a preferência (aba "Conhecimento" ou outra janela) remonta o módulo na aba aberta; a árvore volta ao estado padrão (recolhidas/seleção zeram — aceito, alternar é raro).
- **Onde configurar:** aba **"Conhecimento"** do painel lateral (clique no ícone da extensão), que só aparece se `js/init_base_conhecimento.js` está no manifest — mesmo padrão `temX` das outras abas; nada muda em `sei-comum`.

## Design da UI (frontend-design)

- **Linguagem visual do SEI** (a brief fixa o padrão — nada de estética genérica): azul de cabeçalho `#155f9b`, texto `#212529`, secundário `#495057`, borda `#dee2e6`, fonte `system-ui`, 12 px; a faixa do cadastro usa o mesmo azul de destaque do painel (`#e7f0f8` com texto `#155f9b`).
- **Aba "Conhecimento"** (página própria, `base.css` da sei-comum como as outras abas): título "Base de Conhecimento", um único interruptor rotulado **"Numerar pastas"** com a explicação `Mostra a ordem antes dos nomes: 1. Pasta, 1.1 Sub-pasta, 1.1.1 Sub-sub-pasta.` e a nota `Vale só neste navegador. Aparece na árvore, nos caminhos e na coluna Pasta; mover ou reordenar pastas renumera automaticamente.` — página quieta, sem decoração; o acento da feature fica nas telas do SEI.
- **Um único acento**: a barra azul do aviso; a faixa é silenciosa (fundo claro, só o essencial).
- **Copy** (frases exatas, voz ativa, sem "Sistema não pôde…"):
  - Faixa: `Será organizado em: "{caminho}".` + botão `Não organizar`.
  - Sucesso: `Documento criado em "{caminho}".` + ação `Desfazer`.
  - Sem consentimento: `Documento criado em Sem pasta. Aceite o "Entendi" para organizá-lo em "{caminho}".` + ação `Entendi e organizar`.
  - Pasta sumiu: `A pasta escolhida não existe mais; o documento ficou em Sem pasta.`
  - Item não localizado: `O documento criado não foi localizado na lista; organize-o manualmente.`
- **Um trabalho por mensagem**: cada aviso faz uma afirmação e oferece no máximo uma ação.

## Global Constraints

- Mundo isolado; Shadow DOM para a UI nova; sem `innerHTML`/`insertAdjacentHTML`; sem jQuery.
- Única escrita no SEI: o Texto Padrão da árvore (nunca itens da Base de Conhecimento); a numeração **nunca** entra no Texto Padrão (só exibição).
- Alvos de 44 px; `:focus-visible`; contraste AA (tokens aprovados); `role="status"`/`aria-live="polite"` no aviso; `aria-label` nos botões de ação; o interruptor da página usa `<label>` + `<input type="checkbox">` nativo.
- TTL da intenção: `10 * 60_000` ms; chave no `chrome.storage.local`: `spro_bc_nova_pasta`.
- `sei-comum` intocado; a aba nova é condicional ao manifest (`js/init_base_conhecimento.js`), padrão `temX` do shell.
- Build ASCII; testes via `npm run verificar` (tsx+linkedom); `npm run tipos`; `npm run checar`; PT-BR na UI.
- Sem mudanças em `dist/manifest.json`.

## Review Focus

1. Mover/inserir um irmão muda os números dos irmãos seguintes na exibição (numeradores posicionais; nada gravado, nenhum dado antigo preserva número).
2. Pasta fora da árvore com numeração ligada: nome intacto e caminho sem número (nunca "undefined." ou vazio quebrado).
3. Preferência ausente ou com valor estranho ("abc"): vale o padrão **desligada**; mudança em outra aba remonta o módulo sem erro.
4. Numeração não vaza para o dado compartilhado: gravar/mover pasta e vínculos continua produzindo o mesmo envelope de antes (sem números).
5. Retorno de criação com `id` que **não está na lista** (paginação/permissão): limpa a intenção e avisa "não localizado", nunca inventa vínculo.

---

### Task 1: Numeradores de ordem (`arvore/numeracao.ts`)

**Files:**
- Create: `base-conhecimento/src/arvore/numeracao.ts`
- Test: `base-conhecimento/tests/t-numeracao.ts`

**Interfaces:**
- Consumes: `PastaExibida` de `../arvore/mesclar` (campos `id`, `nome`, `pai: string | null`, `filhas`; `filhas` e raízes já vêm ordenadas por `ordem`).
- Produces:

```ts
/** "1", "1.2", "2.1.3" (posição dos irmãos, 1-based); "" se a pasta não está na árvore. */
export function numeroDaPasta(pastas: PastaExibida[], id: string): string;
/** "1.2. Fiscalização" quando há número; senão o próprio nome. */
export function nomeNumerado(nome: string, numero: string): string;
```

- [ ] **Step 1: Testes que falham** — `numeroDaPasta`: raiz única → `"1"`; 2ª raiz → `"2"`; 1ª filha da 2ª raiz → `"2.1"`; 3ª filha da 1ª filha da 1ª raiz → `"1.1.3"` (montar a árvore com `montarExibicao` de fixture existente ou `PastaExibida` feitas à mão, com `ordem` que dê essa ordem); id inexistente → `""`; `nomeNumerado("Fiscalização", "")` → `"Fiscalização"`; `nomeNumerado("Fiscalização", "1.2")` → `"1.2. Fiscalização"`.

- [ ] **Step 2: Rodar e ver falhar** — `cd base-conhecimento && npx tsx tests/verificar.ts`; esperado: FALHOU (módulo ausente).

- [ ] **Step 3: Implementar** — indexar `id → PastaExibida` num `Map` (mesmo padrão de `caminhoDaPasta`); para o alvo, subir a cadeia de `pai` calculando a posição (índice no array `filhas` do pai, ou nas raízes, +1), com conjunto `vistos` contra ciclo; juntar com `"."` na ordem raiz→alvo.

- [ ] **Step 4: Rodar e ver passar** — `npm run verificar && npm run tipos && npm run checar`.

- [ ] **Step 5: Commit** — `feat(base-conhecimento): numeradores de ordem das pastas`.

### Task 2: Preferência e aplicação da numeração na exibição

**Files:**
- Create: `base-conhecimento/src/preferencias.ts`
- Modify: `base-conhecimento/src/arvore/mesclar.ts` (`caminhoDaPasta` ganha parâmetro opcional)
- Modify: `base-conhecimento/src/pagina/montar.ts` (`DepsMontar.numerar`; repassa ao painel, à coluna e aos caminhos)
- Modify: `base-conhecimento/src/ui/painel.ts` (`EstadoPainel.numerar`; rótulo numerado)
- Modify: `base-conhecimento/src/ui/dialogos.ts` (`escolherPasta` ganha `numerar`)
- Modify: `base-conhecimento/src/main.ts` (ler a preferência; remontar ao trocar)
- Test: `base-conhecimento/tests/t-numeracao.ts` (estende), `base-conhecimento/tests/t-montar.ts`, `base-conhecimento/tests/t-mesclar.ts` (se existir), `base-conhecimento/tests/t-ui-dialogos.ts` (ou onde `escolherPasta` é testado)

**Interfaces:**
- Consumes: Task 1 (`numeroDaPasta`, `nomeNumerado`).
- Produces:

```ts
// preferencias.ts
export const CHAVE_NUMERAR = "spro_bc_numerar";
export const PADRAO_NUMERAR = "nao";
/** true só quando a chave guarda "sim". */
export async function lerNumeracao(area: Area): Promise<boolean>;

// mesclar.ts — assinatura nova (compatível):
export function caminhoDaPasta(pastas: PastaExibida[], id: string, numerar?: boolean): string;

// montar.ts — DepsMontar ganha:
numerar: boolean;
// e `escolherPasta` ganha o repasse:
escolherPasta: (pastas: PastaExibida[], atual: string | null, numerar?: boolean) => Promise<{ pasta: string | null } | null>;

// dialogos.ts
escolherPasta(pastas: PastaExibida[], atual: string | null, numerar?: boolean): Promise<{ pasta: string | null } | null>;
```

Comportamento: `caminhoDaPasta(..., true)` prefixa cada segmento com `nomeNumerado(nome, numeroDaPasta(...))`; `false`/ausente mantém a saída atual, byte a byte. `montar` usa o `numerar` recebido: no `rotuloDe` da coluna (hoje `caminhoDaPasta(exibicao.pastas, vinculo.pasta)`), nos caminhos dos avisos/confirmações e na montagem do painel; `EstadoPainel` ganha `numerar: boolean` e o render usa `nomeNumerado(p.nome, numeroDaPasta(pastas, p.id))` no `span` do nome (contagem e chevrons intactos). `main.ts`: antes de `montar`, `const numerar = await lerNumeracao(area)`; no listener `chrome.storage.onChanged` existente em `partir()`, se `area === "local" && CHAVE_NUMERAR in m && desfazer` → `desfazer(); desfazer = null; iniciar()` (remonta; recolhidas/seleção zeram — aceito).

- [ ] **Step 1: Testes que falham** — (a) `lerNumeracao`: chave ausente → false; `"sim"` → true; `"nao"` → false; `"abc"` → false. (b) `caminhoDaPasta(pastas, id, true)` na árvore fixture → `"1. Fiscalização › 1.1 Notas Técnicas"`; com `false`/ausente → idêntico ao comportamento atual (teste existente continua passando). (c) Painel com `numerar: true` renderiza `"1. Fiscalização"` no span do nome e a contagem do documento intacta; com `false` renderiza `"Fiscalização"`. (d) `escolherPasta(pastas, atual, true)` produz opção com texto `"1. Fiscalização › 1.1 Notas Técnicas"`. (e) Gravar/mover pasta e vínculo com numeração ligada produz o **mesmo** envelope de antes (sem números no Texto Padrão).

- [ ] **Step 2: Rodar e ver falhar** — `npm run verificar`.

- [ ] **Step 3: Implementar** — conforme as assinaturas acima; no `painel.ts`, calcular o número por nó no render (árvores são pequenas; sem cache persistente); `dialogos.ts` repassa o `numerar` para `caminhoDaPasta`.

- [ ] **Step 4: Rodar e ver passar** — `npm run verificar && npm run tipos && npm run checar && npm run build`.

- [ ] **Step 5: Commit** — `feat(base-conhecimento): numeracao opcional na exibicao (preferencia local)`.

### Task 3: Aba "Conhecimento" no painel lateral

**Files:**
- Modify: `favoritos/src/shell/painel.ts` (`AbaPainel`, `DepsShell.temConhecimento`, `ferramentasDoPacote`, `ABAS`, nova `DefAba`)
- Create: `base-conhecimento/estatico/painel.html` (página da aba)
- Create: `base-conhecimento/src/painel/main.ts` (entrada ESM da página)
- Modify: `base-conhecimento/build.mjs` (2ª entrada ESM → `dist/js/base-conhecimento/painel.js`; copiar `estatico/painel.html` → `dist/html/base-conhecimento.html`; CSS `base.css` da sei-comum + `estatico/painel.css` → `dist/css/base-conhecimento.css`)
- Modify: `favoritos/tests/verificar-painel.ts` (e testes do shell que listam abas/`ferramentasDoPacote`)
- Test: `base-conhecimento/tests/t-painel.ts`

**Interfaces:**
- Consumes: Task 2 (`CHAVE_NUMERAR`, `PADRAO_NUMERAR`, `lerNumeracao`); `@comum/armazenamento/area` (`areaChrome`); `@comum/painel/shell` (`DefAba { id, rotulo, icone, caminho, titulo }`, `montarAbas`); `@comum/ui/dom` (`h`, `icone` — `"pasta"` existe em `ICONES`).
- Produces:

```ts
// favoritos/src/shell/painel.ts
export type AbaPainel = "favoritos" | "historico" | "projetos" | "demandas" | "conhecimento" | "agente";
// DepsShell ganha: temConhecimento?: boolean;
// ferramentasDoPacote ganha: temConhecimento: tem("js/init_base_conhecimento.js");
// ABAS (abaPedidaNoEndereco) ganha "conhecimento" (antes de "agente");
// Nova DefAba, só quando d.temConhecimento === true, entre "demandas" e "agente":
{ id: "conhecimento", rotulo: "Conhecimento", icone: "pasta", caminho: "html/base-conhecimento.html#modo=lateral", titulo: "Base de Conhecimento em pastas" }

// base-conhecimento/src/painel/main.ts
export function montarPagina(raiz: HTMLElement, area: Area, hoje?: () => number): { destruir(): void };
```

A página: título "Base de Conhecimento"; `<label><input type="checkbox"> Numerar pastas</label>` com a explicação `Mostra a ordem antes dos nomes: 1. Pasta, 1.1 Sub-pasta, 1.1.1 Sub-sub-pasta.` e a nota `Vale só neste navegador. Aparece na árvore, nos caminhos e na coluna Pasta; mover ou reordenar pastas renumera automaticamente.`; ao marcar/desmarcar, `area.gravar({ [CHAVE_NUMERAR]: checked ? "sim" : "nao" })`; estado inicial lido da área (ausente/estranho = desmarcado). Tudo por `textContent`/DOM, sem `innerHTML` com dado; CSS próprio pequeno (mesmos tokens do aviso: `#155f9b`, `#212529`, `#495057`).

- [ ] **Step 1: Testes que falham** — (a) Shell: `ferramentasDoPacote` com manifest contendo `js/init_base_conhecimento.js` → `temConhecimento: true`; sem → `false`; `abaPedidaNoEndereco("#aba=conhecimento")` → `"conhecimento"`; `montarShell` com `temConhecimento: true` cria a aba com `id "conhecimento"`, `rotulo "Conhecimento"`, `caminho "html/base-conhecimento.html#modo=lateral"` e a ordem `favoritos, historico, projetos, demandas, conhecimento, agente`; com `temConhecimento: false`, nenhuma aba de conhecimento. (b) Página: `montarPagina` com área vazia → checkbox desmarcado; marcar → `area.gravar` recebeu `{ spro_bc_numerar: "sim" }`; desmarcar → `"nao"`; área com `"sim"` → checkbox marcado; a nota e a explicação estão presentes; sem `innerHTML` com dado.

- [ ] **Step 2: Rodar e ver falhar** — `cd base-conhecimento && npx tsx tests/verificar.ts` e `cd ../favoritos && npm run verificar` (comando exato da suíte do favoritos; ver `favoritos/package.json`).

- [ ] **Step 3: Implementar** — shell conforme os blocos acima (não tocar em `sei-comum`); página + entrada + build seguindo o padrão do `historico/build.mjs` (entrada ESM, cópia do HTML, concat de `base.css` + CSS próprio, conferência ASCII para a nova saída).

- [ ] **Step 4: Rodar e ver passar** — `cd base-conhecimento && npm run verificar && npm run tipos && npm run checar && npm run build` e a suíte do favoritos.

- [ ] **Step 5: Commit** — `feat(base-conhecimento): aba Conhecimento no painel lateral com a opcao de numerar`.

### Task 4: Intenção e sinal de criação (`pagina/novaEmContexto.ts`)

**Files:**
- Create: `base-conhecimento/src/pagina/novaEmContexto.ts`
- Test: `base-conhecimento/tests/t-nova-em-contexto.ts`

**Interfaces:**
- Consumes: `Area` de `@comum/armazenamento/area`; `IdentidadeArvore` de `../arvore/modelo`; `caminhoDaPasta` (com o `numerar` ativo, quando ligado) para o caminho capturado.
- Produces:

```ts
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
export function gravarIntencao(area: Area, ident: IdentidadeArvore, pastaId: string, caminho: string, agora?: number): Promise<void>;
/** Válida (mesma identidade e dentro do TTL); null se ausente ou inválida. */
export function lerIntencao(area: Area, ident: IdentidadeArvore, agora?: number): Promise<Intencao | null>;
export function limparIntencao(area: Area): Promise<void>;
/** `{ id }` quando a URL é o retorno de criação; null nos demais casos. */
export function sinalDeCriacao(url: string): { id: string } | null;
// Regra: resultado === "1" && acao_origem === "base_conhecimento_cadastrar" && id_base_conhecimento numérico
```

- [ ] **Step 1: Testes que falham** — `gravarIntencao`/`lerIntencao` round-trip; `lerIntencao` null quando: ausente, host diferente, unidade diferente, `criadoEm + TTL < agora` (limite exato: `agora - criadoEm === TTL_INTENCAO_MS` ainda é válida); `limparIntencao` remove; `sinalDeCriacao` para a URL real (`...acao=base_conhecimento_listar&acao_origem=base_conhecimento_cadastrar&id_base_conhecimento=54&resultado=1...`) → `{id:"54"}`; para listar comum, pesquisar, e para `resultado=0` → null.

- [ ] **Step 2: Rodar e ver falhar** — `npm run verificar`.

- [ ] **Step 3: Implementar** — `gravarIntencao` grava `{...ident, pastaId, caminho, criadoEm: agora ?? Date.now()}` na chave; `lerIntencao` compara host/unidade e o prazo antes de devolver; `sinalDeCriacao` usa `URL` com try/catch (URL inválida → null).

- [ ] **Step 4: Rodar e ver passar** — `npm run verificar && npm run tipos && npm run checar`.

- [ ] **Step 5: Commit** — `feat(base-conhecimento): intencao de criar na pasta selecionada`.

### Task 5: Aviso com ação (`ui/aviso.ts`) + assinatura de `avisar`

**Files:**
- Modify: `base-conhecimento/src/ui/aviso.ts`, `base-conhecimento/src/ui/aviso.css`
- Modify: `base-conhecimento/src/pagina/montar.ts` (`DepsMontar.avisar`)
- Modify: `base-conhecimento/src/main.ts` (repassar a ação)
- Test: `base-conhecimento/tests/t-ui-aviso.ts`

**Interfaces:**
- Consumes: nada novo.
- Produces:

```ts
export interface AcaoAviso { rotulo: string; fazer(): void; }
export interface Avisos {
  avisar(texto: string, acao?: AcaoAviso): void;
  destruir(): void;
}
// DepsMontar.avisar passa a ser:
avisar: (texto: string, acao?: AcaoAviso) => void;
```

- [ ] **Step 1: Testes que falham** — `avisar("x", {rotulo:"Desfazer", fazer})` renderiza o botão com o rótulo; clicar chama `fazer` e **remove** o aviso; **com ação, o aviso não expira sozinho** (após 40 ms com `duracaoMs:10` ele continua); o botão tem `aria-label` igual ao rótulo e alvo ≥44 px (CSS contém `min-height: 44px`); fechar pelo X continua funcionando; `avisar` sem ação mantém o comportamento atual (expira).

- [ ] **Step 2: Rodar e ver falhar** — `npm run verificar`.

- [ ] **Step 3: Implementar** — no `avisar`, quando há ação: criar `<button class="botao-acao">` (texto por `textContent`, click → `remover(aviso)` + `acao.fazer()`), **não** registrar timer; CSS: botão branco sobre azul, `min-height:44px`, `:focus-visible`. Atualizar `DepsMontar.avisar` e o `main` (`avisar: (t, a) => avisos.avisar(t, a)`); os fakes de teste de `t-montar` seguem compilando (parâmetro opcional).

- [ ] **Step 4: Rodar e ver passar** — suíte completa.

- [ ] **Step 5: Commit** — `feat(base-conhecimento): aviso com acao (desfazer/organizar)`.

### Task 6: Aplicar a intenção na volta (`pagina/montar.ts`)

**Files:**
- Modify: `base-conhecimento/src/pagina/montar.ts`
- Test: `base-conhecimento/tests/t-montar.ts`

**Interfaces:**
- Consumes: Task 4 (`gravarIntencao`, `lerIntencao`, `limparIntencao`, `sinalDeCriacao`), Task 5 (`AcaoAviso` no `avisar`), `perguntarEntendi`/`consentimentoBase` existentes, `caminhoDaPasta` (numerado quando `numerar` ativo) e `nomeNumerado` para o caminho da faixa/avisos.
- Produces: nada público novo (comportamento interno do `montar`).

Comportamento (regras 1–9):
- **Captura**: `montar` assina `click` em `#btnNova` (se existir): se `selecionada !== null` e a pasta está viva, `gravarIntencao(area, ident, selecionada, caminhoDaPasta(exibicao.pastas, selecionada, numerar))`; desfazer remove o listener.
- **Retorno**: ao montar, se `sinalDeCriacao(d.url)` devolve `{id}`:
  1. `const intencao = await lerIntencao(area, ident)`; se null → nada.
  2. Achar o item na lista por `item.id === id`; se não achar → `limparIntencao` + `avisar("O documento criado não foi localizado na lista; organize-o manualmente.")` e fim.
  3. Se já há vínculo vivo com `pasta !== null` para o `agrupador` → `limparIntencao` e fim (regra 6).
  4. Se a pasta da intenção não está viva em `exibicao.pastas` → `limparIntencao` + aviso "pasta não existe mais".
  5. Se `somenteLeitura()` → `limparIntencao` + aviso "Documento criado em Sem pasta." (sem ação).
  6. Consentimento: `consentimentoBase(...).estado() !== "ligado"` → aviso `Documento criado em Sem pasta. Aceite o "Entendi" para organizá-lo em "{intencao.caminho}".` com ação `Entendi e organizar` → `perguntarEntendi`; se recusar, nada; se aceitar, prossegue.
  7. `await repo.moverVinculo(agrupador, intencao.pastaId, item.titulo)`; `limparIntencao`; `recolhidas.delete(intencao.pastaId)`; `refrescar()`; aviso `Documento criado em "{intencao.caminho}".` com ação `Desfazer` → `repo.removerVinculo(agrupador)` + `refrescar()`.
- **Limpeza por retorno sem criação**: se a URL é a lista **sem** `sinalDeCriacao`, e há intenção válida, limpar (usuário cancelou; regra 5).

- [ ] **Step 1: Testes que falham** (integração com fakes, área de memória e fixture):

- `montar` com URL de retorno (`...&acao_origem=base_conhecimento_cadastrar&id_base_conhecimento=42&resultado=1`), intenção pré-gravada para a pasta `p1` (pré-populada na área) e item 42 na lista (fixture) → vínculo `40` criado com `pasta: "p1"`; aviso com "Desfazer"; intenção limpa.
- Desfazer: chamar a ação capturada do `avisar` fake → vínculo some (lápide) e a UI atualiza.
- `id` não presente na lista → intenção limpa e aviso "não localizado".
- Vínculo vivo já existente para o agrupador → nada gravado, intenção limpa, sem aviso.
- Sem consentimento: aviso com ação "Entendi e organizar"; aceitar → associa; recusar → não associa e intenção limpa.
- Pasta da intenção removida → aviso "não existe mais", sem gravação.
- URL de lista sem sinal, com intenção válida → intenção limpa, sem aviso.
- Com `numerar: true`, a intenção capturada e o aviso de sucesso usam o caminho numerado ("1. Fiscalização"); o vínculo gravado não contém número.

- [ ] **Step 2: Rodar e ver falhar** — `npm run verificar`.

- [ ] **Step 3: Implementar** — fluxo acima dentro de `montar` (função assíncrona `aplicarIntencao()` chamada após a leitura dos itens e a montagem do painel, para os avisos já existirem); `const desligarBotaoNova = ...` no cleanup.

- [ ] **Step 4: Rodar e ver passar** — `npm run verificar && npm run tipos && npm run checar`.

- [ ] **Step 5: Commit** — `feat(base-conhecimento): associar o item criado a pasta selecionada`.

### Task 7: Prévia do destino na tela de cadastro (`main.ts` + `novaEmContexto.ts`)

**Files:**
- Modify: `base-conhecimento/src/pagina/montar.ts` (`telaAtual` ganha `"cadastrar"`)
- Modify: `base-conhecimento/src/pagina/novaEmContexto.ts` (faixa)
- Modify: `base-conhecimento/src/main.ts`
- Test: `base-conhecimento/tests/t-nova-em-contexto.ts`, `base-conhecimento/tests/t-montar.ts`

**Interfaces:**
- Produces:

```ts
export type Tela = "listar" | "pesquisar" | "cadastrar" | null;
export function telaAtual(url?: string): Tela;   // "cadastrar" quando acao === "base_conhecimento_cadastrar"
export function montarFaixaDestino(
  doc: Document,
  intencao: Intencao,
  aoNaoOrganizar: () => void,
): { raiz: HTMLElement; destruir(): void };
// Shadow DOM, fundo #e7f0f8/texto #155f9b, texto: Será organizado em: "{caminho}". Botão "Não organizar" (44px, aria-label).
```

- [ ] **Step 1: Testes que falham** — `telaAtual` para `acao=base_conhecimento_cadastrar` → `"cadastrar"`; `montarFaixaDestino` renderiza o texto com o caminho e o botão "Não organizar"; clicar no botão chama `aoNaoOrganizar` e remove a faixa; sem `innerHTML`; `telaAtual` continua retornando `"listar"`/`"pesquisar"`/null como antes.

- [ ] **Step 2: Rodar e ver falhar** — `npm run verificar`.

- [ ] **Step 3: Implementar** — em `main.ts`: quando `telaAtual() === "cadastrar"`, ler `lerIntencao(area, ident)`; se houver, inserir `montarFaixaDestino` no começo do formulário (alvo: `#frmBaseConhecimentoCadastro`; fallback: primeiro `form` em `#divInfraAreaTelaD`); `aoNaoOrganizar` = `limparIntencao(area)` + `destruir()`. Ajustar `partir()` para tratar `"cadastrar"` sem montar o painel. Adicionar teste de `telaAtual("cadastrar")` no `t-montar`.

- [ ] **Step 4: Rodar e ver passar** — `npm run verificar && npm run tipos && npm run checar && npm run build`.

- [ ] **Step 5: Commit** — `feat(base-conhecimento): faixa de destino na tela de cadastro`.

### Task 8: Documentação, roteiro e auditoria

**Files:**
- Modify: `pages/BASECONHECIMENTO.md`, `docs/base-conhecimento/desenho.md`, `docs/base-conhecimento/roteiro-teste.md`, `docs/base-conhecimento/revisao-acessibilidade.md`

- [ ] **Step 1: Documentar** — na página de ajuda: (a) criar com a pasta selecionada, faixa de destino, "Não organizar", Desfazer, "Entendi e organizar" e o comportamento sem consentimento; (b) numerar pastas: como ligar na aba "Conhecimento" do painel lateral, o formato (1., 1.1, 1.1.1), que vale só naquele navegador, que renumera ao mover/reordenar e que não altera o dado compartilhado. No desenho: seções "Criar em contexto (25/11/2026)" (as 10 regras) e "Numeração (25/11/2026)" (as decisões da seção Numeração). No roteiro: cenários (criar dentro da pasta, prévia no cadastro, cancelar, desfazer, sem consentimento, colega já organizou, pasta removida; ligar/desligar numeração na aba, conferir árvore/caminhos/coluna, renumerar após mover pasta, reabrir o navegador e ver a preferência mantida).
- [ ] **Step 2: Auditoria** — no `revisao-acessibilidade.md`, acrescentar a faixa, o aviso com ação e a página da aba "Conhecimento" (contraste, 44 px, foco, `aria-live`, label nativo do checkbox) e marcar o que depende de medição ao vivo.
- [ ] **Step 3: Suíte completa** — `cd base-conhecimento && npm run verificar && npm run tipos && npm run checar && npm run build`; suíte do favoritos.
- [ ] **Step 4: Commit** — `docs(base-conhecimento): criar em contexto e numeracao — regras, ajuda e roteiro`.

---

## Self-review

1. **Cobertura:** regras 1→T6, 2→T7, 3→T6, 4→T5/T6, 5→T4/T6, 6→T6, 7→T6, 8→T6, 9→T4, 10→T5/T7; numeração (formato→T1, preferência→T2, aba→T3, faixa/avisos→T6/T7, coluna/diálogo→T2, docs→T8).
2. **Etapas conferíveis:** cada passo tem teste, comando e esperado.
3. **Tipos consistentes:** `numeroDaPasta`, `nomeNumerado`, `CHAVE_NUMERAR`, `lerNumeracao`, `caminhoDaPasta(..., numerar?)`, `Intencao`, `CHAVE_INTENCAO`, `TTL_INTENCAO_MS`, `sinalDeCriacao`, `AcaoAviso`, `montarFaixaDestino`, `Tela`, `AbaPainel`, `montarPagina` usados igualmente entre tarefas.
4. **Review Focus:** os 5 itens têm teste na tarefa dona (T1/T2 × 4, T6 × 1).
5. **Proporção:** plano enxuto frente às 10 regras + numeração + fluxos; corpos só onde a assinatura/teste não decide.
