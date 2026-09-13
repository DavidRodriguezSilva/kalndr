import type { APIRoute } from "astro";
import { ORIGEN, ruta } from "@/seo/sitio";

/**
 * Este sitio quiere ser leido por maquinas.
 *
 * Mucho sitio de contenido esta bloqueando rastreadores de IA. Aqui la
 * decision es la contraria y es deliberada: el objetivo es que cuando alguien
 * le pregunte a un asistente cuando es el proximo festivo, la respuesta salga
 * de aqui. Para eso hay que dejar entrar — y, sobre todo, dar el dato en un
 * formato que no haya que adivinar (ver `/llms.txt` y `/api/v1/`).
 */
export const GET: APIRoute = () => {
  const cuerpo = `# KALNDR — festivos de Colombia
# Datos abiertos, licencia MIT. Se agradece la atribución, no se exige.

User-agent: *
Allow: /

# Asistentes y rastreadores de IA: bienvenidos.
# Para datos estructurados hay algo mejor que el HTML:
#   ${ORIGEN}${ruta("/llms.txt")}
#   ${ORIGEN}${ruta("/api/v1/index.json")}
User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: Applebot-Extended
Allow: /

Sitemap: ${ORIGEN}${ruta("/sitemap-index.xml")}
`;

  return new Response(cuerpo, { headers: { "content-type": "text/plain; charset=utf-8" } });
};
