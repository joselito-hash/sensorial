# Base de datos de Sensorial Boutique

La web sigue abriendo con el catálogo local mientras `supabase-config.js` esté vacío. Al conectar un proyecto, lee las tablas públicas y muestra reseñas aprobadas. Las reseñas nuevas pasan por una función con Cloudflare Turnstile y quedan pendientes.

## Modelo

| Tabla | Contenido |
|---|---|
| `brands`, `families` | Casas y cuatro familias, con fotos, video y perfume destacado de la portada. |
| `perfumes` | Una fila por fórmula y concentración. Guarda origen, familia, foto, lámina, edición, año, público, ranking y visibilidad. |
| `perfume_variants` | Tamaños, SKU, precio y existencias opcionales; la web actual cotiza por WhatsApp. |
| `perfume_images` | Fotos adicionales para el carrusel de cada ficha. |
| `notes`, `perfume_notes` | Notas reutilizables, separadas en salida, corazón y fondo, con orden y procedencia. |
| `accords`, `perfume_accords` | Acordes, color, intensidad y orden. |
| `perfume_usage` | Seis puntuaciones: estaciones, día y noche. |
| `perfume_sources` | Fuente, URL y base de derechos de cada conjunto de datos. |
| `reviews` | Texto, nombre, ciudad y estrellas; estado pendiente/publicada/rechazada, consentimiento de publicación y foto, selección para la portada. |

Las vistas `catalog_public` y `featured_reviews` entregan los campos que usa `app.js`. Todas las tablas públicas tienen RLS. El navegador solo lee perfumes publicados y reseñas aprobadas; no puede consultar la referencia privada de la licencia, modificar el catálogo ni publicar una reseña directamente. La función `submit-review` es la única ruta de recepción, valida Turnstile y crea la reseña como `pending`.

## Puesta en marcha con GitHub y Vercel

El repositorio existente es `joselito-hash/sensorial` y la web publicada usa `https://sensorial-azure.vercel.app`. La carpeta local aún no contiene `.git`; para sincronizarla por terminal, clona primero el repositorio existente y pasa allí los archivos nuevos. En la captura del repositorio faltan `supabase-config.js`, `supabase-data.js` y `supabase/`; sube también las versiones actuales de `index.html` y `app.js`, que cargan y consumen esos archivos. GitHub Pages no forma parte de esta instalación.

Vercel sirve esta página estática desde el repositorio. Sus variables de entorno no rellenan automáticamente `supabase-config.js`: la URL del proyecto, la publishable key y la site key pública de Turnstile se escriben en ese archivo y se suben con la web. Las claves privadas quedan en Supabase Edge Function Secrets.

1. Desde el proyecto Supabase ya creado, copia **Project URL** y **publishable key** del menú Connect. Nunca pongas la **secret key** ni la `service_role` en los archivos del sitio.
2. En SQL Editor ejecuta, en este orden: `supabase/migrations/20261003_001_sensorial.sql`, `supabase/seed.sql` y `supabase/seed_fragrance.sql`. La última carga usa los datos que ya estaban en `app.js`: aplícala si tu autorización comercial de Fragrantica cubre su almacenamiento y publicación. Registra el folio real de tu licencia en `perfume_sources.license_reference`.
3. Crea un widget de Cloudflare Turnstile para el dominio definitivo. Su **site key** es pública; su **secret key** queda solo en Supabase.
4. Vincula este directorio al proyecto con Supabase CLI y despliega la función:

   ```powershell
   supabase login
   supabase link --project-ref TU_PROJECT_REF
   supabase secrets set TURNSTILE_SECRET_KEY=TU_SECRETO SITE_ORIGIN=https://sensorial-azure.vercel.app
   supabase functions deploy submit-review
   ```

5. Completa `supabase-config.js` con la URL, publishable key y site key. Configura `SITE_ORIGIN=https://sensorial-azure.vercel.app` y registra `sensorial-azure.vercel.app` como hostname permitido en Turnstile (sin `https://`).
6. En Supabase Table Editor revisa `reviews`. Cambia `status` a `published` para mostrar una reseña; marca `is_featured` si también debe aparecer en la portada. El disparador completa `published_at`. Cambia el estado a `rejected` para ocultarla.

