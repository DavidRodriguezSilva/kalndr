# Contexto del proyecto

Para **cualquier tarea de código** —incluidas correcciones, refactors y
cambios de configuración— lee `openspec/project.md` antes de escribir nada.
Ahí están el stack, las convenciones, la arquitectura y el contexto de dominio
que mandan en este repositorio.

Dos cosas que conviene saber antes de tocar fechas:

- `src/domain/` es TypeScript puro y no depende de Astro, React ni del DOM. Esa
  independencia es funcional, no estética: el mismo código corre en los tests,
  en el build y dentro de una isla en el navegador.
- Las fechas son cadenas `YYYY-MM-DD` y la aritmética va sobre UTC. Un `Date`
  local mueve un festivo un día entero por el desfase de zona.
