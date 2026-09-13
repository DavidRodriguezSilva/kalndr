# Temas de temporada

Cada archivo de esta carpeta sobreescribe **solo los tokens que cambian**. El
contrato completo vive en `../tokens.css`; aquí nunca se declara un token
nuevo ni se escribe un color suelto: se reemplaza el valor de uno que ya
existe.

Un tema se aplica con `data-tema="<id>"` en el elemento raíz, y se combina con
el esquema (`.dark`) sin pelearse: son ejes ortogonales, así que todo tema
define sus dos versiones.

Qué tema está activo lo decide `src/domain/temas.ts` a partir de
`src/data/temas.json`, que mapea rangos de fechas a temas. El sitio se
construye con el tema del día del despliegue y una isla lo corrige en el
navegador con la fecha real del visitante.
