# Trayectos de publicaciones

El formulario incorpora un paso exclusivo después de Datos: Trayecto → Servicio → Experiencia → Revisión. Usa los componentes y tokens del sistema de diseño existente.

## Comportamiento

- Se seleccionan sugerencias de Costa Rica; se muestran provincia, cantón, distrito y país cuando el proveedor entrega esos datos. No se infiere el distrito a partir de la ciudad.
- Salida y llegada son lugares con identificador y coordenadas. Hasta diez puntos intermedios permiten dirigir el recorrido, conservando su orden. Los marcadores A/B y las paradas pueden arrastrarse para precisar la ubicación.
- Vehículo, a pie y senderismo calculan una propuesta con Geoapify. La opción acuático/u otro guarda solo ubicaciones: no inventa un recorrido por carretera ni calcula estimaciones para el agua.
- El punto de encuentro es independiente. El publicador puede elegir explícitamente que coincida con la salida o ubicarlo aparte y añadir indicaciones.
- Cada cambio requiere confirmar nuevamente. Se puede guardar un trayecto incompleto como borrador. Enviar una publicación nueva requiere un trayecto confirmado, incluso cuando solo contiene ubicaciones.
- Las publicaciones anteriores pueden conservar su ubicación textual. Una vez incorporado un trayecto confirmado, se requiere también en siguientes envíos a revisión.
- El viajero ve el trazado guardado, sin recalcular al abrir el detalle. Las tarjetas de reserva cargan su mapa solamente al abrir «Trayecto de tu reserva».
- Cada reserva nueva captura el trayecto y las indicaciones vigentes al reservar. Las reservas antiguas no reciben un historial inventado; conservan el comportamiento textual anterior.

## Configuración local y despliegue

