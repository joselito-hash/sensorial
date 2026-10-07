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

## Panel privado de administración

El panel está en `admin.html` (después de publicarlo: `https://sensorial-azure.vercel.app/admin.html`). No aparece en la navegación de la tienda. El HTML de inicio de sesión es accesible si alguien conoce la URL; **los datos y las operaciones están protegidos en Supabase**, mediante Auth y la lista privada `private.sensorial_admins`. `robots` evita la indexación normal, pero no es una medida de seguridad.

Para activarlo:

1. En **Supabase → SQL Editor**, ejecuta `supabase/migrations/20261003_002_admin_panel.sql` una sola vez. Requiere que la migración `001` ya exista.
2. En **Storage**, crea un bucket llamado exactamente `sensorial-perfumes`, márcalo como **Public** y limita las subidas a imágenes JPG, PNG, WebP o AVIF de hasta 5 MB. Las políticas de la migración solo dejan subir archivos a la cuenta administradora. Esto permite usar el botón de subir fotos sin modificar GitHub cada vez.
3. En **Authentication → Users**, crea un usuario con tu correo y una contraseña fuerte mediante **Add user**. Si ya tienes un usuario de Auth, úsalo; tu cuenta de acceso al *dashboard* de Supabase no es automáticamente una cuenta de Auth de este proyecto. Copia el **User UID** del usuario.
4. En **SQL Editor**, ejecuta esta consulta sustituyendo el UUID por el de tu usuario. No guardes tu contraseña ni el UUID en `admin.js` o `supabase-config.js`:

   ```sql
   insert into private.sensorial_admins (user_id)
   values ('TU-USER-UID')
   on conflict (user_id) do nothing;
   ```

5. Después de crear tu usuario, en **Authentication → General configuration** puedes apagar **Allow new users to sign up**: así solo podrán iniciar sesión las cuentas ya existentes. La lista privada seguirá decidiendo quién administra la tienda.
6. Sube `admin.html`, `admin.css`, `admin.js` y la nueva migración al repositorio que despliega Vercel. Abre `/admin.html` e inicia sesión con el usuario de **Authentication → Users**.

En **Resumen** aparecen los perfumes publicados, borradores y reseñas pendientes. **Perfumes** permite crear y modificar casas, ficha, fotos del carrusel, notas, acordes, uso, tamaños y fuente principal; los cambios de una ficha se guardan juntos. Puedes subir fotos al bucket o pegar sus URL. **Reseñas** permite publicar, rechazar, destacar en la portada, marcar una compra verificada y eliminar. «Ocultar de la tienda» conserva la ficha como borrador. Las reseñas nuevas siempre llegan como `pending`.

Si reemplazas una foto subida, el archivo anterior permanece en Storage. Puedes borrarlo manualmente del bucket después de comprobar que ninguna ficha lo utiliza. Si una ficha falla después de subir fotos, conserva las URL que el formulario agregó y vuelve a guardar; las fotos ya subidas no se pierden.

Para revocar el acceso de un usuario, borra **solo su fila** de `private.sensorial_admins` desde SQL Editor. El panel vuelve a comprobar el permiso en cada operación, por lo que una sesión iniciada no concede acceso después de revocarlo.

Para pruebas locales, puedes añadir `http://localhost:5500` a `SITE_ORIGIN` (separado por coma) y permitir `localhost` en un widget Turnstile de prueba. La revisión visual local requiere un servidor HTTP; abrir `index.html` como archivo no equivale al origen configurado.

## Traer perfumes de Fragrantica desde el panel

En el editor de cada perfume hay una sección **Traer de Fragrantica**: escribes el nombre (o pegas el enlace de su página en Fragrantica), eliges el resultado y el formulario se llena con nombre, casa (la elige si ya existe o la deja lista como casa nueva), año, público, las tres fases de notas, los acordes con su intensidad, la foto que publica Fragrantica y la fuente. Nada se guarda hasta pulsar **Guardar perfume**. Si la ficha ya tiene datos, el panel pregunta si reemplazarlos o solo llenar lo vacío.

Cómo funciona y sus límites:

