# Sensorial Boutique: landing

Página estática (HTML + CSS + JS, sin instalación). Se publica subiendo la carpeta tal cual a cualquier hosting (Netlify, Vercel, GitHub Pages, cPanel).

## Pestañas

Todo vive en `index.html`. El menú tiene tres pestañas y al cambiar de una a otra el contenido se desliza de lado (hacia la izquierda si avanzas en el orden del menú, hacia la derecha si regresas). La línea bajo el menú se desliza hasta la pestaña activa y queda centrada bajo la palabra.

- **Inicio:** la portada con las fotos por familia (sin cambios), "Más vendidos" (una fila que se desliza de lado, con su número de puesto y el botón "Ver catálogo") y "Lo que dicen nuestros clientes": un muro de capturas y frases reales (en el teléfono se desliza de lado).
- **Más vendidos:** se eligen en `app.js`, bloque `CONFIG`, campo `masVendidos` (los id de los perfumes, en orden). Los de ahora son de ejemplo. La misma lista aparece en la búsqueda antes de escribir.
- **Catálogo:** las preguntas (primero "Diseñador y árabes, en un mismo lugar", después la familia; cada tarjeta dice cuántos perfumes hay y las que no tienen se ven apagadas) se hacen una sola vez por visita. Después, cualquier botón o enlace al catálogo lleva directo a los perfumes, y los filtros sirven para cambiar de origen o familia. En el teléfono, los filtros se abren con un botón fijo ("Filtros", con el resumen de lo elegido) en una hoja que sube desde abajo: los cambios se aplican al momento, "Limpiar" quita todo y "Ver N perfumes" la cierra. Debajo de las dos preguntas siempre hay un botón "Ver todo". El enlace "Catálogo" del menú recuerda los filtros que dejaste.
- **Pedido:** la lista completa (foto, familia, notas y botón para quitar), la vista previa del mensaje como burbuja de chat con el botón de WhatsApp, y "Antes de pedir" con las preguntas frecuentes. El menú muestra cuántos perfumes llevas. En esta pestaña no aparece la barra flotante, porque la lista ya ocupa la página.
- Cada pestaña y cada paso tienen su dirección (`#catalogo`, `#catalogo?origen=arabe&familia=orientales`, `#catalogo?todo`, `#pedido`), así que el botón "atrás" del navegador funciona y se pueden compartir enlaces.
- La carpeta `.claude` solo sirve para la vista previa local; no hace falta subirla al hosting.

## Lo que tienes que completar

1. **Número de WhatsApp.** Ya está puesto en `app.js`, bloque `CONFIG`: `"527445424972"` (52 es el código de México, seguido de tu número de 10 dígitos). Si cambias de número, escríbelo igual: código de país y solo dígitos.
1. **Lo que dicen nuestros clientes.** En `app.js`, lista `TESTIMONIOS`. Solo mensajes reales: capturas de WhatsApp (guárdalas en `img/clientes/`) o frases copiadas tal cual, con nombre, ciudad y perfume opcionales. Mientras la lista esté vacía, la sección no aparece en la página publicada; en tu computadora (localhost) se ven marcos de ejemplo para que veas cómo quedará.
2. **Catálogo.** En `app.js`, la lista `PERFUMES` es de ejemplo: 14 perfumes elegidos porque existe una foto real y libre de cada frasco. Reemplázala por tu inventario. Cada perfume lleva `casa`, `nombre`, `origen` (`"Diseñador"` o `"Árabe"`), `familia` (`frescos`, `dulces`, `amaderados`, `orientales`), `foto`, sus notas, sus acordes y cuándo usarlo.
   - **Datos de Fragrantica.** Las notas, los acordes (nombre, intensidad y color) y el "cuándo usarlo" se tomaron de la página de cada perfume en Fragrantica el 2 de octubre de 2026; la dirección está en el campo `fuente`. El "cuándo usarlo" son votos de su comunidad, convertidos a una escala de 0 a 100. La ficha enlaza a Fragrantica como fuente; conviene dejar ese crédito.
   - **Versiones.** Sauvage y Eros usan los datos de su Eau de Parfum, que es el frasco de la foto. Bleu de Chanel usa los del Eau de Toilette; si vendes otra versión, cambia el campo `fuente` y los datos.
   - Para un perfume nuevo, dime el nombre o el enlace de Fragrantica y lo agrego con sus datos.
3. **Láminas del catálogo.** Solo Eros tiene la imagen del frasco rodeado de sus notas. Las otras 13 se generan con el prompt de `IMAGENES.md`.
4. **Datos del negocio que no inventé.** No hay precios, envíos, formas de pago, garantía de originalidad, dirección ni redes. Si quieres mostrarlos, van en "Antes de pedir", dentro de la pestaña Pedido en `index.html`.

## Fotos

- Las fotos son reales, de Unsplash (licencia libre, uso comercial permitido, sin atribución obligatoria). Se cargan desde sus servidores en alta resolución, con varios tamaños según la pantalla.
- En `app.js`, el campo `foto` acepta el identificador de una foto de Unsplash (como los actuales) o la ruta de una foto tuya, por ejemplo `"img/sauvage.jpg"`.
- El campo `lamina` es la imagen cuadrada sobre blanco con el frasco y sus notas. Si existe, el catálogo la usa en lugar de la foto.
- El campo opcional `galeria` acepta dos imágenes adicionales (`[{ src, alt }, { src, alt }]`). La ficha muestra entonces un carrusel de tres imágenes. Bleu de Chanel ya incluye dos imágenes de notas amaderadas; los demás perfumes están listos para recibir las suyas.
- Solo encontré dos perfumes árabes con foto libre del frasco correcto (Lattafa Oud for Glory y Oud Mood). Para el resto de tus árabes necesitarás fotos propias.
- Las fotos grandes del inicio están en `FAMILIAS` (`hero`), y las de ingredientes en `ingrediente`. Las de las dos opciones del catálogo (diseñador y árabes) están en `index.html`, marcadas con `FOTO DE STOCK`. "Más vendidos" usa las fotos de los perfumes (`foto`).

