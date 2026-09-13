# La hoja de eventos

Fiestas, eventos, carreras y temporadas viven todos en **un solo archivo**:
[`src/data/eventos.json`](../src/data/eventos.json). Un arreglo donde cada
entrada tiene exactamente la misma forma.

Añadir una fiesta es añadir un objeto. Nada más: ni crear archivos, ni tocar
componentes, ni registrar rutas. La UI, el sitemap y la API recorren la hoja.

## Por qué un solo archivo

La alternativa era un Markdown por festividad con su artículo propio. Suena
mejor y nadie lo mantiene. Para lo que de verdad hay que decir de una fiesta
—qué es, dónde, cuándo cae y dos advertencias— una fila alcanza, y quien
quiera más se va a Wikipedia, que ya lo escribió mejor.

## La forma

```json
{
  "id": "carnaval-de-barranquilla",
  "titulo": "Carnaval de Barranquilla",
  "capa": "fiestas",
  "descripcion": "Fiesta en la costa: comparsa, licor y baile durante cuatro días. La ciudad entera se vuelve calle.",
  "lugar": "Barranquilla, Atlántico",
  "regla": { "tipo": "pascua", "desde": -50, "hasta": -47 },
  "precision": "exacta",
  "wikipedia": "https://es.wikipedia.org/wiki/Carnaval_de_Barranquilla",
  "curiosidades": ["Patrimonio de la humanidad por la UNESCO desde 2003."],
  "anotaciones": ["No es festivo nacional: el lunes y el martes en el resto del país se trabaja."]
}
```

| Campo             | Qué es                                                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `id`              | Identificador estable. Forma la URL y no cambia entre años.                                                                    |
| `titulo`          | Como se conoce la fiesta.                                                                                                      |
| `descripcion`     | Una o dos frases, en voz de aquí. 20–220 caracteres. Es **todo** lo que se escribe: va en la tarjeta, en la ficha y en la API. |
| `capa`            | `fiestas`, `eventos`, `carreras` o `temporadas`.                                                                               |
| `lugar`           | Ciudad y departamento, o `Nacional`.                                                                                           |
| `regla`           | Cómo se calcula la fecha. Ver abajo.                                                                                           |
| `precision`       | `exacta`, `estimada` o `por-confirmar`.                                                                                        |
| `wikipedia`       | Donde se lee el resto.                                                                                                         |
| `curiosidades`    | Lista corta. Puede ir vacía, pero la clave siempre está.                                                                       |
| `anotaciones`     | Advertencias prácticas. Puede ir vacía, pero la clave siempre está.                                                            |
| `desde` / `hasta` | Opcionales: primer y último año en que aplica.                                                                                 |

**Todas las filas llevan todas las claves**, aunque una lista vaya vacía. Es lo
que hace la hoja fácil de leer de un vistazo y trivial de validar.

### Sobre la descripción

Corta y en voz de aquí, no de folleto turístico. «Salsa hasta que amanezca, del
25 al 30. Cali cierra el año bailando y no pide permiso» dice más que tres
párrafos de «una de las festividades más representativas del folclor
nacional».

### Sobre `precision`

Una fiesta puede tener fecha exacta, una estimada que se confirma cada año, o
estar por confirmar. Decirlo es mejor que fingir precisión: quien va a comprar
un tiquete necesita saber si ya puede reservar. El sitio muestra la diferencia.

## Reglas de recurrencia

Casi ninguna fiesta tiene fecha fija. Guardar la fecha ya calculada obligaría a
editar la hoja cada diciembre, y ese trabajo manual es exactamente lo que hace
que un calendario se quede viejo. La fila declara **cómo** se calcula, una vez.

### `fija` — arranca un día del calendario

```json
{ "tipo": "fija", "mes": 4, "dia": 26, "dias": 5 }
```

### `rango` — entre dos fechas fijas

```json
{ "tipo": "rango", "desde": { "mes": 12, "dia": 25 }, "hasta": { "mes": 12, "dia": 30 } }
```

Un rango que cruza el fin de año (28 dic → 2 ene) termina el año siguiente.

### `pascua` — desplazamiento desde el Domingo de Resurrección

```json
{ "tipo": "pascua", "desde": -50, "hasta": -47 }
```

Referencias útiles: Miércoles de Ceniza es `-46`; Domingo de Ramos, `-7`;
Jueves Santo, `-3`; Viernes Santo, `-2`.

### `ordinal` — el n-ésimo día de semana de un mes

```json
{ "tipo": "ordinal", "mes": 8, "diaSemana": 5, "ocurrencia": 1, "dias": 10 }
```

`diaSemana` va de 0 (domingo) a 6 (sábado); `ocurrencia` negativa cuenta desde
el final. Si el mes no alcanza esa ocurrencia, la entrada no aparece ese año en
vez de desbordarse al siguiente.

### `fechas` — sin patrón, año por año

```json
{ "tipo": "fechas", "porAnio": { "2026": { "desde": "2026-09-12", "hasta": "2026-09-13" } } }
```

Para un concierto o una carrera cuya fecha se anuncia y ya. Un año sin entrada
simplemente no aparece, que es mejor que inventarlo.

## Validación

La hoja no pasa por un compilador, así que su validación vive en
`src/domain/eventos.test.ts`: estructura idéntica en todas las filas, `id`
únicos, descripción dentro de rango, capa y precisión válidas, URL de Wikipedia
bien formada, y que cada regla resuelva a un periodo coherente. Si una fila
está mal, CI no la publica.

Corre con `pnpm test`.

## Añadir una capa nueva

Las cuatro capas existentes cubren casi todo. Para una distinta:

1. Añade sus metadatos (nombre, descripción, color, si arranca encendida) a
   `DE_CONTENIDO` en `src/domain/capas.ts`.
2. Añádela a `CAPAS_VALIDAS` en `src/domain/eventos.test.ts`.
3. Escribe filas con esa `capa` en la hoja.

Una capa sin filas no se crea: el conmutador no ofrece una casilla que no
enciende nada.
