/**
 * Empacota o build autônomo em um único arquivo HTML, com CSS e JS embutidos.
 * Não depende de nenhum host externo: pode ser aberto direto do disco, enviado
 * por e-mail ou hospedado em qualquer lugar que sirva um arquivo estático.
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dir = "dist-tco/assets";
const arquivos = readdirSync(dir);
const js = arquivos.filter((f) => f.endsWith(".js"));
const css = arquivos.filter((f) => f.endsWith(".css"));
if (js.length !== 1 || css.length !== 1) {
  throw new Error(`Esperado um JS e um CSS em ${dir}; encontrados ${js.length} e ${css.length}.`);
}

// A sequência "</script" precisa ser escapada para não encerrar o bloco cedo.
const script = readFileSync(join(dir, js[0]), "utf8").replaceAll("</script", "<\\/script");
const estilo = readFileSync(join(dir, css[0]), "utf8");

const pagina = `<title>AHS TCO Fleet</title>
<meta name="description" content="Comparador de custo total de propriedade de caminhões diesel, hidrogênio e elétricos sobre a mesma missão de transporte." />
<style>
  :root { color-scheme: light; background: #ffffff; }
  html, body { background: #ffffff; color: #1A1A1A; margin: 0; }
</style>
<style>${estilo}</style>
<div id="root"></div>
<script type="module">${script}</script>
`;

writeFileSync("dist-tco/ahs-tco-fleet.html", pagina);
console.log("dist-tco/ahs-tco-fleet.html:", (pagina.length / 1024 / 1024).toFixed(2), "MB");