## Decisiones de diseño

- **Referencia:** superficie oscura redondeada con foto protagonista y tarjeta flotante.
- **Intro:** el logotipo se forma por partes: la luna se traza, los rayos y los brillos salen de ella, las ondas se abren hacia los lados, "Sensorial" se escribe letra por letra y al final llegan BOUTIQUE y sus líneas. Después la intro se levanta con un borde difuso. Dura unos 4 segundos y no se puede saltar: mientras corre, la página no responde a clics ni al teclado. Corre una sola vez por visita: no se repite al volver al inicio ni al recargar (vuelve a verse si cierras la pestaña y entras otra vez). No aparece con "reducir movimiento" ni al llegar directo al catálogo o al pedido. El logo de la intro va dentro de `index.html` (el SVG separado por partes); el de la barra y el pie sigue siendo `img/sensorial-logo.svg`.
- **Catálogo:** conserva hasta cuatro tarjetas por fila en escritorio, con una sombra negra tenue hacia abajo en lugar del contorno visible. Cada tarjeta muestra la imagen, el nombre, la casa y tres notas con sus iconos. "Ver todas las notas" despliega el resto con una animación suave: solo crece esa tarjeta (las demás de la fila no se estiran) y al abrir otra se cierra la anterior. En el teléfono, cada familia se desliza de lado.
- **Búsqueda:** al enfocar la barra, los enlaces se apagan, la barra crece con una animación suave sobre el espacio de navegación y, justo después, el resto de la página se difumina de forma gradual. Al cerrar ocurre al revés. Sin escribir nada muestra los más vendidos. Los resultados van en filas (foto, nombre con la parte que coincide resaltada, casa, versión y familia) y a la derecha una vista previa del perfume bajo el puntero o el teclado, sobre el color de su familia, con sus notas principales y los botones "Ver ficha" y "Agregar". Si no hay resultados, lo dice y sugiere tres perfumes. En el teléfono solo aparecen las filas.
- **Lista:** una pastilla flotante abajo con las fotos de los últimos perfumes agregados, el conteo y el botón de WhatsApp. Agregar un perfume no abre nada: la pastilla solo confirma con "Agregaste…" un par de segundos. El panel con el detalle (foto, casa, versión, familia y botón para quitar; "Ver tu pedido" y "Vaciar lista" al final) se abre solo al tocar el resumen, y se cierra con la X, con Esc o tocando fuera. La lista del panel no muestra barra de desplazamiento (se puede deslizar igual).
- **Preguntas frecuentes:** dentro de la pestaña Pedido, como "Antes de pedir": título a la izquierda y un acordeón limpio separado por líneas finas. Solo queda una respuesta abierta a la vez.
- **Ficha del perfume:** al tocar la imagen o el nombre se abre una ventana con la foto grande y el color de la familia como marco. Si el perfume tiene `galeria`, sus tres imágenes avanzan automáticamente y también se pueden cambiar con los controles; con "reducir movimiento" no avanzan solas. La columna de texto se desliza y muestra: a qué huele, todas las notas por momento (al inicio, después, al final) con su icono, el botón de agregar, un botón de WhatsApp solo para ese perfume, los acordes principales en barras, cuándo usarlo (estaciones, día y noche; las barras de ambos bloques solo se animan cuando el bloque queda a la vista al deslizar) y otros perfumes de la misma familia en una fila que se desliza de lado. En escritorio la imagen vuela desde la tarjeta; en el teléfono la ficha sube desde abajo. Se cierra con la X, con Esc o tocando fuera.
- **Iconos de notas:** se asignan solos según el tipo de nota (cítrico, flor, especia, madera, etc.). La tabla está en `app.js`, en `ICONOS_NOTA`; una nota que no coincida con ninguna muestra un destello.
- **Logotipo:** el SVG proporcionado está en `img/sensorial-logo.svg`, recortado al contenido y adaptado a claro para el fondo oscuro. Se usa en la barra, la intro y el pie. La barra aplica la misma entrada difusa de la intro cuando se permite movimiento.
- **Parallax:** las fotos se mueven más lento que su marco al hacer scroll; las tarjetas de familia y la tarjeta flotante se mueven a distinta profundidad; en el inicio, las capas siguen al puntero.
- **Inicio:** cambia de familia solo cada 6.5 segundos hasta que la persona toca algo.
- **Color:** fondo `#221c20`, texto claro y acentos por familia (azul, frambuesa, verde, ámbar). La intro usa el mismo fondo oscuro.
- **Tipografía:** Urbanist.
- **Forma:** todo suave. Hoja 2rem, marcos de foto 1.5rem, tarjetas 1.25rem, controles en pastilla.

## Para producción

- Las fuentes, los iconos y las fotos se cargan desde terceros (Google Fonts, Phosphor en jsDelivr, Unsplash). Si quieres que la página no dependa de ellos, descárgalos y sírvelos desde la misma carpeta.
- Las marcas de perfumes se mencionan solo para identificar los productos que revendes.
