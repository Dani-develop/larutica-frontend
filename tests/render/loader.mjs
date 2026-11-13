// Node no reconoce los especificadores `cloudflare:*` que emite el build de
// vinext. Se resuelven al stub de pruebas para poder importar `dist/server`.
export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("cloudflare:")) {
    return {
      url: new URL("./cloudflare-stub.mjs", import.meta.url).href,
      shortCircuit: true,
    };
  }
  return nextResolve(specifier, context);
}
