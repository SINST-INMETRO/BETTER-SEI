# Base de Conhecimento — UX de centro de documentação (Fases A+B) — plano

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar a árvore da Base de Conhecimento num navegador de documentação: chevrons de recolher/expandir (início recolhido), documentos dentro das pastas (abrir no SEI), diálogos e avisos com o visual do SEI, arrastar-e-soltar de documentos e pastas com confirmação, e "Nova pasta" criando filha da pasta selecionada.

**Architecture:** Tudo dentro do pacote `base-conhecimento/` (já existente). O painel continua em Shadow DOM; novos módulos `ui/dialogos.ts` (texto/confirmar/escolher pasta), `ui/aviso.ts` (notificação no visual do SEI) e `ui/arrasto.ts` (payload de drag-and-drop). `pagina/montar.ts` orquestra: mantém o conjunto de pastas recolhidas, monta os itens por pasta, confirma movimentos e delega ao repositório (`moverVinculo`/`moverPasta`). A única escrita no SEI continua sendo o Texto Padrão da árvore.

**Tech Stack:** TypeScript 5.9, esbuild (IIFE, chrome116/firefox115, ASCII), tsx+linkedom, `sei-comum` (`h`/`icone`, `Area`), `sei-nucleo` (links assinados já colhidos). Sem jQuery, sem `innerHTML`.

**Spec:** `docs/base-conhecimento/desenho.md` (contrato e decisões da árvore) + `anotacoes.txt` (os 5 pontos corrigidos aqui) + decisões do usuário (arrastar pastas; início recolhido; consolidar A+B).

## Global Constraints

- Mundo isolado; UI nova em **Shadow DOM**; nenhum `innerHTML`/`insertAdjacentHTML`; sem jQuery.
- A única escrita no SEI é o Texto Padrão `[_SEIPRO_BC_UNIDADE]`; itens da Base de Conhecimento nunca são criados/alterados/excluídos.
- Pastas **começam recolhidas** (`recolhidas` = todos os ids ao montar; criar filha expande o pai para mostrar a nova pasta).
- "Nova pasta" cria **filha da pasta selecionada**; com "Sem pasta"/nada selecionado, cria na raiz.
- Arrastar **documentos e pastas**; toda soltura pede confirmação, e a de pasta diz explicitamente que a **pasta** (com subpastas e itens) será movida.
- WCAG 2.1 AA: texto ≥4,5:1, ícones ≥3:1; linhas de 44 px; chevron ≥24×44 (AA 2.5.8; alvo denso, AAA 44 dispensado com nota); `:focus-visible`; `aria-expanded` no chevron; diálogos `role=dialog`/`aria-modal`/`aria-labelledby`, foco inicial, Tab preso, Escape cancela; aviso `role=status`/`aria-live=polite`; arrastar tem alternativa por teclado ("Mover para…").
- Tokens aprovados: texto `#212529`, secundário `#495057`, azul SEI `#155f9b` sobre `#e7f0f8`, borda `#dee2e6`, cabeçalho SEI `#155f9b`.
- Build ASCII (`npm run build`), testes `npm run verificar`, `npm run tipos`, `npm run checar`.
- Textos de UI em pt-BR, com acentos no código-fonte (o esbuild escapa no bundle).

## Review Focus

1. Pasta recolhida com filhos: **nenhum** filho visível, `aria-expanded="false"`, e o chevron alterna **sem** trocar a seleção.
2. Documento dentro de pasta expandida: link abre o item nativo (`visualizar`) em nova aba e o item pode ser arrastado.
3. Mover **pasta** para dentro de si/descendente: a confirmação aparece, o repositório recusa (`ErroArvore`) e um aviso visível explica, sem mudar nada.
4. Diálogo de nome/confirmar: Escape ou fechar **cancela sem gravar**, o foco volta ao botão de origem e Tab não escapa do modal.
5. Nenhum fluxo usa `window.prompt`/`window.confirm` (nome, renomear, excluir, mover, "Entendi"): tudo no visual do SEI.

---

### Task 1: Árvore com chevrons, recolhidas e documentos nas pastas

**Files:**
- Modify: `base-conhecimento/src/ui/painel.ts`
- Modify: `base-conhecimento/src/ui/painel.css`
- Modify: `base-conhecimento/src/pagina/montar.ts`
- Test: `base-conhecimento/tests/t-ui-painel.ts`, `base-conhecimento/tests/t-montar.ts`

**Interfaces:**
- Consumes: `PastaExibida`, `Exibicao`, `ItemBase`, `Vinculo` (existentes).
- Produces:

