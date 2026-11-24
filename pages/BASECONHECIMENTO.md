# Base de Conhecimento em pastas

A tela da **Base de Conhecimento** do SEI ganha uma navegação por **pastas hierárquicas**, no espírito de ferramentas como Confluence e ClickUp, sem mudar a forma como o SEI guarda os itens: os procedimentos continuam sendo os mesmos, com seus anexos e versões.

![Base de Conhecimento em pastas](/img/icon-agruparlista.png)

## Como usar

- O painel **Pastas** aparece à esquerda da lista. Clique numa pasta para ver os itens dela; clique em **Sem pasta** para ver o que ainda não foi organizado.
- **+ Nova pasta** cria uma pasta. O menu **⋯** de cada pasta tem **Renomear**, **Nova subpasta** e **Excluir**.
- A lista ganha a coluna **Pasta**, que mostra o caminho de cada item. As linhas de outras pastas ficam ocultas quando você seleciona uma pasta (o filtro é de verdade, não é só esmaecer).
- Para organizar um item, use **Mover para…** no item (nos itens listados sob a pasta selecionada ou em "Sem pasta"). Para desfazer um vínculo, use **esquecer** nos itens que já não existem no SEI.
- O botão **Pastas**, na barra de comandos, alterna entre a visão em pastas e a lista plana.
- A busca do painel filtra a árvore e a lista pelo título.

Criar, editar, liberar e excluir **itens** continua sendo feito nas telas do SEI: o SEI Pro só organiza.

## O que fica guardado e onde

- A organização (pastas e vínculos) fica num **Texto Padrão da unidade** chamado `[_SEIPRO_BC_UNIDADE]`, visível a quem tem acesso a esse texto no SEI.
- Na primeira gravação aparece o aviso **"Entendi"**. Sem ele, nada é gravado no SEI.
- A árvore é **da unidade**: quem usa o SEI Pro na mesma unidade vê e edita a mesma organização.
- Duas pessoas organizando ao mesmo tempo: vence a alteração mais recente **por pasta ou por vínculo**, e nada é perdido (a sincronia relê antes de gravar).
- Excluir uma pasta **não exclui item nenhum**: os itens voltam para **Sem pasta** e as subpastas sobem um nível.

## Problemas comuns

- **"Indisponível nesta unidade"**: o seu perfil lê, mas o SEI não deixa alterar Texto Padrão nesta unidade. A árvore fica em modo leitura.
- **A pasta não aparece para um colega**: confira se ele usa o SEI Pro na mesma unidade e se o Texto Padrão `[_SEIPRO_BC_UNIDADE]` existe.
- **Um item sumiu da pasta**: se o item foi excluído no SEI, o vínculo fica órfão (riscado). Use **esquecer**.

## Privacidade

O texto da organização guarda apenas **identificadores e títulos** dos procedimentos e a estrutura de pastas — nenhum conteúdo, anexo ou dado de processo. O SEI Pro não envia nada para servidor próprio; a sincronia acontece dentro do próprio SEI, pela sua sessão. Veja a [Política de Privacidade](../PRIVACY_POLICY.md).
