# AGENTS.md

Instruções permanentes para agentes de IA (e para quem os opera) que trabalham
neste repositório — o SEI Pro, extensão para o Sistema Eletrônico de Informações
(SEI).

## Regra de segurança — incondicional

**NÃO altere processos de outras pessoas.**

No SEI, "alterar" inclui qualquer escrita em processo ou documento: assinar, dar
ciência, editar, enviar, excluir, cancelar, concluir, reabrir, atribuir,
sobrestar, alterar sigilo ou marcador, anotar, criar andamento, mover documentos
ou qualquer outra ação que modifique o estado do processo.

- Só realize escrita em processos e documentos que pertençam à pessoa que está
  usando o agente — ou em ambiente de treinamento/homologação, com dados de
  teste.
- Em caso de dúvida sobre a titularidade ou sobre a competência do usuário,
  **não escreva**: apenas leia e pergunte.
- Ao controlar um navegador com sessão ativa (Playwright, Chrome DevTools MCP ou
  equivalente), limite-se à leitura. Nunca clique em ação de escrita em nome do
  usuário sem uma ordem explícita e específica para aquele processo.
- O Agente de IA do próprio SEI Pro (`agente-ia/`) já impõe "escrita só dentro de
  plano aprovado"; essa trava permanece e não pode ser contornada. Nenhuma
  automação pode escrever em processo de terceiros.
- A regra vale também para testes, scripts de validação e captura de telas:
  use dados de exemplo ou ambiente de treinamento, nunca produção de terceiros.
