# Catálogo unificado y carga de servicios

La landing y Mi viaje consumen `/api/catalog` y usan las mismas tarjetas. Se eliminaron del listado las experiencias, cifras y destacados de ejemplo. El catálogo conserva los servicios aprobados sin futuras salidas, indicándolo claramente, y excluye fechas vencidas o canceladas.

El listado ya no consulta publicaciones completas de Guardados: consulta únicamente sus IDs, de forma independiente. Un error o retraso en Guardados no bloquea los servicios. Las consultas de agencia, idiomas y fechas en el endpoint de publicaciones se ejecutan en paralelo. El catálogo público se comparte diez segundos entre vistas y sobrevive a cambios de sesión; datos personales se descartan al cambiar de cuenta y las mutaciones invalidan todo.

Validación: TypeScript; 10 pruebas de caché; 43 pruebas aisladas con SQL, incluidas capacidad y concurrencia; 2 pruebas de navegador sobre la aplicación real. El navegador comprobó visitantes y viajeros, filtros, ausencia de tarjetas ficticias, una sola acción por tarjeta, navegación a detalle y una sola petición de catálogo al cambiar de la landing a Mi viaje. Se simuló Guardados lento (4 segundos): los servicios aparecieron antes de terminar esa consulta.

No se midió una reducción de latencia contra Supabase de producción. Las pruebas de navegador usan respuestas controladas y las pruebas de SQL una base aislada.

Navegación: Explorar lleva al inicio desde Mi perfil y las demás vistas de Mi viaje. Los enlaces anteriores `?viaje=explorar` redirigen al inicio. La prueba de navegador confirmó el regreso desde Mi perfil conservando el catálogo compartido.
