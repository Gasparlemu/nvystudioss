# Portada con muro de fotos (respaldo, sin publicar)

Maqueta de la portada del inicio que Gaspar eligió el 2026-10-20 y guardó para más adelante:

- **Muro 7c:** 7 columnas de capturas de sus trabajos en diagonal. La cinta corre infinita (también en celular) y el muro se endereza al bajar.
- **Título 8:** degradado azul de "Nvy Studios" (/trabajos) sobre una sombra casi negra que se apaga antes del borde, para no dejar línea contra Problemas.

## Abrirla

```sh
git checkout respaldo-portada-muro
node _build/build.mjs
node maqueta-borrador/opciones/generar.mjs
node _build/servir.mjs 4173
# http://localhost:4173/maqueta-borrador/opciones?hero=7c&tit=mixto
```

La URL va **sin** barra final: el servidor redirige `/opciones/` a `/opciones` y pierde los parámetros.

## Archivos

- `generar.mjs`: toma el `index.html` generado y le agrega la portada, las opciones y el panel.
- `opciones.css` y `opciones.js`: estilos y comportamiento de cada opción (`html[data-hero|tit|prob|proc|faq]`).
- `fotos/`: las 23 capturas del muro a 900 px. `fotos-640/` tiene las mismas a 640 px (421 KB en total), listas para el sitio.

Para pasarla al sitio: el muro va dentro de `.pregunta` (ver la función `muro` de `generar.mjs`). Las reglas que sirven son las de la portada 7 y 7c, y las del título `mixto`. El JS de `--s` (enderezar al bajar) está en `opciones.js`.
