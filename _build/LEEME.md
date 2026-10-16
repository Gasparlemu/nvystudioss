# Cómo funciona el sitio

Todo el contenido vive en `data/proyectos.json`. Las páginas (`index.html`, `trabajos/*`, legales, `404.html`, `sitemap.xml`) se generan con `_build/build.mjs`: **no se editan a mano**.

Vercel corre el build en cada deploy (`vercel.json`). Por eso basta con hacer push del JSON.

## Sumar un proyecto

1. Agregar una entrada en `"proyectos"` dentro de `data/proyectos.json`. El orden del JSON es el orden de la lista.
   - `estado`: `lanzado`, `en-desarrollo` o `demo`.
   - `avance`: solo en desarrollo. Ejemplo: `{ "fase": "fase 03 · desarrollo", "porcentaje": 60 }`.
   - `plan`: puede ir vacío (`""`); en ese caso no se muestra.
   - `colores`: los 4 tonos de la marca del cliente para pintar su nombre (oscuro, principal, claro, brillo), sacados de su logo o su sitio. Ej.: `["#8c223a", "#ad2d49", "#d9577a", "#f6dbe2"]`. Sin este campo el nombre va en el azul de NVY.
   - `colores2` + `corte`: para nombres de dos tonos como en el logo. `corte` = cuántas letras (sin espacios) llevan el primer color. Ej. Oncosur: `"corte": 4` (Onco amarillo, sur celeste).
2. Capturas (escritorio y celular, 3 vistas cada uno):
   ```
   npm i --no-save sharp
   node _build/capturas.mjs <slug> <url>
   ```
   Opciones útiles: `--pos-e 0,1.3,2.6` para elegir a qué altura capturar y `--espera 6000` si el sitio tiene un preloader lento.
3. Revisar en local:
   ```
   node _build/build.mjs
   node _build/servir.mjs   ->  http://localhost:4173
   ```
4. Commit y push.

## Qué se publica

`sitio.estadosVisibles` define qué proyectos aparecen. Hoy es `["lanzado", "en-desarrollo"]`; las demos quedan fuera.
- Cuando un proyecto en desarrollo se lance, cambiarle el `estado` a `lanzado` y recapturarlo.
- Para mostrar solo los lanzados: `["lanzado"]`. Los filtros aparecen solos cuando hay más de un estado.

## Otros

- Instagram: completar `sitio.instagram` en el JSON. Aparece automáticamente en el menú, en "sobre mí" y en los datos estructurados.
- Imagen para compartir el link: `node _build/og.mjs`.
- Si cambia la fuente o el tracking de los títulos gigantes: `node _build/calibrar-anchos.mjs`.
- Colores: la web es negra con el azul de la marca. Todo sale de las variables de `:root` en `assets/css/nvy.css`; la version blanca anterior queda en el commit 3f846fc.
