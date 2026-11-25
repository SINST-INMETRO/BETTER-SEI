# Roteiro de teste ao vivo — Base de Conhecimento em pastas

Ambiente de referência: SEI 5.0.4 (INMETRO), unidade de teste. Use **somente leitura** nos itens nativos do SEI; as únicas escritas permitidas são nas pastas da árvore e no Texto Padrão `[_SEIPRO_BC_UNIDADE]` da unidade.

## Preparação

1. `cd base-conhecimento && npm install && npm run build` (gera `dist/js/init_base_conhecimento.js`).
2. Chrome → `chrome://extensions` → modo desenvolvedor → **Carregar sem compactação** → pasta `dist/`.
3. Abrir o SEI → menu **Base de Conhecimento** e depois a **lista da unidade**
   (`controlador.php?acao=base_conhecimento_listar`).
4. Conferir no console que não há erro do módulo e que `<html>` tem
   `data-seipro-base-conhecimento`.

## Cenários

- [ ] **Painel e coluna**: o painel "Pastas" aparece à esquerda; a tabela ganha a coluna "Pasta"; o botão "Pastas" está na barra de comandos.
- [ ] **Estado inicial**: sem pastas, tudo aparece em "Sem pasta"; o caption mostra o total de registros.
- [ ] **Chevrons e recolhidas**: as pastas existentes aparecem **recolhidas** (`▸`); clicar na seta expande (`▾`) e mostra subpastas e documentos; clicar de novo recolhe. A seta não troca a seleção.
- [ ] **Nova pasta filha**: selecionar "Fiscalização" (fundo azul) e clicar em **+ Nova pasta**; a nova pasta nasce **dentro** de "Fiscalização", o pai aparece expandido e a nova fica selecionada.
- [ ] **Subpasta**: pelo menu **⋯ → Nova subpasta**, criar dentro da pasta; o recuo e a contagem aparecem.
- [ ] **Documentos na árvore**: expandir uma pasta com documentos; clicar no nome do documento abre o item no SEI em nova aba.
- [ ] **Diálogos no padrão SEI**: criar/renomear pasta e escolher destino usam diálogo do SEI (sem caixa crua do navegador); Escape e o X cancelam sem gravar.
- [ ] **Aviso no padrão SEI**: uma barra azul no topo aparece com a mensagem (ex.: ao criar pasta) e fecha sozinha.
- [ ] **Arrastar documento**: arrastar um documento de "Sem pasta" para uma pasta; aparece a confirmação e, ao aceitar, o documento passa para a pasta.
- [ ] **Arrastar pasta**: arrastar uma pasta para outra; a confirmação diz explicitamente que a **pasta** (com subpastas e itens) será movida; ao aceitar, a pasta muda de lugar. Soltar uma pasta dentro dela mesma/descendente é recusado com aviso.
- [ ] **Mover item**: mover um item para "Fiscalização › Notas Técnicas" pelo "Mover para…"; a coluna "Pasta" mostra o caminho e a linha passa a pertencer à pasta.
- [ ] **Filtro**: clicar na pasta; só as linhas dela ficam visíveis; o caption mostra a contagem da pasta; clicar em "Sem pasta" mostra as demais.
- [ ] **Busca**: digitar um trecho do título; a árvore e a tabela filtram.
- [ ] **Ordenar**: clicar no cabeçalho "Descrição" (tablesorter); o filtro continua aplicado depois da ordenação.
- [ ] **Renomear**: renomear a pasta; o caminho na coluna "Pasta" acompanha.
- [ ] **Excluir pasta**: excluir "Notas Técnicas"; os itens voltam para "Sem pasta"; a subpasta (se houver) sobe um nível.
- [ ] **Órfão**: (em ambiente de teste) excluir um item da Base de Conhecimento; o vínculo aparece riscado em "Sem pasta" com a ação "esquecer".
- [ ] **Modo lista**: clicar em "Pastas"; o painel recolhe e a tabela mostra tudo; clicar de novo volta à visão em pastas.
- [ ] **Liga/desliga**: nas configurações do SEI Pro, desligar "Base de Conhecimento em pastas"; a tela volta à nativa; religar e recarregar.
- [ ] **Outro computador**: abrir o mesmo SEI em outro perfil/navegador com o SEI Pro; aceitar o "Entendi"; a árvore chega pelo Texto Padrão.
- [ ] **Duas pessoas**: com dois perfis, criar pastas diferentes ao mesmo tempo; as duas aparecem após a sincronia (mais recente vence por pasta).
- [ ] **Sem permissão de alterar**: usar um perfil que só lê Textos Padrão; a árvore fica em leitura ("Indisponível nesta unidade").

