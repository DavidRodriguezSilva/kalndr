# kalndr

**KALNDR** es el calendario de los festivos de Colombia, pensado para dos
lectores a la vez: la persona que quiere saber cuándo es el próximo puente, y
el agente que tiene que responderle esa misma pregunta.

Sitio estático sobre GitHub Pages. Sin servidor, sin base de datos, sin
analítica, sin cuentas. Forma parte de **DarkForest**, la familia a la que
también pertenecen [dark-echo](https://github.com/DavidRodriguezSilva/dark-echo)
y [dark-owl](https://github.com/DavidRodriguezSilva/dark-owl).

## Por qué existe

Los calendarios de festivos que ya hay responden _qué día es_. Casi ninguno
responde _por qué_, y varios se equivocan en lo mismo:

- **El traslado al lunes no se explica.** La Ley 51 de 1983 mueve siete
  festivos; una tabla que solo muestra la fecha final deja al lector sin saber
  si el 15 de agosto se descansa o no.
- **El festivo nuevo falta.** La Ley 2578 de 2026 añadió la Virgen del Rosario
  de Chiquinquirá el 9 de julio. Desde 2026 Colombia tiene 19 festivos, no 18.
- **Dos festivos pueden caer el mismo día.** Cuando el 29 de junio cae en
  domingo, San Pedro y San Pablo se traslada al lunes 30 y se encuentra con el
  Sagrado Corazón, que ya estaba ahí. Pasa en 2025 y en 2030: son 18 y 19
  festivos, pero un día menos de descanso. Casi nadie lo dice.

Aquí las fechas **se calculan, no se copian**, y cada una viene con la razón
por la que cae donde cae.

## Los dos públicos

|              | Persona                      | Agente                               |
| ------------ | ---------------------------- | ------------------------------------ |
| Entrada      | `/` y `/festivos/{año}/`     | `/llms.txt` y `/api/v1/index.json`   |
| Formato      | HTML con datos estructurados | JSON, iCalendar, Markdown plano      |
| Qué necesita | entender de un vistazo       | extraer sin ambigüedad y poder citar |

No son dos sitios: es el mismo dominio, calculado una sola vez y servido en
dos formatos. Lo que ve una persona y lo que lee una máquina no pueden
contradecirse porque salen de la misma función.

Los rastreadores de IA están **explícitamente permitidos** en `robots.txt`. Es
una decisión, no un descuido: el objetivo es que cuando alguien le pregunte a
un asistente cuándo es el próximo festivo, la respuesta salga de aquí.

## Apariencia

Los tokens siguen la convención de **shadcn/ui** —la misma que exporta
[tweakcn](https://tweakcn.com)— a propósito: un tema generado allí se pega en
`src/styles/tokens.css` y funciona, y cualquier primitiva de shadcn copiada al
repositorio toma los colores sin tocarle una línea. Lo que no usamos no está:
no hay `chart-*` ni `sidebar-*`.

Encima del contrato estándar viven los tres tokens que este producto sí
necesita y shadcn no tiene por qué conocer: `festivo`, `fiesta` y `hoy`.

Hay dos ejes independientes. El **esquema** (claro/oscuro) lo decide el
visitante con el botón de la cabecera y se recuerda. La **temporada** la decide
el calendario: Carnaval, Semana Santa, Feria de las Flores, diciembre, lluvias
o seco, según la fecha. Cada temporada es un archivo en `src/styles/temas/`
que sobreescribe un puñado de tokens sobre el contrato base.

Un calendario que se ve igual el 24 de diciembre que un martes de marzo está
desperdiciando lo único que sabe de verdad: en qué momento del año está quien
lo abre. Los periodos se declaran en `src/data/temas.json` con las mismas
reglas de recurrencia que las fiestas, así que un tema atado a la Pascua se
mueve solo cada año.

## Capas

El calendario es una pila de capas que se encienden y se apagan: festivos
nacionales, fiestas y carnavales, eventos, carreras, temporadas de viaje.
Apagarlas todas deja el calendario plano, y esa también es una vista válida.

Los festivos se calculan; todo lo demás vive en **una sola hoja**,
[`src/data/eventos.json`](src/data/eventos.json), donde cada entrada tiene la
misma forma. Añadir una fiesta es añadir un objeto: ni la UI, ni el sitemap, ni
la API necesitan cambiar. El formato está en
[`docs/formato-eventos.md`](docs/formato-eventos.md).

## Puesta en marcha

```bash
pnpm install
pnpm dev          # http://localhost:4321/kalndr/
pnpm test         # el dominio, en Node, sin navegador
pnpm build        # typecheck + sitio estático en dist/
pnpm iconos       # regenera favicon e iconos desde la marca
```

Node 24 y pnpm. La versión exacta está en `.node-version`.

## Estructura

```text
src/
  domain/      el cálculo: festivos, Pascua, días hábiles, reglas, capas, temas
  data/        las hojas editables: eventos.json y temas.json
  seo/         identidad, URLs canónicas, datos estructurados, marca y tarjetas
  lib/         rangos de prerenderizado y utilidades de la capa Astro
  components/  islas React (calendario, cuenta regresiva) y componentes Astro
  layouts/     el esqueleto HTML con todo el `<head>`
  pages/       rutas HTML, la API y las imágenes para compartir
  styles/      tokens (OKLCH) y un archivo por temporada en `temas/`
scripts/
  iconos.mjs   genera favicon e iconos de aplicación desde la marca
```

`domain/` no depende de Astro, ni de React, ni del DOM: es TypeScript puro. Por
eso el mismo cálculo corre en los tests de Node, en el build y —enviado al
navegador— dentro de una isla que corrige la cuenta regresiva con el reloj real
del visitante.

## El cálculo

Port del algoritmo de producción en C# (`DiasExtensions`), con las mismas
reglas:

- **Domingo de Pascua** por Meeus/Jones/Butcher. De él dependen cinco festivos.
- **Ley 51 de 1983 (Emiliani)**: siete festivos de fecha fija se corren al lunes
  siguiente cuando no caen en lunes.
- **Ley 2578 de 2026**: Virgen del Rosario de Chiquinquirá, 9 de julio,
  trasladable, desde 2026.

Calculable entre 1583 —el primer año completo del calendario gregoriano, que es
el que usa ISO 8601— y 2099. Antes de 1984 el resultado es un anacronismo
declarado: aplica la ley de hoy, no la que regía entonces, y el sitio lo dice.

Se publican como página los cinco años hacia atrás y cinco hacia adelante desde
el año en curso. La API cubre 1984–2099 completo: un JSON de dos kilobytes no
compite por posicionamiento, así que no hay razón para atar los dos rangos.

## API

Archivos estáticos generados en el build. Sin llave, sin límite de peticiones,
con CORS abierto.

```text
/api/v1/index.json            qué hay y dónde
/api/v1/festivos/{año}.json   el año completo, con los traslados explicados
/api/v1/festivos/{año}.ics    el mismo año, suscribible desde tu calendario
/api/v1/proximo.json          el próximo festivo (calculado el día del deploy)
/llms.txt                     el sitio explicado para un modelo de lenguaje
```

La documentación navegable está en `/api/`; los enlaces de arriba devuelven
datos crudos.

## Al compartir un enlace

Cada página genera su propia imagen de 1200×630 en el build
(`/og/...png`), con el dato concreto de esa página. Pegar el enlace del
Carnaval en WhatsApp muestra «Carnaval de Barranquilla · 14 – 17 de febrero de
2026», no un logo genérico — porque en una conversación esa tarjeta _es_ la
respuesta, y muchas veces nadie llega a abrir el enlace.

El contrato completo está en [`docs/api.md`](docs/api.md).

## Despliegue

`main` despliega solo a GitHub Pages. El build se repite cada lunes por
`schedule`: el sitio depende de la fecha, y sin republicar envejecería.

Mudarlo a un dominio propio es cambiar dos variables del repositorio
(`SITE_URL`, `BASE_PATH`) y añadir el `CNAME`. Todas las URL absolutas del
sitio se derivan de ahí, así que no hay ninguna cadena que buscar y reemplazar.

## Estado

Arranque del proyecto. Funciona el dominio completo con tests, el sitio
estático con el calendario por meses y su agenda, la API, las imágenes para
compartir y el despliegue. Falta la página propia de cada festividad, llenar
las capas de eventos y carreras más allá de la semilla, y decidir si el
runtime de React se cambia por Preact: hoy son 81 KB de librería contra 9 KB
de código propio.

## Licencia

MIT. Los datos también: úsalos, cítalos si quieres, no hace falta pedir permiso.
