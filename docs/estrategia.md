# Estrategia: posicionamiento y agentes

Este documento explica a qué aspira KALNDR, qué es realista y qué no, y por
qué el sitio está construido como está. Es el documento que hay que leer antes
de proponer un cambio que afecte la forma del sitio.

## El objetivo

Aparecer entre los primeros resultados para las consultas de festivos de
Colombia: «festivos 2026 Colombia», «próximo festivo», «cuándo es el puente de
agosto», «festivos que se corren al lunes». Y, cada vez más importante, ser la
fuente de la que sale la respuesta cuando esa pregunta se le hace a un
asistente en vez de a un buscador.

## La evaluación honesta

**Competir desde `usuario.github.io/kalndr` está cuesta arriba.** Un subpath en
un dominio compartido no acumula autoridad propia: la señal de dominio se la
lleva `github.io`, y los sitios establecidos del nicho llevan años de
antigüedad y enlaces. Entrar al top 10 para la consulta principal —«festivos
Colombia»— es poco probable en esas condiciones.

Lo que sí es alcanzable desde el primer día:

1. **Consultas de cola larga.** «Festivos que se trasladan al lunes», «cuántos
   festivos tiene Colombia en 2030», «qué pasa cuando dos festivos caen el mismo
   día». Son consultas con poca competencia y respuesta exacta, y son
   exactamente donde el sitio tiene contenido que los demás no tienen.
2. **Citación por asistentes.** Aquí el juego es distinto y todavía está
   abierto: lo que decide no es la autoridad de dominio sino que el dato sea
   inequívoco, esté estructurado y se pueda verificar. Ver más abajo.
3. **Ser la referencia para desarrolladores.** La API estática y el calendario
   suscribible resuelven un problema real que hoy se resuelve copiando fechas a
   mano. Eso genera enlaces desde repositorios y artículos, que es la única
   forma honesta de construir autoridad.

**Con dominio propio la aspiración cambia de categoría.** Un `.co` cuesta
menos de treinta dólares al año y convierte el objetivo del top 10 de una
apuesta improbable en una meta de trabajo sostenido. El sitio ya está
preparado: cambiar `SITE_URL` y `BASE_PATH` migra todas las URL absolutas.
Mientras tanto, todo lo que se construya sigue sirviendo.

## Las dos audiencias

La búsqueda dejó de ser solo diez enlaces azules. Una parte creciente de las
consultas termina en una respuesta generada, y la página que la alimenta no se
elige por las mismas razones por las que se elegía un resultado.

### Para la persona

- **Responder antes de que pregunte.** El próximo festivo y los días que faltan,
  arriba del todo, sin hacer scroll ni clic.
- **Explicar el traslado.** «El 15 de agosto es sábado, se descansa el lunes 17»
  es la respuesta completa; la fecha sola no lo es.
- **Rápido y legible en el teléfono.** La mitad de estas consultas se hacen de
  pie, con una mano, decidiendo si vale la pena viajar.

### Para el agente

- **`/llms.txt`**: el sitio explicado en Markdown plano, con el año en curso
  completo en texto. Un modelo que solo lea ese archivo ya puede responder.
- **`/api/v1/`**: JSON estático, con CORS abierto y sin llave. Cada respuesta
  se explica a sí misma: trae el día de la semana y la fecha en palabras ya
  resueltos, y dice por qué una fecha se movió.
- **Datos estructurados**: `ItemList` de `Event`, `FAQPage`, `Dataset`,
  `BreadcrumbList` en cada página.
- **Decir lo que no se sabe.** `/api/v1/proximo.json` advierte que es un archivo
  estático generado el día del despliegue. Un dato que se presenta con su
  límite es más citable que uno que finge precisión.
- **Rastreadores permitidos.** `robots.txt` deja entrar explícitamente a GPTBot,
  ClaudeBot, PerplexityBot, Google-Extended y Applebot-Extended.

## Por qué Astro

El requisito era SEO real y peso mínimo, y esas dos cosas se pelean en la
mayoría de frameworks. Astro genera HTML estático por ruta —el buscador no
tiene que ejecutar JavaScript para leer las fechas— y envía cero JavaScript por
defecto: solo se hidrata el componente que de verdad lo necesita.

La isla de la cuenta regresiva ilustra el patrón completo. El HTML se genera el
día del despliegue con la respuesta de ese día, que es lo que indexa el
buscador y lo que ve quien llega sin JavaScript. Como el algoritmo es
TypeScript puro y sin dependencias, viaja al navegador y se recalcula con el
reloj real del visitante. Indexable como documento, exacto como aplicación.

## Lo que no se hace

- **No se copian fechas.** Todo se calcula. Una tabla escrita a mano se
  desactualiza y nadie se entera hasta que alguien planea mal sus vacaciones.
- **No se publica un año por página hasta 2099.** Serían cientos de páginas casi
  idénticas; un buscador las lee como relleno y con razón. Se publican once, y
  el resto vive en la API.
- **No hay analítica ni cookies.** No hace falta banner de consentimiento, y la
  página carga más rápido.
- **No se afirma sin fuente.** Toda ficha de festividad exige al menos una, y el
  build falla si falta.