1. La migración `supabase/migrations/20261021205431_publication_journeys.sql` ya está aplicada al proyecto Supabase de LaRutica. Para otros entornos, aplicar esa migración junto con el backend actualizado. Solo añade las columnas y triggers del nuevo flujo.
2. Para ejecutar este backend local, configurar en `.env.local`: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` (o el alias existente `SUPABASE_SERVICE_ROLE_KEY`) y `GEOAPIFY_API_KEY`. No incluir claves privadas en Git. La presencia de la clave de Supabase desactiva el proxy remoto mediante el comportamiento existente.
3. Reiniciar `npm.cmd run dev` después de modificar variables de servidor. El paso `predev` prepara automáticamente un `.dev.vars` ignorado por Git a partir de los archivos `.env`; es necesario porque Cloudflare ignora `.env.local` cuando ya existe `.dev.vars`. Editar las variables en `.env.local`, no en el archivo generado. Se recomienda Node 24, como indica el proyecto.
4. Si se usa el backend compartido de Sites, publicar también sus endpoints actualizados y configurar Geoapify allí. Un frontend nuevo con un backend antiguo no puede guardar trayectos: el formulario detecta la falta de compatibilidad antes de enviar y conserva sus datos.

No se ha publicado una nueva versión en Sites ni se han subido cambios a Git.

## Datos y límites

`publications.journey` guarda lugares, orden, modo, GeoJSON, metros, segundos y confirmación. `journey_required` distingue las publicaciones anteriores. La firma del cálculo comprueba que no se cambiaron sus coordenadas, trazado o estimaciones en el cliente; debe usarse la misma clave Geoapify en el servidor que calcula y guarda.

`reservations.journey_snapshot`, `meeting_point_snapshot` y `journey_snapshot_captured` preservan los datos al insertar, sin modificar el flujo de cobros o correos. Los triggers nuevos solo escriben esas columnas; no añaden permisos ni cambian las políticas existentes.

La búsqueda espera 400 ms antes de consultar y cancela respuestas anteriores; hay caché acotada de búsquedas y cálculos. Los mosaicos admiten caché HTTP. La cuota del proveedor incluye búsquedas, rutas y mapas; estas cachés no constituyen un límite global de gasto. Se mantiene atribución a Geoapify y OpenStreetMap. El tiempo de recorrido es estimado y no representa tráfico en vivo ni la duración completa de una actividad.

## Edición y recálculo

Para excursiones, «Empezar edición» está siempre habilitado, incluso sin salida ni llegada. El primer clic define la salida, el segundo la llegada y los siguientes permiten añadir paradas. «Terminar ruta» valida el cálculo y confirma el trayecto con el mismo botón; si falta información o hay una consulta pendiente, mantiene la edición y explica qué falta. Fuera de la edición del mapa, «Confirmar este trayecto» permite confirmar directamente la ruta seleccionada en los campos de salida, llegada y paradas. Ambos caminos esperan un cálculo válido y una nueva confirmación después de cualquier cambio. Al volver a empezar la edición se invalida la confirmación anterior. Transporte conserva su flujo de selección y confirmación separado.

La línea del mapa sigue la geometría vial o de senderos devuelta por Geoapify, con cada tramo entre salida, paradas y llegada. No se sustituye un error por una línea recta. El modo «solo ubicaciones» muestra marcadores sin estimar un recorrido.

«Editar trayecto en el mapa» activa clics para añadir paradas o mover los extremos. Un clic sobre un tramo inserta la parada en ese tramo; fuera del trazado se añade antes de la llegada. Los marcadores también se pueden arrastrar. Las coordenadas elegidas se conservan al consultar su dirección; si esa consulta falla, se mantienen las coordenadas y se avisa al usuario.

Cambiar puntos, orden o modo elimina trazado, estimaciones, firma y confirmación anteriores. El cálculo espera 450 ms y cancela las solicitudes obsoletas. La respuesta vigente conserva las indicaciones de encuentro y las etiquetas enriquecidas durante la espera. Se exige una nueva confirmación después de editar. Si se vinculó el encuentro a la salida, su marcador sigue a esa salida; las indicaciones que el publicador escribió se conservan.

Las sugerencias distinguen localidad, cantón y provincia. Se excluyen centroides de provincia, cantón y código postal: no representan un acceso concreto. Se validan coordenadas, un máximo de diez paradas y duplicados consecutivos. Se admiten circuitos A → parada → A. Un destino sin carretera o sendero conectado debe cambiarse por su acceso; la aplicación no inventa cobertura. Los mensajes distinguen falta de acceso, ruta inconexa, cuota, configuración y fallos temporales.

## Pruebas automatizadas

- `npm.cmd run test:maps`: lógica y handlers reales de búsqueda, cálculo, dirección, validación y firma. Aísla autenticación y respuestas externas en el proceso de pruebas; no modifica la aplicación ni Supabase.
- `npm.cmd exec -- playwright install chromium` (una vez) y `npm.cmd run test:maps:e2e`: Playwright en Chromium de escritorio y móvil, con componentes reales, trabajador de MapLibre y datos externos controlados. Comprueba selección por teclado, contexto territorial, paradas, orden, modo, circuitos, errores, cancelación, clics, arrastre, línea visible, confirmación y avance/guardado del formulario. El host de pruebas es independiente del servidor local y no contiene rutas de autenticación alternativas.
- `npm.cmd run test:maps:live`: ejecución voluntaria con la clave Geoapify de `.env.local`. Usa los handlers y proveedor reales para Heredia → Las Pailas, añadir/reordenar/quitar paradas, mover un extremo, confirmar y verificar la firma. Consume cuota; no crea publicaciones, cuentas ni reservas y no envía correos. La autenticación sigue aislada; esta prueba no verifica un inicio de sesión real.
- `npm.cmd run test:maps:runtime`: comprueba el dibujo y la selección de la línea en el servidor real de Vinext, en escritorio y móvil. Reutiliza el servidor local o levanta uno si no existe. Usa respuestas de API controladas; el componente, sus transformaciones y su worker se sirven desde la aplicación real. La cobertura real del proveedor se verifica por separado con `test:maps:live`.

El worker original de MapLibre se copia a `public/maplibre/` en `predev` y `prebuild`, conservando su licencia. Se sirve como archivo estático para evitar que Vinext/Vite inyecte código de recarga que necesita `window` dentro de un Web Worker. El archivo generado está ignorado por Git. Al actualizar MapLibre, actualizar también la versión de la URL de caché de `JourneyMap`.

El workflow `Validar trayectos` ejecuta las pruebas sin credenciales en pushes a main y pull requests. Las pruebas reales de Geoapify quedan fuera de CI. Las capturas/trazas solo se conservan si falla Playwright y están ignoradas por Git. La publicación real en Supabase y la reserva del viajero no se crean en esta batería centrada en definir y confirmar el trayecto.
