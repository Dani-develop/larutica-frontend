// Load the Reflect polyfill before evaluating X.509/tsyringe. Static imports
// can be hoisted into different Nitro chunks and execute in the wrong order.
let runtime: Promise<typeof import('@simplewebauthn/server') & typeof import('@simplewebauthn/server/helpers')> | undefined;
export function loadWebAuthn() {
  return runtime ??= (async () => {
    // Explicitly consume the polyfill exports so Nitro cannot discard this
    // initialization as an unused side-effect-only CommonJS import.
    const metadata = await import('reflect-metadata/no-conflict');
    for (const key of ['decorate', 'metadata', 'defineMetadata', 'hasMetadata',
      'hasOwnMetadata', 'getMetadata', 'getOwnMetadata', 'getMetadataKeys',
      'getOwnMetadataKeys', 'deleteMetadata'] as const) {
      if (typeof Reflect[key] !== 'function') {
        Object.defineProperty(Reflect, key, { value: metadata[key], configurable: true, writable: true });
      }
    }
    const [server, helpers] = await Promise.all([
      import('@simplewebauthn/server'), import('@simplewebauthn/server/helpers'),
    ]);
    return { ...server, ...helpers };
  })();
}
