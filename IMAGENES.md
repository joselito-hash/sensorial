# Láminas del catálogo: frasco rodeado de sus notas

El catálogo ya está preparado para imágenes como `img/eros.webp`: cuadradas, fondo blanco puro, el frasco al centro y sus ingredientes alrededor. La página mezcla el blanco de la imagen con el gris suave del recuadro, así que el frasco y sus notas quedan flotando sin borde.

Hoy solo Eros tiene lámina. Los otros 13 perfumes muestran una foto normal hasta que exista la suya.

## Cómo agregar una lámina

1. Genera la imagen con la misma herramienta que usaste para la de Eros, usando el prompt de abajo.
2. Guárdala en la carpeta `img/` con el nombre de archivo de la tabla (formato `.webp`, `.png` o `.jpg`).
3. En `app.js`, en la línea de ese perfume, agrega `lamina: "img/NOMBRE.webp"` igual que en la línea de Eros. O dime que ya están en la carpeta y lo hago yo.

## Prompt base

> Fotografía de producto cenital (flat lay) sobre fondo blanco puro. En el centro, el frasco de **[PERFUME]** visto de frente, fiel al frasco real. Alrededor, bien separados y sin tocar el frasco, sus ingredientes: **[INGREDIENTES]**. Luz de estudio suave, sombras ligeras debajo de cada elemento, sin texto añadido, sin marco. Formato cuadrado 1:1, 1080 x 1080 px o más.

## Perfume, archivo e ingredientes

| Perfume | Archivo | Ingredientes para el prompt |
|---|---|---|
| Dior Sauvage Eau de Parfum | `sauvage.webp` | bergamota, pimienta de Sichuan, lavanda, anís estrellado, nuez moscada, vaina de vainilla |
| Giorgio Armani Acqua di Giò | `acqua-di-gio.webp` | lima, limón, bergamota, flores de jazmín, ramitas de romero, astillas de cedro, sal marina |
| Dolce & Gabbana Light Blue | `light-blue.webp` | limón siciliano, manzana, tallos de bambú, jazmín, rosa blanca, astillas de cedro |
| Versace Dylan Blue | `dylan-blue.webp` | bergamota, toronja, hojas de higuera, pimienta negra, hojas de pachulí, haba tonka, hebras de azafrán |
| Yves Saint Laurent Libre | `libre.webp` | lavanda, mandarina, grosellas negras, flor de azahar, jazmín, vaina de vainilla |
| Lancôme La Vie Est Belle | `la-vie-est-belle.webp` | grosellas negras, pera, flor de iris, jazmín, praliné, vaina de vainilla, haba tonka |
| Versace Eros Eau de Parfum | `eros.webp` | ya está |
| Bleu de Chanel | `bleu-de-chanel.webp` | toronja, limón, hojas de menta, pimienta rosa, jengibre, astillas de cedro y sándalo, incienso |
| Terre d'Hermès | `terre-d-hermes.webp` | naranja, toronja, granos de pimienta, flor de pelargonio, raíces de vetiver, astillas de cedro |
| Hugo Boss Bottled | `boss-bottled.webp` | manzana, ciruela, bergamota, canela en rama, vaina de vainilla, astillas de sándalo y cedro |
| Lattafa Oud for Glory | `oud-for-glory.webp` | hebras de azafrán, nuez moscada, lavanda, astillas de madera de oud, hojas de pachulí |
| Lattafa Oud Mood | `oud-mood.webp` | pétalos de rosa, hebras de azafrán, astillas de madera de oud, caramelo, piedra de ámbar, incienso |
| Rabanne 1 Million | `1-million.webp` | mandarina roja, toronja, hojas de menta, canela en rama, rosa, piedra de ámbar, trozo de cuero |
| Chanel Coco Mademoiselle | `coco-mademoiselle.webp` | naranja, mandarina, bergamota, rosa, jazmín, hojas de pachulí, vaina de vainilla |

Los ingredientes de la tabla salen de las notas reales de cada perfume (las mismas que muestra la página).

## Recomendaciones

- El fondo debe ser blanco puro. Si sale gris o crema, se notará un recuadro alrededor de la composición.
- Deja aire alrededor: la composición no debe tocar los bordes de la imagen.
- Revisa que el frasco generado se parezca al real, sobre todo el nombre y el logotipo.

## Imágenes creadas para esta versión

Se generaron con la herramienta integrada de imágenes. La página usa `img/bleu-de-chanel-2.png` y `img/bleu-de-chanel-3.png` como imágenes complementarias de la ficha de Bleu de Chanel. La primera imagen del carrusel sigue siendo la foto existente del frasco.

**Bleu de Chanel, imagen 2:**

> Premium photorealistic macro still life of dark cedar wood grain, smooth sandalwood curls and fresh green vetiver blades. No bottle. Vertical composition suitable for a square crop, warm directional light, refined texture. No text, logos or watermark.

**Bleu de Chanel, imagen 3:**

> Premium photorealistic macro still life of polished dark wood panels with subtle incense smoke and a warm sunset beam. No bottle. Vertical composition suitable for a square crop, understated luxury atmosphere. No text, logos or watermark.
