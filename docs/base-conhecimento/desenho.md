# Base de Conhecimento em árvore — desenho (rascunho)

> Documento de desenho para revisão. Nada aqui foi implementado ainda.

## Objetivo

Dar à **Base de Conhecimento** do SEI uma navegação por **pastas hierárquicas**,
no espírito de Confluence/ClickUp, sem mexer no dado nativo do SEI:

- a "página" continua sendo o item nativo da Base de Conhecimento (com seu
  template, anexos e versões);
- o SEI Pro acrescenta **apenas a organização** (pastas + vínculo item→pasta).

## Decisões já fechadas

1. **Fonte da hierarquia — Opção A**: árvore própria do SEI Pro, guardada num
   **Texto Padrão da unidade** (mesmo motor de sincronia de Projetos/Demandas).
2. **Abrangência**: a árvore organiza **só os itens da unidade**
   (`base_conhecimento_listar`). A busca global continua na tela nativa.
3. **Escopo de escrita**: a nova UI **só cria/renomeia/move/exclui pastas** e
   **associa/desassocia itens**. Criar, editar, publicar e excluir **itens**
   continua nas telas nativas do SEI.
4. **Compartilhada pela unidade** (não pessoal).

## Telas onde o módulo injeta

| Tela | `acao=` | O que ganha |
|---|---|---|
| Lista da unidade | `base_conhecimento_listar` | Árvore + área da pasta (a tela principal do módulo) |
| Busca | `base_conhecimento_pesquisar` | Atalho/entrada para a árvore; busca global continua nativa |
| Item | `base_conhecimento_visualizar` | **Não injeta** (é a página nativa do item) |

## Wireframe

A visão em pastas **preserva a tela nativa** (barra de comandos e a tabela
`infraTable` com ordenação/filtros) e acrescenta dois pedaços: o **painel de
pastas** (mesmo visual do menu lateral do SEI) e uma **coluna "Pasta"** na
tabela. Botão `[Pastas]` alterna para a lista sem agrupamento.

```
┌────────────────────────────────────────────────────────────────────────────┐
│ [gov.br azul] SEI   Unidade: Sinst  [Pesquisa rápida]      usuário  [sair]  │
├───────────────┬────────────────────────────────────────────────────────────┤
│ menu do SEI   │ Base de Conhecimento Sinst                                 │
│ (nativo,      │ [Nova][Imprimir][Liberar][Cancelar Liberação][Excluir][Fechar][Pastas] │
│  intacto)     ├─────────────┬──────────────────────────────────────────────┤
│               │ PASTAS      │ Lista de Procedimentos (1 registro):          │
│               │ + nova pasta│ ┌──┬──────┬──────────┬─────────────┬───────┐ │
│               │ 📖 Fiscaliz.│ │☑ │Pasta │Descrição │Usuário Ger. │Ações  │ │
│               │   ▸ Notas T.│ │☑ │Fisc.›│COMO FAZER│rlamaral     │…      │ │
│               │   ▸ Pareceres│└──┴──────┴──────────┴─────────────┴───────┘ │
│               │ 📖 Talentos │   (as linhas fora da pasta selecionada        │
│               │ 📄 Sem pasta│    aparecem esmaecidas)                       │
└───────────────┴─────────────┴──────────────────────────────────────────────┘
```

Legenda de interação:

- **Clicar numa pasta** → filtra a tabela nativa pelos itens dela; a coluna
  "Pasta" mostra o caminho de cada item; os itens de outras pastas aparecem
  esmaecidos (ou ocultos, conforme a opção).
- **Arrastar uma linha da tabela** (ou da seção "Sem pasta") para uma pasta →
  associa/move.
- **Menu de contexto da pasta** (botão direito) → Renomear, Nova subpasta,
  Excluir (os itens voltam para "Sem pasta"), Mover.
- **"Sem pasta"** sempre lista o que não está organizado (nada some).
- **Buscar** filtra a árvore e a tabela pelo título.
- Vínculo para item que **deixou de existir** aparece riscado com "esquecer".
- A tabela, a ordenação, os filtros e os botões nativos continuam funcionando.

## Fluxos

### Leitura (ao abrir `base_conhecimento_listar`)
1. Lê todos os itens da unidade (com paginação) pela sessão do usuário.
2. Lê a árvore do Texto Padrão da unidade.
3. Mescla: itens da árvore que existem → mostram título real e estado atual;
   itens sem pasta → seção "Sem pasta"; vínculos órfãos → marcados como removidos.

### Organizar pastas (única escrita)
- Criar/renomear/mover/excluir pasta ou associar item → grava o **envelope da
  árvore** no Texto Padrão da unidade, com o motor de sincronia (consentimento
  "Entendi" na primeira vez, mesclagem por entidade, cópias diárias).
- **Nunca** grava no item da Base de Conhecimento do SEI.

### Conflito entre colegas
- Duas pessoas editando: vence a gravação mais recente **por entidade** (pasta ou
  vínculo), como nos outros módulos; o motor relê antes de gravar.

## Contrato de dados (envelope no Texto Padrão)