```ts
// painel.ts — EstadoPainel passa a receber itens por pasta e o conjunto recolhido
export interface EstadoPainel {
  pastas: PastaExibida[];
  semPasta: ItemBase[];
  orfaos: Vinculo[];
  selecionada: string | null;
  busca: string;
  aviso?: string;
  /** Itens vivos por pasta (id da pasta → itens). */
  itensPorPasta: Readonly<Record<string, ItemBase[]>>;
  /** Pastas recolhidas (chevron fechado). */
  recolhidas: ReadonlySet<string>;
}
export interface AcoesPainel {
  aoSelecionar(id: string | null): void;
  aoAlternarPasta(id: string): void;   // chevron
  aoNovaPasta(pai: string | null): void;
  aoRenomear(id: string): void;
  aoExcluir(id: string): void;
  aoMoverItem(agrupador: string): void;
  aoRemoverItem(agrupador: string): void;
  aoBuscar(texto: string): void;
}
```

- [ ] **Step 1: Escrever os testes que falham** (em `t-ui-painel.ts`)

- `render` com `recolhidas: new Set(["p1"])` e `p1` tendo filha: a subpasta **não** aparece; o chevron de `p1` tem `aria-expanded="false"`; houver filhos, `aria-expanded="true"`.
- Clique no chevron de `p1` chama `aoAlternarPasta("p1")` e **não** chama `aoSelecionar`.
- Item dentro de pasta (`itensPorPasta: { p2: [item("40","DOC")] }`, `p2` expandida): aparece `<a class="rotulo" href="…base_conhecimento_visualizar…" target="_blank">DOC</a>` e o botão "Mover para…".
- Item com título `<b>x</b>` continua texto puro (`children.length === 0`).
- Chevron tem `aria-label` "Expandir pasta X"/"Recolher pasta X" e altura ≥44 (CSS contém `min-height: 44px`).

- [ ] **Step 2: Rodar e ver falhando** — `cd base-conhecimento && npx tsx tests/verificar.ts`; esperado: FALHOU (tipos/campos ausentes).

- [ ] **Step 3: Implementar no painel**

- Linha da pasta: `<div class="linha"><button class="chevron" aria-expanded aria-label>▸/▾</button><button class="pasta">…</button><button class="menu">⋯</button></div>`; os filhos (`ul.filhas`) só entram quando **não** recolhida.
- Itens por pasta: dentro de `li` da pasta expandida, `<ul class="filhas itens">` com as linhas de item (link `href=item.visualizar`, `target="_blank"`, `rel="noopener"`, texto por `textContent`) + botão "Mover para…".
- Remover a antiga seção "Itens desta pasta" (`itensDaSelecionada`).
- CSS: `.chevron { min-width: 28px; min-height: 44px; }`, estados recolhido/expandido, `.item .rotulo` como link com cor `#212529` e sublinhado só no hover/focus.

- [ ] **Step 4: Atualizar `montar.ts`**

- `let recolhidas = new Set<string>(exibicao.pastas…todos os ids, recursivo)` (tudo recolhido no início).
- `aoAlternarPasta(id)`: alterna no set e `render()`.
- `itensPorPasta`: mapa `pastaId → itens` a partir dos vínculos vivos (`ent.v`) e `itens`.
- Remover `itensDaSelecionada` do `EstadoPainel` enviado; ajustar testes de montar que dependiam dele.

- [ ] **Step 5: Rodar e ver passar** — `npm run verificar && npm run tipos && npm run checar`; esperado: tudo OK.

- [ ] **Step 6: Commit** — `git commit -m "feat(base-conhecimento): arvore com chevrons, recolhidas e documentos nas pastas"`.

### Task 2: Diálogos com o visual do SEI (nome, confirmar, escolher pasta)

**Files:**
- Create: `base-conhecimento/src/ui/dialogos.ts`, `base-conhecimento/src/ui/dialogos.css`
- Modify: `base-conhecimento/src/main.ts`
- Test: `base-conhecimento/tests/t-ui-dialogos.ts`

**Interfaces:**
- Produces:

```ts
export interface Dialogos {
  pedirTexto(rotulo: string, valorInicial?: string): Promise<string | null>;
  confirmar(texto: string): Promise<boolean>;
  escolherPasta(pastas: PastaExibida[], atual: string | null): Promise<{ pasta: string | null } | null>;
  destruir(): void;
}
export function criarDialogos(o?: { doc?: Document; css?: string }): Dialogos;
```

- [ ] **Step 1: Testes que falham** (linkedom)

- `pedirTexto("Nome da pasta", "X")`: abre `[role="dialog"][aria-modal="true"]` com `aria-labelledby`, input com label, valor inicial "X"; OK resolve `"Y"`; Escape resolve `null`; fechar pelo X resolve `null`.
- `confirmar("Excluir?")`: OK `true`; Escape/“Cancelar” `false`.
- `escolherPasta(pastas, atual)`: lista os caminhos (`Fiscalização › Notas`) + "Sem pasta"; escolher resolve `{ pasta: id }`; Escape `null`; a opção atual vem marcada.
- `destruir()` remove o host do documento.

