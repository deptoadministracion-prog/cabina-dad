# Cabina de proyección de eventos · DAD

Maqueta de la cabina de proyección de eventos del Departamento de Administración (DAD) del CUCEA, Universidad de Guadalajara. Permite cambiar desde un celular lo que se proyecta en un evento: entrada, loop general, QR de descarga, presentación y QR de asistencia.

## Estado

Es una **maqueta sin conexión** (etapa 1). Todo el material que contiene es **ficticio**: no hay datos, archivos ni nombres reales de eventos, libros o personas. No se conecta a ninguna base de datos ni a otros sitios. El código QR que aparece es solo un dibujo de ejemplo y no se puede escanear.

## Qué contiene

El sitio está en la carpeta `docs/`, que es la que publica GitHub Pages:

- `index.html`: inicio con accesos.
- `proyeccion/`: pantalla de la computadora de cabina.
- `control/`: control remoto para el celular.
- `css/`, `js/`, `fonts/`, `img/`: estilos, código, tipografía y logo.
- `archivos-ejemplo/`: un PDF ficticio de 5 páginas.
- `vendor/pdfjs/`: [pdf.js](https://mozilla.github.io/pdf.js/), alojado aquí (sin CDN) para mostrar la presentación una página a la vez.

## Cómo verla en tu computadora

Es un sitio estático, así que basta con servir la carpeta `docs/`. Con Python instalado, desde esta carpeta:

```
python -m http.server 8001 --directory docs
```

Luego abre `http://localhost:8001` en Chrome, Edge o Firefox. Para detener el servidor, presiona `Ctrl+C`.

## Licencias de terceros

- **Íconos:** [Lucide](https://lucide.dev), licencia ISC. Están incluidos dentro de `docs/js/comun.js`.
- **Tipografía:** Montserrat, licencia SIL Open Font License 1.1 (OFL). El texto de la licencia está en `docs/fonts/OFL.txt`.
- **Visor de PDF:** [pdf.js](https://github.com/mozilla/pdf.js) (paquete `pdfjs-dist` 6.5.438, compilación "legacy"), de Mozilla, licencia Apache 2.0. La licencia está en `docs/vendor/pdfjs/LICENSE` y, en sus subcarpetas, las de los datos que incluye (fuentes estándar, mapas de caracteres y decodificadores de imagen). La nota de procedencia está en `docs/vendor/pdfjs/LEEME-pdfjs.txt`.
- **Logo:** el logo del DAD (`docs/img/logo-dad-anillo.png`) es de la institución y se incluye únicamente para esta maqueta.