Nome do texto na unidade: **`[_SEIPRO_BC_UNIDADE]`** (segue o padrão
`[_SEIPRO_FAV_…]`, `[_SEIPRO_DEM_…]`, `[_SEIPRO_PRJ_UNIDADE]`).

```ts
/** Versão do formato. Sobe quando o envelope mudar de forma incompatível. */
type VersaoEnvelope = 1;

interface EnvelopeBaseConhecimento {
  v: VersaoEnvelope;
  unidade: string;                 // sigla/id da unidade dona da árvore
  atualizadoEm: string;            // ISO 8601
  autor: string;                   // login de quem gravou por último
  arvore: {
    pastas: Pasta[];
    vinculos: Vinculo[];
  };
}

interface Pasta {
  id: string;                      // id curto e estável (ex.: "p1", "p2"…)
  nome: string;                    // 1..80 caracteres
  pai: string | null;              // id da pasta pai; null = raiz
  ordem: string;                   // índice fracionário (ordenação manual)
}

interface Vinculo {
  agrupador: string;               // id_base_conhecimento_agrupador (estável entre versões)
  titulo: string;                  // rótulo em cache (fallback e busca)
  pasta: string | null;            // id da pasta; null = sem pasta
  ordem: string;                   // índice fracionário dentro da pasta
}
```

Exemplo:

```json
{
  "v": 1,
  "unidade": "Sinst",
  "atualizadoEm": "2026-11-23T15:40:00-03:00",
  "autor": "kwamado",
  "arvore": {
    "pastas": [
      { "id": "p1", "nome": "Fiscalização", "pai": null, "ordem": "a0" },
      { "id": "p2", "nome": "Notas Técnicas", "pai": "p1", "ordem": "a0" }
    ],
    "vinculos": [
      { "agrupador": "40", "titulo": "[APENAS UM TESTE] COMO FAZER UMA NOTA TÉCNICA", "pasta": "p2", "ordem": "a0" }
    ]
  }
}
```

Regras que o código deve garantir:

- **Referência estável**: usar `agrupador`, nunca o id da versão
  (`id_base_conhecimento` muda a cada nova versão).
- **Nada some**: excluir pasta nunca exclui item; os vínculos voltam a
  `pasta: null` ("Sem pasta").
- **Título é cache**: ao ler a lista, o `titulo` do vínculo é atualizado com o
  título real; se o item sumiu, mantém o último e marca como removido.
- **Limite de tamanho**: o Texto Padrão tem teto (~100 KB). Faixas de aviso em
  85% e 100% (como em Demandas). Estimativa: ~80 bytes por vínculo e ~60 por
  pasta → milhares de itens cabem.
- **Migração**: `v` permite converter envelopes antigos; versão desconhecida é
  preservada e não sobrescrita (evita perder dados de um colega com versão nova).

## Privacidade

- O envelope guarda apenas **ids + títulos** e a estrutura de pastas — nenhum
  conteúdo, anexo ou dado de processo.
- O Texto Padrão da unidade é visível a quem tem acesso a ele no SEI; é o mesmo
  requisito já usado por Projetos/Demandas, com o mesmo consentimento "Entendi".
- Nada vai para servidor do SEI Pro nem para o Agente de IA.

## Fidelidade visual (lição do mockup)

- **Não reusar a classe `.infraSidebarMenu` do SEI como está**: ela pinta links
  e ícones de claro (`#e7e7e7`), feitos para o fundo escuro do menu. O painel
  de pastas vive sobre fundo branco — usar Shadow DOM no módulo real evita a
  briga de especificidade (no mockup foi preciso `!important`).
- Cores do painel (sobre fundo branco): texto `#212529` (15,4:1), pasta ativa
  `#155f9b` sobre `#e7f0f8` (5,8:1), contadores/notas `#5c636a` a `#6c757d`
  (≥4,7:1) — tudo acima de WCAG AA.
- Ícones do menu do SEI são SVGs com `fill` claro: no painel claro, aplicar
  `filter: brightness(0)` (ou usar ícones próprios escuros).

## Estrutura do pacote (proposta)

```
base-conhecimento/
  src/
    nucleo/      lerLista(), lerItem()  (usa sei-nucleo)
    arvore/      modelo, merge, ordenação, validação
    sincronia/   envelope + adaptador do motor (sei-comum)
    ui/          painel de pastas (estilo do menu do SEI), coluna "Pasta",
                 menus de contexto e arrastar-e-soltar (Shadow DOM)
    content.ts   ponto de entrada do content script
  tests/
  build.mjs
  package.json
```

## Riscos e validações pendentes

1. **Paginação** de `base_conhecimento_listar` em unidades grandes (precisa de
   fixture com paginação para validar).
2. **Estabilidade do `agrupador`** entre versões e entre unidades — validar ao
   vivo.
3. **Itens compartilhados de outras unidades** (aparecem só na busca global) —
   fora do escopo da árvore.
4. **Permissão de escrita no Texto Padrão** — se o usuário não puder alterar,
   a árvore fica em modo leitura ("Indisponível nesta unidade").