## Criar em contexto e numeração (25/11/2026)

- [ ] **Criar dentro da pasta**: selecionar "Fiscalização" → clicar **Nova** → a tela de cadastro mostra a faixa “Será organizado em: …” com o caminho (numerado, se a numeração estiver ligada) → salvar → ao voltar, o item aparece na pasta e o aviso “Documento criado em …” oferece **Desfazer**.
- [ ] **Desfazer**: no aviso, clicar **Desfazer**; o item volta a "Sem pasta" e a pasta deixa de mostrá-lo.
- [ ] **Não organizar**: repetir com uma pasta selecionada e, na tela de cadastro, clicar **Não organizar**; salvar; o item fica em "Sem pasta" e nenhum vínculo novo aparece.
- [ ] **Voltar sem criar**: clicar **Nova** e cancelar/voltar sem salvar; ao voltar para a lista a intenção foi limpa (nada é organizado depois).
- [ ] **Sem o "Entendi"**: com o consentimento limpo (outro navegador/perfil), criar com pasta selecionada; o item fica em "Sem pasta" e o aviso oferece **Entendi e organizar**; aceitar o "Entendi" organiza o item.
- [ ] **Colega organizou antes**: com dois perfis, um organiza o item recém-criado antes de o outro voltar; o segundo **não** sobrescreve a pasta do colega.
- [ ] **Pasta removida**: selecionar uma pasta, clicar **Nova** e, em outra aba, excluir a pasta antes de salvar; ao voltar, o aviso diz que a pasta não existe mais e o item fica em "Sem pasta".
- [ ] **Numeração ligada**: na aba **Conhecimento** do painel lateral (ícone da extensão), marcar **Numerar pastas**; a árvore, a coluna "Pasta" e o diálogo "Mover para…" passam a mostrar "1. …", "1.1 …", "1.1.1 …".
- [ ] **Renumeração**: com a numeração ligada, mover uma pasta (ou criar uma pasta no topo); os números dos irmãos mudam na hora. Conferir no Texto Padrão `[_SEIPRO_BC_UNIDADE]` que **não** há números gravados.
- [ ] **Escopo da numeração**: recarregar o navegador; a preferência continua. Abrir outro navegador/perfil; a numeração começa **desligada** (é por navegador).
- [ ] **Aba condicional**: num pacote sem `js/init_base_conhecimento.js` no manifest, a aba "Conhecimento" não aparece no painel lateral.

## Conferência de segurança (obrigatória)

- [ ] Nenhum item da Base de Conhecimento foi **criado, alterado, liberado ou excluído** pelo módulo.
- [ ] A única alteração no SEI é o Texto Padrão `[_SEIPRO_BC_UNIDADE]` (menu → Textos Padrão).
- [ ] O conteúdo dos itens e eventuais anexos continuam intactos.

## Portões de empacotamento (máquina do autor)

- [ ] `node tools/check-dom-injection.mjs` (se existir) sem apontamentos.
- [ ] `node tools/patch-manifests.mjs --check` (se existir) sem diferenças.
- [ ] `node tools/gerar-pacote-firefox.mjs <versao>` copia o bloco `js/init_base_conhecimento.js` (o bloco tem `exclude_matches`).
