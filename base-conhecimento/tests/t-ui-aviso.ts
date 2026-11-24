import { readFileSync } from "node:fs";
import { criarAvisos } from "../src/ui/aviso";
import { checar, docDe, teste } from "./util";

const CSS = readFileSync(new URL("../src/ui/aviso.css", import.meta.url), "utf8");

function montar(o: { duracaoMs?: number } = {}) {
  const doc = docDe("<html><body></body></html>");
  const a = criarAvisos({ doc, css: CSS, ...o });
  const host = doc.querySelector(".spro-bc-avisos") as HTMLElement;
  return { doc, a, raiz: host.shadowRoot as unknown as DocumentFragment };
}

await teste("avisar mostra status acessivel, com botao de fechar", () => {
  const { a, raiz } = montar();
  a.avisar("Pasta criada");
  const aviso = raiz.querySelector('.aviso[role="status"][aria-live="polite"]');
  checar("aviso", aviso !== null && (aviso.textContent ?? "").includes("Pasta criada"));
  checar("css fixo no topo", CSS.includes("position: fixed"));
  checar("token acessivel", CSS.includes("#155f9b"));
  const fechar = raiz.querySelector('[aria-label="Fechar aviso"]') as HTMLElement;
  checar("fechar existe", fechar !== null);
  fechar.click();
  checar("removido", raiz.querySelector(".aviso") === null);
  a.destruir();
});

await teste("dois avisos empilham e o timer remove", async () => {
  const { a, raiz } = montar({ duracaoMs: 10 });
  a.avisar("um");
  a.avisar("dois");
  checar("dois avisos", raiz.querySelectorAll(".aviso").length === 2);
  await new Promise((r) => setTimeout(r, 40));
  checar("sumiram", raiz.querySelectorAll(".aviso").length === 0);
  a.destruir();
});

await teste("destruir remove o host", () => {
  const { doc, a } = montar();
  a.destruir();
  checar("host removido", doc.querySelector(".spro-bc-avisos") === null);
});