- [ ] **Step 2: Rodar e ver falhando** — esperado: FALHOU (módulo ausente).

- [ ] **Step 3: Implementar**

- Host próprio com `attachShadow`; overlay `position:fixed`; caixa branca, título `#155f9b`, botões primário/secundário (≥44 px); input com borda `#ced4da`.
- Foco inicial no input/botão primário; Tab preso (keydown Tab no último/primeiro); Escape = cancelar; devolver o foco ao elemento ativo de origem.
- Textos: "Nome da pasta", "Renomear pasta", "Confirmar", "Cancelar", "Mover para qual pasta?".

- [ ] **Step 4: Integrar no `main.ts`**

- `const dialogos = criarDialogos({ css: cssDialogos })`; `pedirTexto`/`confirmar`/`escolherPasta` do `montar` passam a usar `dialogos.*` (remover `window.prompt`/`window.confirm`); `desfazer`/`partir` chama `dialogos.destruir()` ao desmontar.

- [ ] **Step 5: Rodar e ver passar** — `npm run verificar && npm run tipos && npm run checar`.

- [ ] **Step 6: Commit** — `git commit -m "feat(base-conhecimento): dialogos com o visual do SEI"`.

### Task 3: Aviso no visual do SEI

**Files:**
- Create: `base-conhecimento/src/ui/aviso.ts`, `base-conhecimento/src/ui/aviso.css`
- Modify: `base-conhecimento/src/main.ts`
- Test: `base-conhecimento/tests/t-ui-aviso.ts`

**Interfaces:**
- Produces:

```ts
export interface Avisos {
  avisar(texto: string): void;
  destruir(): void;
}
export function criarAvisos(o?: { doc?: Document; css?: string; duracaoMs?: number }): Avisos;
```

- [ ] **Step 1: Testes que falham**

- `avisar("Pasta criada")` cria um nó `[role="status"][aria-live="polite"]` com o texto; o contêiner fica fixo no topo direito (CSS contém `position: fixed`).
- Botão de fechar (com `aria-label`) remove o aviso; `duracaoMs: 10` remove sozinho (aguardar ~30 ms).
- Dois avisos seguidos aparecem os dois; `destruir()` remove o host e limpa timers.

- [ ] **Step 2: Rodar e ver falhando**.

- [ ] **Step 3: Implementar** — host com Shadow DOM anexado ao `body`; barra azul `#0494c7` (visual do `infraAviso` do SEI), texto branco, botão de fechar; empilhamento; timer por aviso.

- [ ] **Step 4: Integrar no `main.ts`** — `avisar: (texto) => avisos.avisar(texto)` (substitui `avisarPro` do `sei-comum` neste módulo); destruir no desmonte.

- [ ] **Step 5: Rodar e ver passar** e **Commit** — `feat(base-conhecimento): aviso no visual do SEI`.

### Task 4: Arrastar-e-soltar (documentos e pastas) com confirmação + "Nova pasta" filha

**Files:**
- Create: `base-conhecimento/src/ui/arrasto.ts`
- Modify: `base-conhecimento/src/ui/painel.ts`, `base-conhecimento/src/ui/painel.css`
- Modify: `base-conhecimento/src/pagina/montar.ts`
- Test: `base-conhecimento/tests/t-ui-arrasto.ts`, `base-conhecimento/tests/t-painel-arrasto.ts`, `base-conhecimento/tests/t-montar.ts`

**Interfaces:**
- Produces:

```ts
// ui/arrasto.ts
export const MIME_ARRASTO = "application/x-seipro-base-conhecimento";
export type PayloadArrasto = { tipo: "item"; agrupador: string } | { tipo: "pasta"; id: string };
export function serializarArrasto(p: PayloadArrasto): string;
export function lerArrasto(dt: DataTransfer | null): PayloadArrasto | null;

// AcoesPainel ganha:
// aoSoltar(payload: PayloadArrasto, destino: string | null): void;
// e o botao "Nova pasta" passa a chamar aoNovaPasta(atual.selecionada)
```

- [ ] **Step 1: Testes que falham**

- `serializarArrasto`/`lerArrasto` ida e volta; MIME errado → null.
- No painel: item e linha de pasta têm `draggable="true"`; `dragstart` grava o payload no `DataTransfer` (fake com `setData`/`getData`); `dragover` em uma pasta marca `alvo`; `drop` chama `aoSoltar({tipo:"item",agrupador:"40"}, "p2")`.
- Botão "Nova pasta" com `selecionada: "p1"` chama `aoNovaPasta("p1")` (não `null`).
- Em `montar`: soltar item na pasta P abre confirmação cujo texto contém o título e o caminho; confirmando, `moverVinculo` é chamado (verificar o vínculo na área) e a UI atualiza; cancelando, nada muda.
- Soltar **pasta** em outra pasta: a confirmação contém a palavra "pasta" e o nome; confirmando, `moverPasta` aplica; cancelando, nada muda; soltar pasta em descendente própria → aviso e nada muda.
- Criar pasta com `selecionada = "p1"` cria com `pai = "p1"`, expande `p1` e seleciona a nova.

