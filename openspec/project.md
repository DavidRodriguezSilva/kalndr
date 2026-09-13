# Contexto del proyecto

## Propósito

**KALNDR** es el calendario de los festivos de Colombia, servido como sitio
estático en GitHub Pages y construido para dos lectores a la vez: la persona
que quiere saber cuándo es el próximo puente, y el agente que tiene que
responderle esa misma pregunta.

La visión completa está en [`README.md`](../README.md); el porqué de la forma
del sitio, en [`docs/estrategia.md`](../docs/estrategia.md). No se duplican
aquí.

## Stack tecnológico

- TypeScript estricto, Astro 7, islas React 19, Tailwind v4.
- Primitivas de shadcn/ui **copiadas al repositorio** en `src/ui/primitives/`
  en vez de instaladas como librería, con una capa propia encima. Aportan
  accesibilidad de teclado y foco ya resuelta, sin quedar a merced de un cambio
  aguas arriba.
- Iconos de `lucide-react`.
- Vitest en Node para el dominio. No hace falta navegador: el dominio es puro.
- pnpm; Node 24 (`.node-version`).
- Sin backend ni base de datos. Todo se calcula en el build o en el navegador.

## Convenciones

### Estilo de código

- TypeScript estricto en todo `src/`, con `noUncheckedIndexedAccess`.
- Prettier manda en formato (`pnpm format:check` en CI).
- Nombres y comentarios en español. El dominio del problema es español, y
  traducirlo a medias produce híbridos peores que cualquiera de los dos
  idiomas.
- Commits en español, imperativo, estilo Conventional Commits.

### Arquitectura

```text
domain/      el cálculo: festivos, Pascua, días hábiles, conteo, reglas, capas, temas
data/        las hojas editables: eventos.json y temas.json
seo/         identidad, URLs canónicas, datos estructurados, marca y tarjetas
lib/         rangos de prerenderizado y utilidades de la capa Astro
components/  islas React y componentes Astro
layouts/     esqueleto HTML y `<head>` completo
pages/       rutas HTML, la calculadora, la API y las imágenes para compartir
styles/      tokens (OKLCH) y un archivo por temporada en `temas/`
```

La regla que sostiene todo lo demás: **`domain/` no depende de Astro, ni de
React, ni del DOM, ni de ninguna librería externa.** No es purismo. Es lo que
permite que el mismo cálculo corra en los tests de Node, en el build y —enviado
al navegador dentro de una isla— corrija la cuenta regresiva con el reloj real
del visitante sobre un sitio que por lo demás es estático.

La hoja de eventos es un JSON importado directamente por el dominio: sigue
siendo un dato, no una dependencia.

## Dominio

El cálculo es un port del algoritmo de producción en C# (`DiasExtensions`):

- Domingo de Pascua por Meeus/Jones/Butcher; de él dependen cinco festivos.
- Ley 51 de 1983 (Emiliani): siete festivos de fecha fija se corren al lunes.
- Ley 2578 de 2026: Virgen del Rosario de Chiquinquirá, 9 de julio,
  trasladable, desde 2026. Colombia pasó de 18 a 19 festivos.

Tres cosas que el dominio sabe y conviene no olvidar al tocarlo:

1. **Todas las fechas son cadenas `YYYY-MM-DD`**, aritmética sobre UTC. Un
   `Date` local introduce el desfase de zona y mueve un festivo un día entero.
2. **Dos festivos pueden caer el mismo día** (2025, 2030). Hay más festivos que
   días de descanso, y el sitio lo dice en vez de esconderlo.
3. **Antes de 1984 el cálculo es un anacronismo declarado**: aplica la ley de
   hoy, no la que regía entonces.

## Apariencia

`styles/tokens.css` es la única fuente de color, radio y tipografía, en OKLCH.
Los nombres son los de **shadcn/ui** —los mismos que exporta tweakcn— para que
un tema generado allí se pegue sin adaptarlo y las primitivas de shadcn
funcionen sin tocarlas. Solo están los tokens que el sitio usa: no hay
`chart-*` ni `sidebar-*`. Encima viven `festivo`, `fiesta` y `hoy`, que son lo
único que este dominio necesita y shadcn no conoce.

Dos ejes ortogonales:

- **Esquema**: `:root` claro, `.dark` oscuro. Arranca oscuro por familia, pero
  el visitante manda y su elección se recuerda.
- **Temporada**: `[data-tema]` sobreescribe un puñado de tokens según la fecha
  (Carnaval, Semana Santa, Flores, diciembre, lluvias, seco). Los periodos se
  declaran en `data/temas.json` con las mismas reglas de recurrencia que las
  fiestas, y se resuelven en `domain/temas.ts`.

Un color literal en un componente es, por definición, un token que falta.

## Capas

El calendario es una pila de capas que se encienden y se apagan: festivos,
fiestas, eventos, carreras, temporadas. Apagarlas todas deja el calendario
plano, y esa también es una vista válida.

Añadir una capa es añadir sus metadatos a `domain/capas.ts` y filas a
`data/eventos.json`. La UI, el sitemap y la API recorren el registro, así que
aparece sola. El formato está en
[`docs/formato-eventos.md`](../docs/formato-eventos.md).

## Restricciones

- **No se copian fechas.** Todo se calcula, siempre.
- **No se afirma sin fuente.** Toda fila de la hoja lleva su enlace a
  Wikipedia, y el test lo verifica.
- **Sin analítica ni cookies.** No hay banner de consentimiento que poner.
- **El peso importa.** El sitio compite en consultas que se hacen desde un
  teléfono, de pie. Cada kilobyte de JavaScript tiene que justificarse.
