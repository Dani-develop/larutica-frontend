export function mapProviderFailure(status: number, detail: string, routing: boolean, mode = "drive") {
  if (status === 429 || /quota|credit|rate.?limit|too many requests/i.test(detail)) {
    return {status:429,message:"El servicio de mapas alcanzó su límite temporal. Conservamos tus ubicaciones; intenta más tarde."};
  }
  if (status === 401 || status === 403) {
    return {status:503,message:"El servicio de mapas no está disponible por su configuración. Conservamos tus ubicaciones."};
  }
  if (routing && /no suitable edges|correlat|no nearby|could not find.*point|no routable/i.test(detail)) {
    const access = mode === "drive" ? "una carretera" : "un camino o sendero disponible";
    return {status:422,message:`Alguno de los puntos no tiene acceso cercano a ${access}. Busca una entrada o dirección concreta, o mueve el marcador hasta ese acceso.`};
  }
  if (routing && (status === 400 || status === 404 || status === 422 || /no path|no route|unreachable|disconnected/i.test(detail))) {
    return {status:422,message:"No hay un recorrido conectado entre estos puntos para el tipo seleccionado. Revisa las ubicaciones, el acceso y el tipo de recorrido."};
  }
  return {status:502,message:"El servicio de mapas falló temporalmente. Conservamos tus ubicaciones; puedes reintentar el cálculo."};
}
