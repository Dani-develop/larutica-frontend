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
function decodeTransfer(headers, body) {
  if (/Content-Transfer-Encoding:\s*base64/i.test(headers)) return Buffer.from(body.replace(/\s/g, ''), 'base64').toString('utf8');
  if (/Content-Transfer-Encoding:\s*quoted-printable/i.test(headers)) return decodeQuotedPrintable(body);
  return body;
}
function collectText(headers, body, into) {
  const contentType = headers.match(/^Content-Type:\s*(.*)$/mi)?.[1] ?? '';
  const boundary = contentType.match(/boundary="?([^";\s]+)"?/i)?.[1];
  if (boundary && /multipart\//i.test(contentType)) {
    for (const chunk of body.split(`--${boundary}`)) {
      const normalized = chunk.replace(/^\r\n/, '');
      if (!normalized.trim() || normalized.startsWith('--')) continue;
      const split = normalized.indexOf('\r\n\r\n');
      if (split < 0) continue;
      collectText(normalized.slice(0, split), normalized.slice(split + 4).replace(/\r\n$/, ''), into);
    }
    return;
  }
  const decoded = decodeTransfer(headers, body);
  if (/text\/html/i.test(contentType)) into.html = decoded;
  else if (/text\/plain/i.test(contentType) || !into.text) into.text = decoded;
}
function messageBodies(raw) {
  const split = raw.indexOf('\r\n\r\n');
  const headers = raw.slice(0, Math.max(split, 0)).replace(/\r\n[ \t]+/g, ' ');
  const body = split >= 0 ? raw.slice(split + 4) : raw;
  const into = { text: '', html: '' };
  const contentType = headers.match(/^Content-Type:\s*(.*)$/mi)?.[1] ?? '';
  if (/multipart\//i.test(contentType)) collectText(headers, body, into);
  else into.text = decodeTransfer(headers, body);
  return { headers, ...into };
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
        const { headers, text } = messageBodies(raw);
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
