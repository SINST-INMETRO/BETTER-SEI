/**
 * Diálogos do módulo no visual do SEI (Shadow DOM): texto (nomear/renomear),
 * confirmação e escolha de pasta.
 *
 * Acessibilidade: `role="dialog"`/`aria-modal`/`aria-labelledby`, foco inicial,
 * Tab preso, Escape cancela e devolve null/false. Nada de `window.prompt`/`confirm`.
 */

import { caminhoDaPasta, type PastaExibida } from "../arvore/mesclar";

export interface Dialogos {
  pedirTexto(rotulo: string, valorInicial?: string): Promise<string | null>;
  confirmar(texto: string): Promise<boolean>;
  perguntar(texto: string, rotuloOk: string, rotuloNao: string): Promise<boolean>;
  escolherPasta(pastas: PastaExibida[], atual: string | null): Promise<{ pasta: string | null } | null>;
  destruir(): void;
}

interface Botao<T> {
  rotulo: string;
  primario?: boolean;
  valor: () => T;
}

export function criarDialogos(o: { doc?: Document; css?: string } = {}): Dialogos {
  const doc = o.doc ?? document;
  const host = doc.createElement("div");
  host.className = "spro-bc-dialogos";
  const raiz = host.attachShadow({ mode: "open" });
  if (o.css) {
    const estilo = doc.createElement("style");
    estilo.textContent = o.css;
    raiz.appendChild(estilo);
  }
  const overlay = doc.createElement("div");
  overlay.className = "overlay";
  overlay.hidden = true;
  raiz.appendChild(overlay);
  (doc.body ?? doc.documentElement).appendChild(host);

  let numero = 0;
  let focoAnterior: HTMLElement | null = null;

  function abrir<T>(titulo: string, conteudo: HTMLElement, botoes: Array<Botao<T>>, cancelar: T): Promise<T> {
    overlay.replaceChildren();
    const caixa = doc.createElement("div");
    caixa.className = "caixa";
    caixa.setAttribute("role", "dialog");
    caixa.setAttribute("aria-modal", "true");
    caixa.tabIndex = -1;

    const idTitulo = `spro-bc-dlg-titulo-${++numero}`;
    const h = doc.createElement("h2");
    h.id = idTitulo;
    h.className = "titulo-dialogo";
    h.textContent = titulo;
    caixa.setAttribute("aria-labelledby", idTitulo);

    const fechar = doc.createElement("button");
    fechar.type = "button";
    fechar.className = "fechar";
    fechar.setAttribute("aria-label", "Fechar");
    fechar.textContent = "×";

    const corpo = doc.createElement("div");
    corpo.className = "corpo";
    corpo.append(conteudo);

    const rodape = doc.createElement("div");
    rodape.className = "rodape";

    overlay.hidden = false;
    focoAnterior = (doc.activeElement as HTMLElement | null) ?? null;

    return new Promise<T>((resolve) => {
      let aberto = true;
      const terminar = (valor: T): void => {
        if (!aberto) return;
        aberto = false;
        overlay.hidden = true;
        overlay.replaceChildren();
        focoAnterior?.focus?.();
        resolve(valor);
      };

      for (const b of botoes) {
        const btn = doc.createElement("button");
        btn.type = "button";
        btn.className = b.primario ? "botao primario" : "botao";
        btn.textContent = b.rotulo;
        btn.addEventListener("click", () => terminar(b.valor()));
        rodape.append(btn);
      }

      fechar.addEventListener("click", () => terminar(cancelar));
      caixa.append(h, fechar, corpo, rodape);

      caixa.addEventListener("keydown", (ev) => {
        const e = ev as KeyboardEvent;
        if (e.key === "Escape") {
          ev.preventDefault();
          terminar(cancelar);
          return;
        }
        if (e.key === "Enter" && (ev.target as HTMLElement | null)?.tagName === "INPUT") {
          ev.preventDefault();
          (caixa.querySelector(".botao.primario") as HTMLElement | null)?.click();
          return;
        }
        if (e.key === "Tab") {
          const focaveis = [...caixa.querySelectorAll<HTMLElement>("button, input, select, a[href]")].filter(
            (el) => !el.hasAttribute("disabled"),
          );
          if (!focaveis.length) return;
          const atual = focaveis.indexOf(doc.activeElement as HTMLElement);
          if (e.shiftKey && atual <= 0) {
            ev.preventDefault();
            focaveis[focaveis.length - 1]?.focus();
          } else if (!e.shiftKey && atual === focaveis.length - 1) {
            ev.preventDefault();
            focaveis[0]?.focus();
          }
        }
      });

      overlay.appendChild(caixa);
      (caixa.querySelector("input, select, .botao.primario") as HTMLElement | null)?.focus();
    });
  }

  return {
    pedirTexto(rotulo, valorInicial = "") {
      const label = doc.createElement("label");
      const id = `spro-bc-nome-${++numero}`;
      label.htmlFor = id;
      label.setAttribute("for", id);
      label.className = "rotulo";
      label.textContent = rotulo;
      const input = doc.createElement("input");
      input.type = "text";
      input.id = id;
      input.className = "campo";
      input.value = valorInicial;
      const corpo = doc.createElement("div");
      corpo.append(label, input);
      return abrir<string | null>(
        rotulo,
        corpo,
        [
          { rotulo: "Cancelar", valor: () => null },
          { rotulo: "OK", primario: true, valor: () => input.value },
        ],
        null,
      );
    },

    confirmar(texto) {
      const p = doc.createElement("p");
      p.className = "mensagem";
      p.textContent = texto;
      return abrir<boolean>(
        "Confirmar",
        p,
        [
          { rotulo: "Cancelar", valor: () => false },
          { rotulo: "Confirmar", primario: true, valor: () => true },
        ],
        false,
      );
    },

    perguntar(texto, rotuloOk, rotuloNao) {
      const p = doc.createElement("p");
      p.className = "mensagem";
      p.textContent = texto;
      return abrir<boolean>(
        "Confirmação",
        p,
        [
          { rotulo: rotuloNao, valor: () => false },
          { rotulo: rotuloOk, primario: true, valor: () => true },
        ],
        false,
      );
    },

    escolherPasta(pastas, atual) {
      const label = doc.createElement("label");
      const id = `spro-bc-pasta-${++numero}`;
      label.htmlFor = id;
      label.setAttribute("for", id);
      label.className = "rotulo";
      label.textContent = "Pasta de destino";
      const select = doc.createElement("select");
      select.id = id;
      select.className = "campo";
      const opcoes: Array<{ valor: string; texto: string; atual: boolean }> = [{ valor: "", texto: "Sem pasta", atual: atual === null }];
      const indexar = (lista: PastaExibida[]): void => {
        for (const p of lista) {
          opcoes.push({ valor: p.id, texto: caminhoDaPasta(pastas, p.id), atual: p.id === atual });
          indexar(p.filhas);
        }
      };
      indexar(pastas);
      for (const o of opcoes) {
        const opt = doc.createElement("option");
        opt.value = o.valor;
        opt.textContent = o.texto;
        if (o.atual) opt.setAttribute("selected", "");
        select.append(opt);
      }
      const corpo = doc.createElement("div");
      corpo.append(label, select);
      return abrir<{ pasta: string | null } | null>(
        "Mover para qual pasta?",
        corpo,
        [
          { rotulo: "Cancelar", valor: () => null },
          {
            rotulo: "Mover",
            primario: true,
            valor: () => {
              const escolhida = select.querySelector("option[selected]") as HTMLOptionElement | null;
              return { pasta: escolhida && escolhida.value !== "" ? escolhida.value : null };
            },
          },
        ],
        null,
      );
    },

    destruir() {
      overlay.hidden = true;
      host.remove();
    },
  };
}
