# Sensorial Boutique: landing

Página estática (HTML + CSS + JS, sin instalación). Se publica subiendo la carpeta tal cual a cualquier hosting (Netlify, Vercel, GitHub Pages, cPanel).

## Lo que tienes que completar

1. **Número de WhatsApp.** En `app.js`, bloque `CONFIG`, pon `whatsapp` con código de país y solo dígitos (ej. `"5215512345678"`). Mientras esté vacío, WhatsApp abre y el cliente elige el contacto.
2. **Catálogo.** En `app.js`, la lista `PERFUMES` es de ejemplo: 14 perfumes elegidos porque existe una foto real y libre de cada frasco. Reemplázala por tu inventario. Cada perfume lleva `casa`, `nombre`, `origen` (`"Diseñador"` o `"Árabe"`), `familia` (`frescos`, `dulces`, `amaderados`, `orientales`), `foto`, sus notas, sus acordes y cuándo usarlo.
   - **Datos de Fragrantica.** Las notas, los acordes (nombre, intensidad y color) y el "cuándo usarlo" se tomaron de la página de cada perfume en Fragrantica el 2 de octubre de 2026; la dirección está en el campo `fuente`. El "cuándo usarlo" son votos de su comunidad, convertidos a una escala de 0 a 100. La ficha enlaza a Fragrantica como fuente; conviene dejar ese crédito.
   - **Versiones.** Sauvage y Eros usan los datos de su Eau de Parfum, que es el frasco de la foto. Bleu de Chanel usa los del Eau de Toilette; si vendes otra versión, cambia el campo `fuente` y los datos.
   - Para un perfume nuevo, dime el nombre o el enlace de Fragrantica y lo agrego con sus datos.
3. **Láminas del catálogo.** Solo Eros tiene la imagen del frasco rodeado de sus notas. Las otras 13 se generan con el prompt de `IMAGENES.md`.
4. **Datos del negocio que no inventé.** No hay precios, envíos, formas de pago, garantía de originalidad, dirección ni redes. Si quieres mostrarlos, van en la sección de preguntas de `index.html`.

## Fotos

- Las fotos son reales, de Unsplash (licencia libre, uso comercial permitido, sin atribución obligatoria). Se cargan desde sus servidores en alta resolución, con varios tamaños según la pantalla.
- En `app.js`, el campo `foto` acepta el identificador de una foto de Unsplash (como los actuales) o la ruta de una foto tuya, por ejemplo `"img/sauvage.jpg"`.
- El campo `lamina` es la imagen cuadrada sobre blanco con el frasco y sus notas. Si existe, el catálogo la usa en lugar de la foto.
- Solo encontré dos perfumes árabes con foto libre del frasco correcto (Lattafa Oud for Glory y Oud Mood). Para el resto de tus árabes necesitarás fotos propias.
- Las fotos grandes del inicio están en `FAMILIAS` (`hero`), y las de ingredientes en `ingrediente`. Las de "Diseñador y árabes" y el cierre están en `index.html`, marcadas con `FOTO DE STOCK`.

## Decisiones de diseño

- **Referencia:** ventana blanca redondeada con foto protagonista y tarjeta flotante.
- **Intro:** al entrar, sobre un fondo neutro claro, el nombre de la tienda se enfoca letra por letra, se traza una línea y la intro se levanta con un borde difuso. Dura unos 3 segundos y no se puede saltar: mientras corre, la página no responde a clics ni al teclado. No aparece con "reducir movimiento" ni al llegar por un enlace directo a una sección.
- **Catálogo:** sin bloque de fondo. La familia se indica de forma sutil: su color aparece en el título, en el anillo de la foto del ingrediente, en el botón "Agregar" y en los iconos de notas. Cada tarjeta blanca lleva la imagen, el nombre, la casa y tres iconos con sus notas principales. "Ver todas las notas" despliega el resto con una animación suave: solo crece esa tarjeta (las demás de la fila no se estiran) y al abrir otra se cierra la anterior. En el teléfono, cada familia se desliza de lado.
- **Ficha del perfume:** al tocar la imagen o el nombre se abre una ventana con el bloque de color de la familia y la imagen grande. La columna de texto se desliza y muestra: a qué huele, todas las notas por momento (al inicio, después, al final) con su icono, el botón de agregar, un botón de WhatsApp solo para ese perfume, los acordes principales en barras, cuándo usarlo (estaciones, día y noche; las barras de ambos bloques solo se animan cuando el bloque queda a la vista al deslizar) y otros perfumes de la misma familia en una fila que se desliza de lado. En escritorio la imagen vuela desde la tarjeta; en el teléfono la ficha sube desde abajo. Se cierra con la X, con Esc o tocando fuera.
- **Iconos de notas:** se asignan solos según el tipo de nota (cítrico, flor, especia, madera, etc.). La tabla está en `app.js`, en `ICONOS_NOTA`; una nota que no coincida con ninguna muestra un destello.
- **Logotipo:** una luna (icono `ph-moon`) junto al nombre.
- **Parallax:** las fotos se mueven más lento que su marco al hacer scroll; las tarjetas de familia y la tarjeta flotante se mueven a distinta profundidad; en el inicio, las capas siguen al puntero.
- **Inicio:** cambia de familia solo cada 6.5 segundos hasta que la persona toca algo.
- **Color:** hoja blanca y tinta neutra, más un color intenso por familia (azul, frambuesa, verde, ámbar) que se usa en los bloques del catálogo y en la ficha del perfume. La intro es neutra. Tema claro fijo.
- **Tipografía:** Urbanist.
- **Forma:** todo suave. Hoja 2rem, marcos de foto 1.5rem, tarjetas 1.25rem, controles en pastilla.

## Para producción

- Las fuentes, los iconos y las fotos se cargan desde terceros (Google Fonts, Phosphor en jsDelivr, Unsplash). Si quieres que la página no dependa de ellos, descárgalos y sírvelos desde la misma carpeta.
- Las marcas de perfumes se mencionan solo para identificar los productos que revendes.
