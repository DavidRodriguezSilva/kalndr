/**
 * Lista las entradas cuya fecha no es firme.
 *
 * Muchas fiestas y casi todas las carreras no tienen fecha fija: la anuncian
 * cada anio. La hoja las declara con la ventana habitual y `precision`
 * marcada, que es honesto, pero si nadie las revisa el sitio envejece sin
 * avisar. Este script imprime la lista en Markdown y el flujo de trabajo
 * `revisar-fechas.yml` la convierte en un issue cada enero.
 *
 * Se corre tambien a mano: `pnpm fechas`.
 */
import { readFileSync } from "node:fs";

const eventos = JSON.parse(readFileSync("src/data/eventos.json", "utf8"));
const anio = Number(process.argv[2]) || new Date().getFullYear();

const porConfirmar = eventos.filter((e) => e.precision !== "exacta");

if (porConfirmar.length === 0) {
  console.log(`Todas las fechas de ${anio} están confirmadas.`);
  process.exit(0);
}

const porCapa = new Map();
for (const e of porConfirmar) {
  porCapa.set(e.capa, [...(porCapa.get(e.capa) ?? []), e]);
}

console.log(
  `Estas ${porConfirmar.length} entradas de \`src/data/eventos.json\` llevan fecha estimada.`,
  `\nHay que buscar la fecha oficial de ${anio}, actualizar la regla y, si ya es firme,`,
  `\nponer \`"precision": "exacta"\`.\n`
);

for (const [capa, lista] of [...porCapa].sort()) {
  console.log(`\n### ${capa}\n`);
  for (const e of lista) {
    const fuente = e.wikipedia ? ` — [fuente](${e.wikipedia})` : "";
    console.log(`- [ ] **${e.titulo}** (\`${e.id}\`), ${e.lugar}${fuente}`);
    for (const nota of e.anotaciones) console.log(`      ${nota}`);
  }
}

console.log(
  `\n---\n\nGenerado por \`pnpm fechas\`. El formato está en \`docs/formato-eventos.md\`.`
);
