import { build } from "esbuild";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const outfile = fileURLToPath(new URL("../dist/js/init_base_conhecimento.js", import.meta.url));

await build({
  entryPoints: [fileURLToPath(new URL("src/main.ts", import.meta.url))],
  outfile,
  bundle: true,
  minify: true,
  format: "iife",
  target: ["chrome116", "firefox115"],
  charset: "ascii",
  legalComments: "none",
  loader: { ".css": "text" },
  banner: { js: "/* GERADO por base-conhecimento/build.mjs. NAO EDITE. Rode: npm run build */" },
});

const bytes = await readFile(outfile);
const i = bytes.findIndex((byte) => byte > 127);
if (i >= 0) throw new Error(`Bundle contem byte nao ASCII na posicao ${i}`);

console.log("Base de Conhecimento: bundle gerado.");
