// Load the Reflect polyfill before evaluating X.509/tsyringe. Static imports
// can be hoisted into different Nitro chunks and execute in the wrong order.
let runtime: Promise<typeof import('@simplewebauthn/server') & typeof import('@simplewebauthn/server/helpers')> | undefined;
export function loadWebAuthn() {
  return runtime ??= (async () => {
    await import('reflect-metadata');
    const [server, helpers] = await Promise.all([
      import('@simplewebauthn/server'), import('@simplewebauthn/server/helpers'),
    ]);
    return { ...server, ...helpers };
  })();
}
