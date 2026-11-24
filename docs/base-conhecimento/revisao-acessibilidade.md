# Auditoria de acessibilidade — Base de Conhecimento em pastas (Fases A/B)

**Padrão:** WCAG 2.1 AA | **Data:** 24/11/2026 | **Escopo:** painel de pastas, diálogos, aviso e interações de arrastar.

## Resumo

**Achados:** 0 críticos · 0 maiores · 1 menor (alvo denso do chevron vs. AAA).

Os contrastes foram calculados a partir dos tokens fixos do CSS (não dependem do render) e os comportamentos de teclado/ARIA são cobertos pelos testes automatizados (`npm run verificar`, 96 verificações). A repetição da medição no navegador após recarregar a extensão está descrita no fim.

## Percebível (contraste — 1.4.3 / 1.4.11)

| Elemento | Frente | Fundo | Razão | Exigido | Passa? |
|---|---|---|---|---|---|
| Texto do painel | #212529 | #ffffff | 15,43:1 | 4,5:1 | ✅ |
| Secundários (rótulos, contagens, notas) | #495057 | #ffffff | 8,18:1 | 4,5:1 | ✅ |
| Pasta ativa | #155f9b | #e7f0f8 | 5,80:1 | 4,5:1 | ✅ |
| Links/coluna "Pasta" | #155f9b | #ffffff | 6,68:1 | 4,5:1 | ✅ |
| Faixa de aviso (indisponível) | #7a4b00 | #fdf0dc | 6,59:1 | 4,5:1 | ✅ |
| Aviso (toast) | #ffffff | #155f9b | 6,68:1 | 4,5:1 | ✅ |
| Hover da linha | #212529 | #f0f3f8 | 13,87:1 | 4,5:1 | ✅ |
| Hover do menu ⋯ | #495057 | #e9ecef | 6,90:1 | 4,5:1 | ✅ |

Ícones usam `currentColor` sobre os mesmos fundos; não-texto ≥ 3:1 ✅.

## Operável (2.1.1 / 2.4.7 / 2.5.5 / 2.5.8)

- **Chevrons** são `<button>` com `aria-expanded` e `aria-label` ("Expandir/Recolher pasta X"); teclado Enter/Espaço nativos.
- **Diálogos**: foco inicial no campo, `Tab` preso no modal, `Escape` cancela e devolve `null`/`false`, foco volta ao elemento de origem.
- **Arrastar-e-soltar** tem alternativa por teclado: o menu **Mover para…** (botão em cada documento) e **Nova subpasta**.
- **Alvos**: linhas e botões com 44 px; o chevron tem **28×44** (atende 2.5.8/AA, 24×24). Para 2.5.5/AAA (44×44) o alvo é dispensado por ser controle denso ao lado do nome — registrado como menor.

## Compreensível (3.3.1 / 3.3.2)

- Campos com `<label for>`; seleção de pasta com rótulo "Pasta de destino".
- Confirmações descrevem a ação: documento ("Mover “TÍTULO” para “CAMINHO”?") e **pasta** ("Você está movendo a PASTA “X” (com subpastas e itens) para “CAMINHO”. Confirmar?").
- Pasta em descendente própria é recusada com aviso antes de qualquer confirmação.

## Robusto (4.1.2)

- Diálogo: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` apontando para o título.
- Aviso: `role="status"` + `aria-live="polite"` (anunciado sem roubar foco); botão fechar com `aria-label`.
- Sem `window.prompt`/`window.confirm` e sem `innerHTML`/`insertAdjacentHTML` no `src/` (conferido por grep; título vai por `textContent`).

## Leitor de tela

| Elemento | Anunciado como | Observação |
|---|---|---|
| Chevron da pasta | "Expandir/Recolher pasta X, botão, recolhido/expandido" | `aria-expanded` |
| Pasta selecionada | "…, atual" | `aria-current="true"` |
| Diálogo | "…, diálogo, modal" + título | `aria-labelledby` |
| Aviso | "…, status" | `aria-live="polite"` |

## Medição ao vivo (repetir após recarregar)

1. `cd base-conhecimento && npm run build`
2. `chrome://extensions` → recarregar **SEI Pro Lab** → F5 na aba do SEI.
3. No Chrome DevTools: conferir contraste dos novos elementos, `aria-expanded` dos chevrons, `role/aria-modal` dos diálogos, Escape/foco, `aria-live` do aviso e alvos.
4. Teclado só: abrir diálogo (Enter), confirmar/cancelar (Tab/Enter/Escape), mover item pelo menu e por arrastar.

> Nota: a medição acima depende de recarregar a extensão no navegador; os valores de contraste e os comportamentos de ARIA já estão fixados no CSS e nos testes deste repositório.
