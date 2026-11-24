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
- [ ] **Nova pasta**: criar "Fiscalização"; o aviso "Entendi" aparece **antes** da primeira gravação; aceitar; a pasta aparece na árvore.
- [ ] **Subpasta**: criar "Notas Técnicas" dentro de "Fiscalização"; o recuo e a contagem aparecem.
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

## Conferência de segurança (obrigatória)

- [ ] Nenhum item da Base de Conhecimento foi **criado, alterado, liberado ou excluído** pelo módulo.
- [ ] A única alteração no SEI é o Texto Padrão `[_SEIPRO_BC_UNIDADE]` (menu → Textos Padrão).
- [ ] O conteúdo dos itens e eventuais anexos continuam intactos.

## Portões de empacotamento (máquina do autor)

- [ ] `node tools/check-dom-injection.mjs` (se existir) sem apontamentos.
- [ ] `node tools/patch-manifests.mjs --check` (se existir) sem diferenças.
- [ ] `node tools/gerar-pacote-firefox.mjs <versao>` copia o bloco `js/init_base_conhecimento.js` (o bloco tem `exclude_matches`).