- [ ] **Step 2: Rodar e ver falhando**.

- [ ] **Step 3: Implementar o painel** — `draggable` nos itens e no nome da pasta; `dragstart` chama `serializarArrasto`; pasta e "Sem pasta" aceitam `dragover` (classe `alvo`, `preventDefault`) e `drop` → `aoSoltar(payload, id | null)`; remover `alvo` em `dragleave/drop`; botão "Nova pasta" usa `atual.selecionada`.

- [ ] **Step 4: Implementar em `montar.ts`**

- `aoSoltar(payload, destino)`: item → `d.confirmar('Mover "TITULO" para "CAMINHO"?')` → `repo.moverVinculo`; pasta → `d.confirmar('Você está movendo a PASTA "NOME" (com subpastas e itens) para "CAMINHO". Confirmar?')` → `repo.moverPasta` (erros de ciclo → `d.avisar`), destino null = raiz; ao confirmar, atualizar seleção/expansão e `refrescar()`.
- `novaPasta(pai)`: após criar, `recolhidas.delete(pai quando houver)` e `selecionada = nova.id`; `recolhidas.add(nova.id)`? (nova sem filhos; manter expandida é indiferente) — expandir o pai e selecionar a nova.

- [ ] **Step 5: Rodar e ver passar** — `npm run verificar && npm run tipos && npm run checar`.

- [ ] **Step 6: Commit** — `feat(base-conhecimento): arrastar e soltar documentos e pastas com confirmacao`.

### Task 5: Documentação, auditoria de acessibilidade e roteiro ao vivo

**Files:**
- Modify: `pages/BASECONHECIMENTO.md`, `docs/base-conhecimento/desenho.md`, `docs/base-conhecimento/roteiro-teste.md`
- Create: `docs/base-conhecimento/revisao-acessibilidade.md`

- [ ] **Step 1: Atualizar a documentação** — chevrons/recolhido; documentos dentro das pastas e abrir no SEI; diálogos e aviso no visual do SEI; arrastar com confirmação; "Nova pasta" filha da selecionada; no desenho, acrescentar a seção "UX (Fases A/B)" com as decisões.

- [ ] **Step 2: Auditoria de acessibilidade** (skill accessibility-review) — com a extensão recarregada (`npm run build` em `base-conhecimento`, reload em `chrome://extensions`), medir via Chrome DevTools MCP: contraste dos novos elementos (≥4,5:1), `aria-expanded` nos chevrons, `role/aria-modal` dos diálogos, Escape/foco, `aria-live` do aviso, alvos (linhas 44 px; chevron ≥24×44) e navegação só por teclado (abrir diálogo, confirmar, cancelar). Escrever o relatório no formato da skill em `revisao-acessibilidade.md` e corrigir o que for Crítico/Importante na hora.

- [ ] **Step 3: Atualizar o roteiro ao vivo** — cenários: pastas começam recolhidas; chevron; documentos na árvore abrindo no SEI; arrastar item e pasta com confirmação (e o texto de pasta); "Nova pasta" filha; diálogos e aviso no padrão SEI; conferência de que nenhum item do SEI foi alterado.

- [ ] **Step 4: Rodar a suíte completa** — `cd base-conhecimento && npm run verificar && npm run tipos && npm run checar && npm run build`.

- [ ] **Step 5: Commit** — `docs(base-conhecimento): UX das fases A/B, auditoria de acessibilidade e roteiro`.

---

## Self-review

1. **Cobertura dos 5 pontos:** (1) filha da selecionada → Task 4; (2) caixa crua → Task 2; (3) aviso estilo SEI → Task 3; (4) arrastar documentos e pastas com confirmação → Task 4; (5) chevrons → Task 1. Fase B (documentos nas pastas/abrir) → Task 1; auditoria → Task 5.
2. **Etapas conferíveis:** cada passo tem teste, comando e resultado esperado.
3. **Consistência de tipos:** `EstadoPainel.itensPorPasta`/`recolhidas`, `AcoesPainel.aoAlternarPasta`/`aoSoltar`, `PayloadArrasto`, `criarDialogos`, `criarAvisos` usados igualmente entre tarefas.
4. **Review Focus:** os 5 itens têm teste na tarefa dona (Task 1 ×2, Task 4 ×2, Task 2).
5. **Proporção:** plano de 5 tarefas; corpos só onde a assinatura/teste não decide.
