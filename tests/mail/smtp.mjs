import { SMTPServer } from 'smtp-server';

function decodeWord(value) {
  return value.replace(/=\?utf-8\?([bq])\?([^?]*)\?=/gi, (_, encoding, content) =>
    encoding.toLowerCase() === 'b' ? Buffer.from(content, 'base64').toString('utf8')
      : decodeQuotedPrintable(content.replace(/_/g, ' ')));
}
function decodeQuotedPrintable(value) {
  const unwrapped = value.replace(/=\r?\n/g, '');
  const bytes = [];
  for (let i = 0; i < unwrapped.length; i++) {
    if (unwrapped[i] === '=' && /^[a-f\d]{2}$/i.test(unwrapped.slice(i + 1, i + 3))) {
      bytes.push(parseInt(unwrapped.slice(i + 1, i + 3), 16)); i += 2;
    } else bytes.push(...Buffer.from(unwrapped[i]));
  }
  return Buffer.from(bytes).toString('utf8');
}
export async function createSmtp(options = {}) {
  const received = [], attempts = [];
  const state = { rejectRecipients: new Set(), failAuth: false, failData: false };
  const server = new SMTPServer({
    name: 'localhost', banner: 'LaRutica isolated mail tests', logger: false, disableReverseLookup: true,
    disabledCommands: ['STARTTLS'], allowInsecureAuth: true,
    onAuth(auth, session, done) {
      if (state.failAuth || auth.username !== 'test-user' || auth.password !== 'test-password') {
        return done(Object.assign(new Error('Authentication rejected'), { responseCode: 535 }));
      }
      done(null, { user: auth.username });
    },
    onRcptTo(address, session, done) {
      attempts.push(address.address);
      done(state.rejectRecipients.has(address.address)
        ? Object.assign(new Error('Recipient rejected'), { responseCode: 550 }) : null);
    },
    onData(stream, session, done) {
      const chunks = [];
      stream.on('data', chunk => chunks.push(chunk));
      stream.on('end', () => {
        if (state.failData) return done(Object.assign(new Error('Temporary SMTP failure'), { responseCode: 451 }));
        const raw = Buffer.concat(chunks).toString('utf8');
        const split = raw.indexOf('\r\n\r\n');
        const headers = raw.slice(0, split).replace(/\r\n[ \t]+/g, ' ');
        let text = raw.slice(split + 4);
        if (/Content-Transfer-Encoding: base64/i.test(headers)) text = Buffer.from(text, 'base64').toString('utf8');
        else if (/Content-Transfer-Encoding: quoted-printable/i.test(headers)) text = decodeQuotedPrintable(text);
        received.push({ to: session.envelope.rcptTo.map(x => x.address),
          from: session.envelope.mailFrom.address,
          subject: decodeWord(headers.match(/^Subject: (.*)$/mi)?.[1] ?? ''), text, raw });
        done(null, 'message captured');
      });
    },
    ...options,
  });
  server.on('error', () => {}); // Expected protocol failures are asserted by the caller.
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  return {
    server, state, received, attempts,
    env: {
      SMTP_HOST: '127.0.0.1', SMTP_PORT: String(server.server.address().port),
      SMTP_SECURE: 'false', SMTP_REQUIRE_TLS: 'false', SMTP_USER: 'test-user', SMTP_PASS: 'test-password',
      MAIL_FROM: 'LaRutica <test@example.invalid>', SMTP_CONNECTION_TIMEOUT: '1500',
      SMTP_GREETING_TIMEOUT: '1500', SMTP_SOCKET_TIMEOUT: '1500',
    },
    clear() { received.length = 0; attempts.length = 0; state.rejectRecipients.clear(); state.failAuth = false; state.failData = false; },
    close: () => new Promise(resolve => server.close(resolve)),
  };
}
