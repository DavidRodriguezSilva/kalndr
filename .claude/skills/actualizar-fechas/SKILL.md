---
name: actualizar-fechas
description: Confirmar las fechas estimadas de src/data/eventos.json contra las fuentes oficiales del año en curso y actualizar la hoja. Úsala cuando llegue el issue de "Confirmar las fechas estimadas", cuando Drack pida actualizar los eventos, fiestas, carreras o temporadas, o cuando una fecha del calendario se vea desactualizada.
---

# Actualizar las fechas estimadas

Casi ninguna carrera y varias fiestas anuncian su fecha cada año. La hoja las
declara con la ventana habitual y `"precision": "estimada"`, que es honesto,
pero si nadie las revisa el sitio envejece sin avisar y pierde lo único que lo
hace valer: que lo que dice sea cierto.

Esta rutina corre tres veces al año. El flujo `revisar-fechas.yml` abre el
issue; esto es lo que hay que hacer cuando llega.

## 1. Ver qué hay que revisar

```bash
pnpm fechas
```

Imprime, agrupada por capa, cada entrada con `precision` distinta de `exacta`,
con su `id`, su lugar, su fuente y sus anotaciones.

## 2. Buscar la fecha real, una por una

Para cada entrada, en este orden de preferencia:

1. **El sitio oficial del evento o la alcaldía.** Es el único que manda.
2. **Prensa local reciente** que cite fechas confirmadas.
3. **Wikipedia**, que sirve para el patrón histórico pero suele ir atrasada en
   la edición del año en curso.

Regla que no se negocia: **si no encuentras la fecha, no la inventes.** Deja la
entrada como está y anótalo en el resumen final. Una ventana estimada y
marcada como tal es correcta; una fecha inventada y presentada como firme
rompe la única promesa del sitio.

## 3. Actualizar la hoja

En `src/data/eventos.json`, según lo que hayas encontrado:

- **La fecha coincide con la regla que ya está** → sube la confianza a
  `"precision": "exacta"` solo si el patrón es estable año tras año (un rango
  fijo, un ordinal que se repite). Si este año coincidió por casualidad, déjala
  estimada.
- **El patrón cambió pero sigue siendo un patrón** → ajusta la regla
  (`fija`, `rango`, `pascua`, `ordinal`). El formato está en
  `docs/formato-eventos.md`.
- **No hay patrón, la fecha se anuncia y ya** → usa `"tipo": "fechas"` con el
  año declarado. Un año sin entrada simplemente no aparece en el calendario,
  que es mejor que mostrarlo mal.
- **El evento dejó de hacerse** → pon `"hasta": <último año>` en vez de borrar
  la fila. El calendario de años anteriores sigue siendo correcto.

Mantén todas las claves en todas las filas, aunque una lista quede vacía: es lo
que hace la hoja fácil de leer de un vistazo y trivial de validar.

Si al buscar aparece una fiesta, carrera o temporada que falta y es
suficientemente conocida, añádela. Descripción corta y en voz de aquí, no de
folleto turístico.

## 4. Verificar

```bash
pnpm test      # valida la hoja: estructura, ids, descripciones, reglas
pnpm build
```

El test de `src/domain/eventos.test.ts` falla si una fila queda mal formada.

## 5. Cerrar

Un commit con el formato del repositorio (español, imperativo, Conventional
Commits), diciendo **qué se confirmó, qué se movió y qué quedó sin confirmar**.
Lo que quedó sin confirmar es la parte importante del mensaje: es lo que habrá
que mirar en la siguiente pasada.

Luego responde en el issue con ese mismo resumen y ciérralo.