Para pruebas locales, puedes añadir `http://localhost:5500` a `SITE_ORIGIN` (separado por coma) y permitir `localhost` en un widget Turnstile de prueba. La revisión visual local requiere un servidor HTTP; abrir `index.html` como archivo no equivale al origen configurado.

## Datos de Fragrantica mediante Apify

El actor [`lexis-solutions/fragrantica`](https://apify.com/lexis-solutions/fragrantica/api) es un **extractor de un tercero**, no una API oficial de Fragrantica. Actualmente su ficha indica **«Under maintenance»**, así que una ejecución real puede fallar. El propietario confirmó que su autorización escrita incluye extracción mediante terceros; registra el folio real en `perfume_sources.license_reference` antes de publicar una actualización. Consulta también los [términos de Fragrantica](https://www.fragrantica.com/Terms-of-Service.phtml) para el alcance de esa autorización.

`supabase/generate-fragrance-seed.mjs` sigue generando el respaldo inicial desde los datos existentes en `app.js`. La integración nueva tiene dos pasos separados:

1. `supabase/fetch-apify-export.mjs` ejecuta el actor desde Node y guarda su JSON. Usa `APIFY_TOKEN` en el entorno local, nunca en `supabase-config.js` ni en el navegador. Exige `--max-usd` para limitar el gasto de la ejecución. El input predeterminado envía las 14 URL exactas de `app.js`; si el actor no acepta las URL `.es`, prepara un archivo de input propio y usa `--input`.
2. `supabase/import-apify-export.mjs` inspecciona la exportación. Empareja por el ID numérico de Fragrantica de la URL y del resultado, omite duplicados y datos incompletos. Con `--write-sql` genera una transacción SQL revisable. No conecta con Supabase ni modifica la base automáticamente.

Ejemplo en PowerShell, después de crear una cuenta Apify y configurar `APIFY_TOKEN` **fuera del repositorio**:

```powershell
New-Item -ItemType Directory -Force supabase/exports | Out-Null
node supabase/fetch-apify-export.mjs --output supabase/exports/fragrantica.json --max-usd 1
node supabase/import-apify-export.mjs --input supabase/exports/fragrantica.json
node supabase/import-apify-export.mjs --input supabase/exports/fragrantica.json --write-sql supabase/exports/fragrantica-revisado.sql --license-ref 'TU-FOLIO-REAL'
```

Abre el SQL y revisa nombres, idioma, fórmulas y cambios antes de ejecutarlo en SQL Editor. El actor puede devolver términos en inglés aunque la web esté en español. La pirámide `single` se omite porque la interfaz actual necesita salida/corazón/fondo. Los votos de estaciones, día y noche se convierten a escala 0–100 respecto al voto mayor de cada perfume; **no** son porcentajes de usuarios. El actor no proporciona una concentración confiable como campo separado: el importador conserva la concentración, las fotos y los nombres ya curados. Tampoco copia reseñas de Fragrantica a `reviews`: esa tabla es solo para testimonios enviados y moderados en Sensorial. La exportación JSON y el SQL generado se ignoran en Git mediante `supabase/exports/`.

Si una ejecución termina después de interrumpirse el terminal, el comando imprime su ID. Recupera el resultado sin iniciar otra ejecución con:

```powershell
node supabase/fetch-apify-export.mjs --run-id ID_DE_EJECUCION --output supabase/exports/fragrantica.json
```

## Comprobaciones tras conectar

- `catalog_public` debe devolver 14 perfumes publicados, con tres fases de notas, acordes, uso y dos fotos adicionales para Bleu de Chanel.
- `featured_reviews` empieza vacío. Una reseña `pending` no debe aparecer ni en la portada ni en una ficha.
- Tras aprobar una reseña y marcarla destacada, aparece en ambos lugares al recargar la página.
- La lista del pedido sigue en `localStorage` del navegador: no necesita cuenta ni expone datos privados en Supabase.

La instalación remota y el envío real de reseñas quedan pendientes hasta aplicar el SQL, configurar Turnstile y desplegar `submit-review` en el proyecto Supabase existente.