- **Fuente principal: Fragrantica al día, vía Apify.** La función de Supabase `fragrantica-buscar` usa el extractor [`parsebird/fragrantica-scraper`](https://apify.com/parsebird/fragrantica-scraper), que lee la edición en español de Fragrantica en el momento. Necesita el secreto `APIFY_TOKEN`. Cada búsqueda trae como máximo 5 perfumes (centavos de dólar). Tarda entre 20 segundos y un minuto porque lee Fragrantica en ese momento. Es un extractor de un tercero, no una API oficial: puede fallar si Fragrantica cambia su página.
- **Respaldo: PerfumAPI.** Si falta el token, Apify falla o no encuentra el perfume, la función busca en [PerfumAPI](https://github.com/seccaz/PerfumAPI), que no necesita clave pero tiene pocos perfumes (unos 250), no trae acordes y a veces trae datos mal leídos. Sus notas llegan en inglés y el panel las traduce; las que no reconoce las deja en inglés y lo avisa. El panel indica de qué fuente salió cada búsqueda.
- **No viene "cuándo usarlo"** (estaciones, día y noche): se completa a mano.
- **Colores de los acordes:** Fragrantica no los entrega. Se usa el color que ese acorde ya tenga en tu base de datos; si es nuevo, uno parecido al de Fragrantica; si no se conoce, gris. Puedes cambiarlo en la ficha.
- **Fotos:** la función copia la foto de Fragrantica al bucket `sensorial-perfumes`, para que la tienda no dependa de su servidor. Si la copia falla, usa el enlace original.
- La función solo responde a cuentas de `private.sensorial_admins`. La autorización de Fragrantica registrada en `perfume_sources.license_reference` debe cubrir esta extracción y el uso de sus fotos.

Para activarla (usa el `SITE_ORIGIN` que ya configuraste para `submit-review`):

1. Crea el secreto `APIFY_TOKEN` en **Edge Functions → Secrets** con tu token de Apify (Settings → API & Integrations en apify.com).
2. Publica la función: desde el dashboard (**Edge Functions → Deploy a new function → Via Editor**, nombre `fragrantica-buscar`, pegar `supabase/functions/fragrantica-buscar/index.js`) y apaga **Enforce JWT Verification** en sus ajustes; o con la CLI: `supabase functions deploy fragrantica-buscar`.

Opcional: `APIFY_ACTOR` cambia el extractor de Apify (por defecto `parsebird~fragrantica-scraper`) y `PERFUMAPI_URL` apunta el respaldo a una copia propia de PerfumAPI.

## Tablas de pagos (apartados en abonos)

En el panel, la sección **Pagos** arma la tabla de pagos de cada apartado con la plantilla de Sensorial y le da al cliente un enlace propio (`pagos.html#TOKEN`) que se abre con una animación y un fondo animado.

Para activarla:

1. En **SQL Editor**, ejecuta `supabase/migrations/20261007_003_payment_plans.sql` una sola vez. Requiere las migraciones `001` y `002`.
2. Sube al repositorio `pagos.html`, `pagos.js`, `tabla-pagos.js`, `tabla-pagos.css` y las versiones nuevas de `admin.html`, `admin.js` y `admin.css`.

Las fotos van al bucket `sensorial-perfumes` que ya usa el panel, en la carpeta `pagos/`; no hace falta crear otro.

Cómo se usa:

- **Nueva tabla:** escribe el cliente, la casa y el nombre del perfume (este va en letra manuscrita, con el color que elijas). El texto grande de fondo se sugiere solo: la casa si es corta (BURBERRY) o sus iniciales si es larga (CH); puedes cambiarlo o subir una **silueta** en PNG (como el perrito de Ferrioni), que se usa en lugar del texto.
- **Fotos:** sube el frasco en PNG sin fondo. La plantilla recorta los bordes transparentes, reduce la foto a 1600 px como máximo, la centra y la ajusta a su lugar; todos los frascos quedan del mismo alto sin que tengas que acomodarlos.
- **Plan de pagos:** escribe el total y cuántos pagos y pulsa **Repartir en partes iguales** (si no sale exacto, el último pago absorbe los centavos), o agrega los pagos uno por uno. La fecha límite de cada pago es opcional.
- **Abonos:** en la tarjeta de cada tabla, **+ Registrar abono** propone lo que falta del siguiente pago, avisa cuánto quedará pendiente y qué pagos se van a tachar, y no deja abonar más de lo pendiente. Los abonos se aplican en orden: un pago se tacha cuando lo abonado lo cubre; si solo cubre una parte, la tabla dice cuánto falta de ese pago. También puedes agregar o quitar abonos desde **Editar**.
- **Compartir:** **Copiar enlace** o **Enviar por WhatsApp**. El enlace siempre muestra la tabla al día: después de cada abono no hace falta mandarlo otra vez. **Descargar imagen** guarda la tabla como PNG (la misma que puede descargar el cliente), por si prefieres mandarla como foto.
- **Liquidada:** cuando lo abonado cubre el total, el enlace muestra la pantalla "Ya es tuyo" (sello de liquidado, total pagado y el botón **Coordinar mi entrega**). En el panel pasa a **Liquidadas**.

Privacidad: el navegador del cliente no puede listar las tablas; solo lee la suya con su token aleatorio, mediante `sensorial_payment_plan()`. Las notas de los abonos (efectivo, transferencia…) solo se ven en el panel. Eliminar una tabla desactiva su enlace; las fotos que subió se quedan en Storage y se pueden borrar a mano.

## Recordar la sesión del panel

En el inicio de sesión, **Recordarme en este dispositivo** guarda la sesión en el navegador (sigue abierta al cerrarlo) y deja el correo escrito para la próxima vez. Sin marcarla, la sesión termina al cerrar la pestaña. Úsala solo en tus propios dispositivos. **Cerrar sesión** siempre termina la sesión; el correo recordado se mantiene hasta que entres sin marcar la casilla.

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

El panel privado requiere una segunda migración y un usuario autorizado; subir solo los archivos de la web no activa los permisos de administración.
