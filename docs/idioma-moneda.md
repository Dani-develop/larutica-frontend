# Idioma y moneda en LaRutica

La navegación pública, el catálogo, el flujo de reservas y los formularios de acceso permiten elegir español o inglés, independientemente de USD, CRC o EUR. Los textos redactados por los proveedores conservan su idioma original. La administración completa no forma parte de esta traducción.

## Implementación

- `PreferencesProvider` comparte las preferencias entre pantallas. `localStorage` recuerda las opciones en ese navegador y el evento `storage` sincroniza pestañas. Si el almacenamiento está bloqueado, las opciones funcionan durante la visita.
- Un diccionario local traduce la interfaz, sin consultas a servicios de traducción ni recargas. `html.lang` identifica el idioma para tecnologías de asistencia. `Intl.NumberFormat` y `Intl.DateTimeFormat` dan formato por idioma; las salidas conservan la zona horaria de Costa Rica.
- `/api/exchange-rates` consulta únicamente USD → CRC/EUR en Frankfurter v2. No envía información del viajero. Valida cotizaciones, limita la espera a cinco segundos y comparte solicitudes simultáneas.
- Las cotizaciones se conservan seis horas en el servidor y el navegador; las respuestas públicas admiten caché HTTP. La consulta comienza al usar el selector de moneda o restaurar una moneda distinta de USD, sin bloquear el catálogo.
- CRC/EUR aparecen como conversiones aproximadas, con el precio original USD en la revisión y confirmación. La reserva envía salida y personas: el servidor calcula el precio original. Los filtros de presupuesto siguen expresados explícitamente en USD.
- Si las cotizaciones fallan, se muestran precios USD con aviso y opción de reintentar. No se inventan cotizaciones. Se descartan datos inválidos o de más de siete días.

## Prácticas aplicadas

Selectores independientes, opción actual marcada, nombres de idioma en su propio idioma, códigos monetarios visibles, controles de al menos 44 px y diseño adaptable. Los diálogos Radix proporcionan título y descripción accesibles, foco contenido, cierre con Escape y devolución del foco al control que abrió el selector. No se usa traducción del DOM ni se cambian nombres, descripciones o precios guardados en la base de datos.

Referencias: [precios y moneda del viajero en Booking](https://developers.booking.com/demand/docs/accommodations/pricing-examples), [moneda de visualización en Airbnb](https://www.airbnb.com/help/article/3796), [diálogos WAI-ARIA](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/), [Radix Dialog](https://www.radix-ui.com/primitives/docs/components/dialog), [Frankfurter](https://frankfurter.dev/).

## Verificación

El dashboard usa el mismo selector ES/EN y la misma preferencia persistente que la landing. Solo muestra el control de idioma: cambiarlo traduce navegación, formularios, estados y fechas sin recargar ni consultar servicios de traducción. Las opciones enviadas al servidor mantienen sus valores originales; los nombres y descripciones escritos por usuarios y proveedores no se traducen.

Pruebas aisladas de conversión, validación de cotizaciones, caché del servidor, peticiones simultáneas y fallo de conexión. Pruebas de navegador con respuestas simuladas para persistencia, ES/EN, CRC/EUR, foco, presentación móvil, reutilización del catálogo y envío de reserva sin precio convertido. Estas pruebas no escriben en Supabase.

La funcionalidad no requiere migraciones de base de datos ni nuevas dependencias. Para recibirla en otro equipo, traer los cambios del repositorio y usar el Site publicado, que incorpora el nuevo endpoint.
