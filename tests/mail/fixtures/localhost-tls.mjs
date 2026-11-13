import selfsigned from "selfsigned";

// Identidad TLS efímera para las pruebas de correo. Se genera en tiempo de
// ejecución y nunca se versiona: así el repositorio no contiene material
// criptográfico (aunque sea de pruebas) que los escáneres deban clasificar.
let cached;

/** @returns {Promise<{key: Buffer, cert: Buffer}>} */
export async function localhostTlsFixture() {
  if (cached) return cached;
  const { private: key, cert } = await selfsigned.generate(
    [{ name: "commonName", value: "localhost" }],
    {
      days: 3650,
      keySize: 2048,
      extensions: [
        {
          name: "subjectAltName",
          altNames: [
            { type: 2, value: "localhost" },
            { type: 7, ip: "127.0.0.1" },
          ],
        },
      ],
    },
  );
  cached = { key: Buffer.from(key), cert: Buffer.from(cert) };
  return cached;
}
