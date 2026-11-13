// Material TLS efímero para pruebas locales (H-04).
// La clave privada se genera en memoria en cada ejecución y nunca se escribe en
// el repositorio ni en disco: no existe una clave versionada que pueda filtrarse
// o reutilizarse. El certificado es autofirmado para CN=localhost / 127.0.0.1.
import 'reflect-metadata';
import { createPrivateKey, webcrypto } from 'node:crypto';
import * as x509 from '@peculiar/x509';

x509.cryptoProvider.set(webcrypto);

const algorithm = { name: 'ECDSA', namedCurve: 'P-256', hash: 'SHA-256' };
let pending;

async function generate() {
  const keys = await webcrypto.subtle.generateKey(algorithm, true, ['sign', 'verify']);
  const notBefore = new Date(Date.now() - 60_000);
  const certificate = await x509.X509CertificateGenerator.createSelfSigned({
    serialNumber: Buffer.from(webcrypto.getRandomValues(new Uint8Array(16))).toString('hex').replace(/^[89a-f]/, '1'),
    name: 'CN=localhost',
    notBefore,
    notAfter: new Date(notBefore.getTime() + 24 * 60 * 60 * 1000),
    keys,
    signingAlgorithm: algorithm,
    extensions: [
      new x509.BasicConstraintsExtension(true, undefined, true),
      new x509.KeyUsagesExtension(x509.KeyUsageFlags.digitalSignature | x509.KeyUsageFlags.keyCertSign, true),
      new x509.ExtendedKeyUsageExtension([x509.ExtendedKeyUsage.serverAuth], false),
      new x509.SubjectAlternativeNameExtension([{ type: 'dns', value: 'localhost' }, { type: 'ip', value: '127.0.0.1' }]),
    ],
  });
  const pkcs8 = Buffer.from(await webcrypto.subtle.exportKey('pkcs8', keys.privateKey));
  const key = createPrivateKey({ key: pkcs8, format: 'der', type: 'pkcs8' }).export({ type: 'pkcs8', format: 'pem' });
  return { key: Buffer.from(key), cert: Buffer.from(certificate.toString('pem')) };
}

/** Devuelve { key, cert } (Buffers PEM) generados una vez por proceso de prueba. */
export function localhostTls() {
  pending ??= generate();
  return pending;
}
