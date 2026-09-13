# API

Archivos JSON, iCalendar y Markdown generados en el build y servidos como
estáticos por GitHub Pages. Sin llave, sin límite de peticiones, con
`Access-Control-Allow-Origin: *`. Licencia MIT.

Base: `https://DavidRodriguezSilva.github.io/kalndr`

## Descubrimiento

```http
GET /api/v1/index.json
```

Qué endpoints hay, en qué rango de años, con qué licencia y qué capas existen.
Es la puerta de entrada: un agente no debería tener que adivinar rutas. Trae
también las advertencias que condicionan la interpretación de los datos.

## Festivos de un año

```http
GET /api/v1/festivos/{año}.json
```

Rango disponible: **1984–2099**.

```json
{
  "pais": "CO",
  "anio": 2026,
  "zonaHoraria": "America/Bogota",
  "totalFestivos": 19,
  "totalDiasNoLaborables": 19,
  "festivos": [
    {
      "fecha": "2026-01-12",
      "diaSemana": "lunes",
      "fechaLarga": "lunes 12 de enero de 2026",
      "nombre": "Día de los Reyes Magos",
      "slug": "reyes-magos",
      "clase": "religioso",
      "regla": "trasladable",
      "trasladado": true,
      "fechaOriginal": "2026-01-06",
      "explicacion": "Se celebra el martes 6 de enero de 2026, y la Ley Emiliani traslada el descanso al lunes siguiente."
    }
  ],
  "licencia": "MIT"
}
```

`diaSemana`, `fechaLarga` y `explicacion` vienen resueltos a propósito: quien
consume esto casi siempre está componiendo una frase en español, y resolverlo
aquí evita que cada consumidor lo haga distinto.

### Cuando dos festivos coinciden

Si dos celebraciones caen el mismo día, la respuesta lo dice:

```json
{
  "totalFestivos": 18,
  "totalDiasNoLaborables": 17,
  "nota": "Dos celebraciones comparten fecha, así que 2025 tiene 18 festivos pero solo 17 días de descanso.",
  "coincidencias": [
    {
      "fecha": "2025-06-30",
      "celebraciones": ["Sagrado Corazón de Jesús", "San Pedro y San Pablo"]
    }
  ]
}
```

Pasa cuando el 29 de junio cae en domingo: San Pedro y San Pablo se traslada al
lunes 30 y encuentra ahí al Sagrado Corazón. Dentro del rango publicado ocurre
en 2025 y 2030.

### Años anteriores a 1984

Traen el campo `advertencia`. El cálculo aplica la ley vigente hoy, no la que
regía entonces: es un anacronismo declarado, no un error.

## Calendario suscribible

```http
GET /api/v1/festivos/{año}.ics
```

iCalendar con un evento de día completo por festivo, marcado `TRANSP:TRANSPARENT`
para que no bloquee la disponibilidad en la agenda. Se puede suscribir desde
Google Calendar, Apple Calendar u Outlook.

## Próximo festivo

```http
GET /api/v1/proximo.json
```

```json
{
  "calculadoEl": "2026-09-13",
  "advertencia": "Este archivo es estático: se generó el día del despliegue...",
  "proximo": {
    "fecha": "2026-10-12",
    "diaSemana": "lunes",
    "nombre": "Día de la Raza",
    "diasFaltantes": 29
  },
  "anioCompleto": "https://.../api/v1/festivos/2026.json"
}
```

El sitio se republica cada lunes, así que `calculadoEl` nunca queda a más de
una semana. Aun así, la advertencia va en la respuesta: para una respuesta
exacta hay que comparar el listado del año contra el reloj propio. Un dato que
se presenta con su límite es más confiable que uno que finge precisión.

## Para modelos de lenguaje

```http
GET /llms.txt
```

El sitio explicado en Markdown plano, siguiendo el formato de
[llmstxt.org](https://llmstxt.org): qué es, dónde está cada cosa, y el año en
curso completo en texto. Un modelo que solo lea ese archivo ya puede responder
sin pedir nada más.

## Estabilidad

La versión va en la ruta (`/api/v1/`). Dentro de `v1`:

- **No se quitan campos ni se cambia su significado.** Se pueden añadir campos
  nuevos, así que conviene ignorar los desconocidos en vez de fallar.
- **Los `slug` son estables entre años.** `reyes-magos` es `reyes-magos`
  siempre; es la clave por la que se puede seguir un festivo en el tiempo.
- **Un cambio de ley cambia los datos, no el contrato.** Si el Congreso añade o
  quita un festivo, cambian las fechas y el total; la forma de la respuesta, no.
